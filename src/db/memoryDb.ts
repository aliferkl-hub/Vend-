// Persistent PostgreSQL database engine for VEND+ using pg-mem and atomic disk serialization
// Guarantees durability across server restarts, container lifecycles, and rebuilds
import { newDb, IMemoryDb, DataType } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { writeJsonAtomic } from './atomicStorage.ts';

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
  'password_resets',
  'auth_events',
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
  'seller_payout_accounts',
  'payout_requests',
  'financial_ledger',
  'seller_balances',
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
    this.memDb.public.registerFunction({
      name: 'trim',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (x: string) => (typeof x === 'string' ? x.trim() : x),
    });
    this.memDb.public.registerFunction({
      name: 'lower',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (x: string) => (typeof x === 'string' ? x.toLowerCase() : x),
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

    // 1b. Ensure additional VEND_AUTH_MEMORY schema extensions exist
    const authSchemaStatements = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS normalized_email text;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp;',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata text;',
      'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_id text;',
      'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at timestamp;',
      'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at timestamp;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status text DEFAULT \'PENDING\';',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_released_at timestamp;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_requested_at timestamp;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_completed_at timestamp;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_id text;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by_user_id integer;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT \'PENDING\';',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamp;',
      'ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variations text;',
      'ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_status text DEFAULT \'PENDING\';',
      'ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_released_at timestamp;',
      'ALTER TABLE commissions ADD COLUMN IF NOT EXISTS mp_payment_id text;',
      'ALTER TABLE commissions ADD COLUMN IF NOT EXISTS paid_at timestamp;',
      'ALTER TABLE commissions ADD COLUMN IF NOT EXISTS delivered_at timestamp;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id integer;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS status_detail text;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text DEFAULT \'BRL\';',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_code text;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_code_base64 text;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS ticket_url text;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key text;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS date_approved timestamp;',
      'ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();',
      `CREATE TABLE IF NOT EXISTS seller_payout_accounts (
        id serial PRIMARY KEY NOT NULL,
        seller_id integer NOT NULL,
        account_type text DEFAULT 'PIX' NOT NULL,
        pix_key_type text,
        pix_key text,
        bank_code text,
        bank_name text,
        agency text,
        account_number text,
        account_type_detail text,
        holder_name text NOT NULL,
        holder_document text NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        is_verified boolean DEFAULT true NOT NULL,
        verified_at timestamp DEFAULT now(),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS payout_requests (
        id serial PRIMARY KEY NOT NULL,
        request_number text NOT NULL UNIQUE,
        seller_id integer NOT NULL,
        payout_account_id integer,
        amount_cents integer NOT NULL,
        fee_cents integer DEFAULT 0 NOT NULL,
        net_amount_cents integer NOT NULL,
        status text DEFAULT 'REQUESTED' NOT NULL,
        receipt_snapshot text,
        order_ids text,
        processed_by_user_id integer,
        payment_proof_url text,
        notes text,
        requested_at timestamp DEFAULT now() NOT NULL,
        processed_at timestamp,
        paid_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS financial_ledger (
        id serial PRIMARY KEY NOT NULL,
        transaction_number text NOT NULL UNIQUE,
        order_id integer NOT NULL,
        order_number text NOT NULL,
        payment_id integer,
        buyer_id integer NOT NULL,
        seller_id integer NOT NULL,
        entry_type text DEFAULT 'SALE' NOT NULL,
        gross_amount_cents integer NOT NULL,
        platform_fee_cents integer NOT NULL,
        seller_amount_cents integer NOT NULL,
        payment_status text DEFAULT 'PENDING' NOT NULL,
        order_status text DEFAULT 'AWAITING_PAYMENT' NOT NULL,
        payout_status text DEFAULT 'PENDING_DELIVERY_CONFIRMATION' NOT NULL,
        status text DEFAULT 'COMPLETED' NOT NULL,
        reference_id text,
        metadata text,
        approved_at timestamp,
        delivery_confirmed_at timestamp,
        payout_requested_at timestamp,
        payout_completed_at timestamp,
        payout_request_id integer,
        mp_payment_id text,
        cancellation_reason text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );`,
      'ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS entry_type text DEFAULT \'SALE\' NOT NULL;',
      'ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS status text DEFAULT \'COMPLETED\' NOT NULL;',
      'ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS reference_id text;',
      'ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS metadata text;',
      `CREATE TABLE IF NOT EXISTS seller_balances (
        id serial PRIMARY KEY NOT NULL,
        seller_id integer NOT NULL UNIQUE,
        pending_balance_cents integer DEFAULT 0 NOT NULL,
        available_balance_cents integer DEFAULT 0 NOT NULL,
        paid_balance_cents integer DEFAULT 0 NOT NULL,
        platform_revenue_cents integer DEFAULT 0 NOT NULL,
        total_gross_sales_cents integer DEFAULT 0 NOT NULL,
        last_synced_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id serial PRIMARY KEY NOT NULL,
        user_id integer NOT NULL,
        token text NOT NULL,
        token_hash text NOT NULL,
        expires_at timestamp NOT NULL,
        used_at timestamp,
        ip_address text,
        created_at timestamp DEFAULT now() NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS auth_events (
        id serial PRIMARY KEY NOT NULL,
        user_id integer,
        event_type text NOT NULL,
        email text,
        ip_address text,
        user_agent text,
        metadata text,
        created_at timestamp DEFAULT now() NOT NULL
      );`,
    ];

    for (const stmt of authSchemaStatements) {
      try {
        this.memDb.public.none(stmt);
      } catch (e: any) {
        // Safe to ignore if column or table already exists
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

      // Atomically write database to disk with fsync and safety locking
      writeJsonAtomic(DB_FILE, dump);
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
