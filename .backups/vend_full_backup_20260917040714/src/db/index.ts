import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { MemoryPool } from './memoryDb.ts';
import { detectStorageStatus, printStorageBanner, setPostgresReachable } from './storageDetector.ts';
import { ensurePostgresSchema, migrateDiskToPostgres } from './postgresSync.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: any | undefined;
}

const hasValidDbEnv = Boolean(
  process.env.DATABASE_URL ||
  (process.env.SQL_HOST && process.env.SQL_HOST !== 'localhost')
);

class SmartPool {
  private pgPool: Pool | null = null;
  private memoryPool: MemoryPool | null = null;
  private isUsingMemory = false;
  private postgresInitialized = false;

  constructor() {
    printStorageBanner();
    if (!hasValidDbEnv) {
      this.isUsingMemory = true;
      this.memoryPool = new MemoryPool();
      setPostgresReachable(false);
    } else {
      console.log('[Database] Conectando ao PostgreSQL configurado...');
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 5000,
      });

      this.pgPool.on('error', (err: any) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });

      // Asynchronously bootstrap PostgreSQL schema and safely migrate existing local disk data
      this.initPostgres().catch((err) => {
        console.warn('[Database] Erro na inicialização do PostgreSQL:', err.message);
      });
    }
  }

  private async initPostgres() {
    if (this.postgresInitialized || !this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      client.release();
      setPostgresReachable(true);
      this.postgresInitialized = true;
      console.log('[Database] Conexão com PostgreSQL bem-sucedida! Verificando esquemas e migrações...');
      await ensurePostgresSchema(this.pgPool);
      await migrateDiskToPostgres(this.pgPool);
    } catch (err: any) {
      setPostgresReachable(false);
      console.warn(`[Database] PostgreSQL inacessível (${err.message}). Utilizando persistência em disco local.`);
      this.isUsingMemory = true;
      if (!this.memoryPool) this.memoryPool = new MemoryPool();
    }
  }

  private async getActivePool() {
    if (this.isUsingMemory) {
      if (!this.memoryPool) this.memoryPool = new MemoryPool();
      return this.memoryPool;
    }
    return this.pgPool!;
  }

  async query(queryObj: any, params?: any[]) {
    try {
      const active = await this.getActivePool();
      return await active.query(queryObj, params);
    } catch (err: any) {
      if (!this.isUsingMemory && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect'))) {
        setPostgresReachable(false);
        console.warn(`[Database] PostgreSQL unreachable (${err.code || err.message}), switching to local storage fallback.`);
        this.isUsingMemory = true;
        this.memoryPool = new MemoryPool();
        return await this.memoryPool.query(queryObj, params);
      }
      throw err;
    }
  }

  async connect() {
    try {
      const active = await this.getActivePool();
      return await active.connect();
    } catch (err: any) {
      if (!this.isUsingMemory && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect'))) {
        setPostgresReachable(false);
        console.warn(`[Database] PostgreSQL unreachable (${err.code || err.message}), switching to local storage fallback.`);
        this.isUsingMemory = true;
        this.memoryPool = new MemoryPool();
        return await this.memoryPool.connect();
      }
      throw err;
    }
  }

  saveToDiskSync() {
    if (this.memoryPool) {
      this.memoryPool.saveToDiskSync();
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (this.pgPool) {
      this.pgPool.on(event as any, handler);
    }
    return this;
  }
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new SmartPool();
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Helper to manually flush database to disk
export const persistDatabase = () => {
  if (global._postgresPool) {
    global._postgresPool.saveToDiskSync();
  }
};

export { detectStorageStatus };

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
