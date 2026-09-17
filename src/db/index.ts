import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { detectStorageStatus, printStorageBanner, setPostgresReachable } from './storageDetector.ts';
import { migrateDiskToPostgres } from './postgresSync.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    printStorageBanner();
    console.log('[Database] Inicializando pool de conexão PostgreSQL (Cloud SQL)...');

    global._postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err: any) => {
      console.error('Unexpected error on idle SQL pool client:', err?.message || err);
    });

    // Verify connection and safely migrate any local data to Cloud SQL
    (async () => {
      try {
        const client = await global._postgresPool!.connect();
        client.release();
        setPostgresReachable(true);
        console.log('[Database] Conexão com PostgreSQL (Cloud SQL) verificada e ativa com sucesso!');
        await migrateDiskToPostgres(global._postgresPool!);
      } catch (err: any) {
        console.warn('[Database] Conexão inicial com PostgreSQL:', err?.message || err);
      }
    })();
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Helper to flush database - in PostgreSQL, commits are durable automatically
export const persistDatabase = () => {
  // PostgreSQL transactions are automatically durable on Cloud SQL.
};

export { detectStorageStatus };

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

