import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { detectStorageStatus, printStorageBanner, setPostgresReachable } from './storageDetector.ts';
import { MemoryPool } from './memoryDb.ts';
import { migrateDiskToPostgres } from './postgresSync.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: any | undefined;
}

export const createPool = (): any => {
  if (!global._postgresPool) {
    printStorageBanner();

    const isPostgresConfigured = Boolean(
      process.env.DATABASE_URL ||
      (process.env.SQL_HOST && process.env.SQL_HOST !== 'localhost' && process.env.SQL_USER)
    );

    if (isPostgresConfigured) {
      console.log('[Database] Inicializando pool de conexão PostgreSQL (Cloud SQL)...');

      const pgPool = new Pool({
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
      pgPool.on('error', (err: any) => {
        console.error('Unexpected error on idle SQL pool client:', err?.message || err);
      });

      // Verify connection and safely migrate any local data to Cloud SQL
      (async () => {
        try {
          const client = await pgPool.connect();
          client.release();
          setPostgresReachable(true);
          console.log('[Database] Conexão com PostgreSQL (Cloud SQL) verificada e ativa com sucesso!');
          await migrateDiskToPostgres(pgPool);
        } catch (err: any) {
          console.warn('[Database] Conexão inicial com PostgreSQL:', err?.message || err);
          setPostgresReachable(false);
        }
      })();

      global._postgresPool = pgPool;
    } else {
      console.log('[Database] PostgreSQL externo não configurado no ambiente. Inicializando motor de persistência local atômica em disco (MemoryPool / data/vend_database.json)...');
      setPostgresReachable(false);
      global._postgresPool = new MemoryPool();
      console.log('[Database] Motor de banco de dados ativo com sucesso.');
    }
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Helper to flush database - in PostgreSQL, commits are durable automatically, in MemoryPool saves to disk
export const persistDatabase = () => {
  if (global._postgresPool && typeof (global._postgresPool as any).saveToDiskSync === 'function') {
    (global._postgresPool as any).saveToDiskSync();
  }
};

export { detectStorageStatus };

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

