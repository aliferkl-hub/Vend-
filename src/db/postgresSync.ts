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
  const ddlPath = path.join(process.cwd(), 'drizzle-migrations/0000_watery_shiver_man.sql');
  if (!fs.existsSync(ddlPath)) return;

  try {
    const rawSql = fs.readFileSync(ddlPath, 'utf8');
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        // Safe creation: convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
        let safeStmt = stmt;
        if (stmt.startsWith('CREATE TABLE "')) {
          safeStmt = stmt.replace('CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "');
        }
        await pool.query(safeStmt);
      } catch (err: any) {
        // Ignore "already exists" or duplicate object errors
        if (
          err.code === '42P07' || // relation already exists
          err.code === '42710' || // duplicate object
          err.message?.includes('already exists')
        ) {
          continue;
        }
        console.warn('[PostgresSync] Aviso na instrução DDL:', err.message);
      }
    }
    console.log('[PostgresSync] Estrutura DDL no PostgreSQL verificada com sucesso.');
  } catch (err: any) {
    console.error('[PostgresSync] Erro ao aplicar DDL no PostgreSQL:', err.message);
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

    for (const table of TABLES_ORDER) {
      const rows = dump[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

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

          // Build INSERT statement
          const columns = Object.keys(row).map((c) => `"${c}"`);
          const placeholders = Object.keys(row).map((_, idx) => `$${idx + 1}`);
          const values = Object.values(row).map((val) => {
            if (val && typeof val === 'object' && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val;
          });

          const insertSql = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`;
          await pool.query(insertSql, values);
          totalMigrated++;
        } catch (insertErr: any) {
          // Ignore individual constraint collisions during sync
        }
      }

      // Reset auto-increment sequence if table has serial 'id'
      try {
        await pool.query(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) 
          FROM "${table}"
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
