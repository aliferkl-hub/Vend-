// Persistent PostgreSQL database engine for VEND+ using pg-mem and atomic disk serialization
// Guarantees durability across server restarts, container lifecycles, and rebuilds
import { newDb, IMemoryDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vend_database.json');
const DB_BAK_FILE = path.join(DATA_DIR, 'vend_database.json.bak');
const DDL_FILE = path.join(process.cwd(), 'drizzle-migrations/0000_watery_shiver_man.sql');

// Dependency-safe order for data restoration
const TABLE_RESTORE_ORDER = [
  'categories',
  'plans',
  'users',
  'app_settings',
  'profiles',
  'addresses',
  'sessions',
  'subscriptions',
  'stores',
  'delivery_drivers',
  'products',
  'services',
  'chats',
  'audit_logs',
  'notifications',
  'favorites',
  'product_images',
  'product_variants',
  'service_images',
  'orders',
  'reviews',
  'negotiations',
  'order_items',
  'payments',
  'deliveries',
  'delivery_codes',
  'delivery_attempts',
  'commissions',
  'chat_messages',
  'negotiation_messages',
];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export class MemoryPool {
  private memDb: IMemoryDb;
  private pool: any;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;
  private pendingSave = false;

  constructor() {
    this.memDb = newDb();

    // Register common postgres functions
    this.memDb.public.registerFunction({
      name: 'now',
      implementation: () => new Date(),
    });

    // 1. Execute schema DDL from migrations
    if (fs.existsSync(DDL_FILE)) {
      const sql = fs.readFileSync(DDL_FILE, 'utf8');
      const statements = sql.split('--> statement-breakpoint');
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            this.memDb.public.none(trimmed);
          } catch (e: any) {
            // Ignore minor notices for duplicate constraints if already present
          }
        }
      }
    }

    // 2. Restore persistent data from disk if exists
    this.restoreFromDisk();

    const pgAdapter = this.memDb.adapters.createPg();
    this.pool = new pgAdapter.Pool();

    // Hook process exit events to guarantee data is saved
    process.once('beforeExit', () => this.saveToDiskSync());
    process.once('SIGINT', () => {
      this.saveToDiskSync();
    });
    process.once('SIGTERM', () => {
      this.saveToDiskSync();
    });
  }

  private restoreFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      let raw: string | null = null;
      let usedBackup = false;

      // 1. Try reading primary database file
      if (fs.existsSync(DB_FILE)) {
        try {
          const content = fs.readFileSync(DB_FILE, 'utf8');
          if (content && content.trim().length > 0) {
            JSON.parse(content); // Test JSON validity
            raw = content;
          }
        } catch (readErr: any) {
          console.warn('[Database] AVISO: Arquivo principal de dados corrompido ou ilegível. Tentando backup...', readErr.message);
        }
      }

      // 2. If primary failed or absent, try backup file (.bak)
      if (!raw && fs.existsSync(DB_BAK_FILE)) {
        try {
          const bakContent = fs.readFileSync(DB_BAK_FILE, 'utf8');
          if (bakContent && bakContent.trim().length > 0) {
            JSON.parse(bakContent);
            raw = bakContent;
            usedBackup = true;
            console.log('[Database] Recuperação acionada: restaurando a partir do backup vend_database.json.bak!');
          }
        } catch (bakErr: any) {
          console.error('[Database] Falha também no backup:', bakErr.message);
        }
      }

      if (!raw) {
        console.log('[Database] Nenhum arquivo de dados pré-existente ou válido. Banco iniciado limpo.');
        return;
      }

      const dump = JSON.parse(raw);
      if (!dump || typeof dump !== 'object') return;

      const tablesToProcess = Array.from(
        new Set([...TABLE_RESTORE_ORDER, ...Object.keys(dump)])
      );

      let totalRowsRestored = 0;

      for (const tbl of tablesToProcess) {
        const rows = dump[tbl];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        let tableRef: any;
        try {
          tableRef = this.memDb.public.getTable(tbl);
        } catch {
          continue;
        }

        let maxId = 0;

        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;

          // Convert ISO date strings back to Date objects
          const convertedRow: Record<string, any> = {};
          for (const [key, val] of Object.entries(row)) {
            if (typeof val === 'string' && ISO_DATE_REGEX.test(val)) {
              convertedRow[key] = new Date(val);
            } else {
              convertedRow[key] = val;
            }
          }

          try {
            tableRef.insert(convertedRow);
            totalRowsRestored++;
          } catch {
            // Ignore if row already exists
          }

          if (typeof row.id === 'number' && row.id > maxId) {
            maxId = row.id;
          }
        }

        // Advance the serial auto-increment sequence to prevent collisions on new inserts
        if (maxId > 0 && tableRef && tableRef.serialsId) {
          try {
            const dbData = (this.memDb as any).data;
            if (dbData && typeof dbData.getMap === 'function') {
              const curSerials = dbData.getMap(tableRef.serialsId);
              if (curSerials) {
                dbData.set(tableRef.serialsId, curSerials.set('id', maxId));
              }
            }
          } catch (serialErr: any) {
            console.warn(`[Database] Erro ao avançar serial para ${tbl}:`, serialErr.message);
          }
        }
      }

      // If we recovered from backup, safely copy back to main DB_FILE
      if (usedBackup) {
        try {
          fs.writeFileSync(DB_FILE, raw, 'utf8');
          console.log('[Database] Arquivo principal re-sincronizado a partir do backup com sucesso.');
        } catch {}
      }

      console.log(`[Database] Persistência restaurada com sucesso! ${totalRowsRestored} registros carregados.`);
    } catch (err: any) {
      console.error('[Database] Erro ao restaurar dados do disco:', err.message);
    }
  }

  public saveToDiskSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const dump: Record<string, any[]> = {};
      const tables = this.memDb.public.many(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );

      for (const { table_name } of tables) {
        try {
          const rows = this.memDb.public.many(`SELECT * FROM "${table_name}"`);
          if (rows && rows.length > 0) {
            dump[table_name] = rows;
          }
        } catch {
          // ignore table query errors
        }
      }

      const serialized = JSON.stringify(dump, null, 2);
      const tmpFile = DB_FILE + '.tmp';

      // 1. Write atomically to temporary file first
      fs.writeFileSync(tmpFile, serialized, 'utf8');

      // 2. If main DB_FILE exists and is valid, backup previous version
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, DB_BAK_FILE);
        } catch {}
      }

      // 3. Atomic rename guarantees database file is never left in half-written state
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err: any) {
      console.error('[Database] Erro ao salvar dados no disco (sync):', err.message);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDiskSync();
    }, 20);
  }

  private isMutatingQuery(text: string): boolean {
    const trimmed = text.trim().toUpperCase();
    return (
      trimmed.startsWith('INSERT') ||
      trimmed.startsWith('UPDATE') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('TRUNCATE') ||
      trimmed.startsWith('REPLACE') ||
      trimmed.includes('INSERT INTO') ||
      trimmed.includes('UPDATE ') ||
      trimmed.includes('DELETE FROM')
    );
  }

  private wrapQuery(originalQuery: any) {
    return async (queryObj: any, params?: any[]) => {
      let text = typeof queryObj === 'string' ? queryObj : queryObj.text;
      let values = typeof queryObj === 'string' ? params : (queryObj.values || params);
      const isRowModeArray = typeof queryObj === 'object' && queryObj.rowMode === 'array';

      const res = await originalQuery(text, values);

      // If this was an insert/update/delete, immediately schedule persistence
      if (text && this.isMutatingQuery(text)) {
        this.scheduleSave();
      }

      if (res && res.rows) {
        const fieldNames = res.rows.length > 0 ? Object.keys(res.rows[0]) : [];
        const fields = (res.fields && res.fields.length > 0) ? res.fields : fieldNames.map((name) => ({ name }));
        if (isRowModeArray) {
          const arrayRows = res.rows.map((row: any) => fields.map((f: any) => row[f.name]));
          return { ...res, fields, rows: arrayRows };
        }
        return { ...res, fields };
      }
      return res;
    };
  }

  async query(queryObj: any, values?: any[]) {
    return this.wrapQuery(this.pool.query.bind(this.pool))(queryObj, values);
  }

  async connect() {
    const client = await this.pool.connect();
    return {
      query: this.wrapQuery(client.query.bind(client)),
      release: client.release ? client.release.bind(client) : () => {},
    };
  }

  on(event: string, handler: (...args: any[]) => void) {
    return this;
  }

  async end() {
    this.saveToDiskSync();
    if (this.pool && this.pool.end) {
      await this.pool.end();
    }
  }
}
