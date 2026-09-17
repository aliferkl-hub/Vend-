import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const TABLES_ORDER = [
  'plans',
  'categories',
  'users',
  'profiles',
  'stores',
  'products',
  'product_images',
  'services',
  'orders',
  'order_items',
  'payments',
  'commissions',
  'addresses',
  'sessions',
  'reviews',
  'notifications',
  'delivery_drivers',
  'deliveries',
  'delivery_attempts',
  'delivery_codes',
  'favorites',
  'subscriptions',
  'app_settings',
  'audit_logs',
];

export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  // Schema DDL is managed by Drizzle Kit and UpdateSchema.
  // We only run light verification here without throwing permission errors.
  try {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log(`[PostgresSync] Tabelas ativas no PostgreSQL: ${res.rowCount} tabelas.`);
  } catch (err: any) {
    console.warn('[PostgresSync] Verificação de tabelas:', err.message);
  }
}

export async function migrateDiskToPostgres(pool: Pool): Promise<{ migratedCount: number }> {
  const dataDir = path.join(process.cwd(), 'data');
  const dbFile = path.join(dataDir, 'vend_database.json');

  if (!fs.existsSync(dbFile)) {
    return { migratedCount: 0 };
  }

  let totalMigrated = 0;

  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const dump = JSON.parse(raw);
    if (!dump || typeof dump !== 'object') return { migratedCount: 0 };

    // Cache table columns from PostgreSQL information_schema
    const colRes = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );
    const tableColumnsMap = new Map<string, Set<string>>();
    for (const row of colRes.rows) {
      if (!tableColumnsMap.has(row.table_name)) {
        tableColumnsMap.set(row.table_name, new Set());
      }
      tableColumnsMap.get(row.table_name)!.add(row.column_name);
    }

    for (const table of TABLES_ORDER) {
      const rows = dump[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const validCols = tableColumnsMap.get(table);
      if (!validCols) continue;

      for (const row of rows) {
        try {
          // Check if record exists by id (or email for users)
          let exists = false;
          if (row.id !== undefined) {
            const checkRes = await pool.query(`SELECT id FROM "${table}" WHERE id = $1 LIMIT 1`, [row.id]);
            if (checkRes.rowCount && checkRes.rowCount > 0) {
              exists = true;
            }
          }

          if (!exists && table === 'users' && row.email) {
            const checkEmail = await pool.query(`SELECT id FROM "users" WHERE email = $1 LIMIT 1`, [row.email.trim().toLowerCase()]);
            if (checkEmail.rowCount && checkEmail.rowCount > 0) {
              exists = true;
            }
          }

          if (exists) {
            continue;
          }

          // Filter only valid columns that exist in the PostgreSQL table
          const sanitizedRow: Record<string, any> = {};
          for (const [key, val] of Object.entries(row)) {
            // Check direct snake_case match
            if (validCols.has(key)) {
              sanitizedRow[key] = val;
              continue;
            }
            // Check camelCase to snake_case conversion
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (validCols.has(snakeKey) && sanitizedRow[snakeKey] === undefined) {
              sanitizedRow[snakeKey] = val;
            }
          }

          // Special handling for users: ensure normalized_email and password_hash
          if (table === 'users') {
            if (!sanitizedRow.normalized_email && sanitizedRow.email) {
              sanitizedRow.normalized_email = String(sanitizedRow.email).trim().toLowerCase();
            }
            if (!sanitizedRow.password_hash && row.passwordHash) {
              sanitizedRow.password_hash = row.passwordHash;
            }
            if (!sanitizedRow.uid) {
              sanitizedRow.uid = 'vend_' + (row.id || Math.random().toString(36).substring(2));
            }
          }

          const colNames = Object.keys(sanitizedRow);
          if (colNames.length === 0) continue;

          const columns = colNames.map((c) => `"${c}"`);
          const placeholders = colNames.map((_, idx) => `$${idx + 1}`);
          const values = Object.values(sanitizedRow).map((val) => {
            if (val && typeof val === 'object' && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val;
          });

          const insertSql = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`;
          await pool.query(insertSql, values);
          totalMigrated++;
        } catch (insertErr: any) {
          console.warn(`[PostgresSync] Erro ao inserir linha em ${table}:`, insertErr.message);
        }
      }

      // Reset auto-increment sequence if table has serial 'id'
      try {
        await pool.query(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))
        `);
      } catch {
        // Table may not have serial id, ignore
      }
    }

    if (totalMigrated > 0) {
      console.log(`[PostgresSync] Migração de disco para PostgreSQL concluída: ${totalMigrated} registros sincronizados.`);
    }
  } catch (err: any) {
    console.error('[PostgresSync] Erro na migração para PostgreSQL:', err.message);
  }

  return { migratedCount: totalMigrated };
}
