import { pool } from '../db/index.ts';

export async function ensureMarketingTables(): Promise<void> {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('marketing_campaigns', 'marketing_events', 'referrals');
    `);
    const found = res.rows.map((r: any) => r.table_name);
    console.log(`[Marketing] Tabelas ativas no PostgreSQL: ${found.join(', ')}`);
  } catch (err: any) {
    console.warn('[Marketing] Nota de inicialização de marketing:', err.message);
  }
}
