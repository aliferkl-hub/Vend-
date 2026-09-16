import fs from 'fs';
import path from 'path';
import { normalizeEmail } from '../utils/normalizeEmail.ts';
import { createTimestampedBackup, writeJsonAtomic } from '../db/atomicStorage.ts';

const DB_FILE = path.join(process.cwd(), 'data', 'vend_database.json');

export interface MigrationReport {
  totalRead: number;
  totalNormalized: number;
  duplicatesResolved: number;
  masterOwnerPreserved: boolean;
  backupCreated: string | null;
}

/**
 * Executes startup account recovery and migration:
 * 1. Creates timestamped safety backup: vend_database.backup-YYYYMMDD-HHMMSS.json
 * 2. Reads existing users
 * 3. Normalizes all emails to lowercase and trimmed string
 * 4. Deduplicates accounts preserving MASTER_OWNER and earliest valid account
 * 5. Re-links any associated orders/stores/products so zero user data or history is lost
 * 6. Atomically writes back clean persistent state
 */
export function runAccountMigrationSync(): MigrationReport {
  console.log('================================================================================');
  console.log('[MIGRAÇÃO DE CONTAS] Iniciando verificação e normalização persistente...');
  console.log('================================================================================');

  const report: MigrationReport = {
    totalRead: 0,
    totalNormalized: 0,
    duplicatesResolved: 0,
    masterOwnerPreserved: false,
    backupCreated: null,
  };

  if (!fs.existsSync(DB_FILE)) {
    console.log('[MIGRAÇÃO DE CONTAS] Nenhum arquivo JSON existente no momento.');
    return report;
  }

  try {
    // Step 1: Create immutable safety backup before any transformation
    report.backupCreated = createTimestampedBackup(DB_FILE);

    const rawContent = fs.readFileSync(DB_FILE, 'utf8');
    if (!rawContent || !rawContent.trim()) {
      return report;
    }

    const data = JSON.parse(rawContent);
    const existingUsers = Array.isArray(data.users) ? data.users : [];
    report.totalRead = existingUsers.length;

    if (existingUsers.length === 0) {
      console.log('[MIGRAÇÃO DE CONTAS] Nenhum usuário a migrar no arquivo.');
      return report;
    }

    const normalizedMap = new Map<string, any>();
    const idRemapping = new Map<number, number>(); // oldId -> preservedId
    const cleanUsers: any[] = [];

    for (const u of existingUsers) {
      const originalEmail = u.email;
      const cleanEmail = normalizeEmail(originalEmail);

      if (cleanEmail !== originalEmail) {
        report.totalNormalized++;
      }

      u.email = cleanEmail;
      u.normalizedEmail = cleanEmail;
      u.normalized_email = cleanEmail;

      if (u.username === 'null' || u.username === 'undefined') {
        u.username = null;
      }
      if (!u.username) {
        const prefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        u.username = prefix.length >= 3 ? prefix : `user_${u.id}`;
      }

      if (u.passwordHash && !u.password_hash) {
        u.password_hash = u.passwordHash;
      }

      if (u.emailVerified === undefined && u.email_verified === undefined) {
        u.emailVerified = true;
        u.email_verified = true;
      }

      if (!u.status) {
        u.status = 'ACTIVE';
      }

      if (u.role === 'MASTER_OWNER') {
        report.masterOwnerPreserved = true;
      }

      if (!normalizedMap.has(cleanEmail)) {
        normalizedMap.set(cleanEmail, u);
        cleanUsers.push(u);
      } else {
        // Duplicate account detected!
        report.duplicatesResolved++;
        const existing = normalizedMap.get(cleanEmail);

        // If the new one is MASTER_OWNER, it takes precedence
        if (u.role === 'MASTER_OWNER' && existing.role !== 'MASTER_OWNER') {
          idRemapping.set(existing.id, u.id);
          const index = cleanUsers.indexOf(existing);
          if (index !== -1) cleanUsers[index] = u;
          normalizedMap.set(cleanEmail, u);
          console.log(`[MIGRAÇÃO DE CONTAS] Duplicidade: Master Owner id ${u.id} preservado sobre id ${existing.id}`);
        } else {
          // Otherwise, preserve earliest valid account
          idRemapping.set(u.id, existing.id);
          console.log(`[MIGRAÇÃO DE CONTAS] Duplicidade: Conta id ${existing.id} preservada sobre duplicata id ${u.id}`);
        }
      }
    }

    // Step 4: Re-link any relations if duplicates were merged so NO data is lost
    if (idRemapping.size > 0) {
      const relTables = ['stores', 'products', 'services', 'orders', 'payments', 'reviews', 'negotiations', 'subscriptions'];
      for (const t of relTables) {
        if (Array.isArray(data[t])) {
          for (const item of data[t]) {
            if (item.userId && idRemapping.has(item.userId)) {
              item.userId = idRemapping.get(item.userId);
            }
            if (item.sellerId && idRemapping.has(item.sellerId)) {
              item.sellerId = idRemapping.get(item.sellerId);
            }
            if (item.buyerId && idRemapping.has(item.buyerId)) {
              item.buyerId = idRemapping.get(item.buyerId);
            }
            if (item.providerId && idRemapping.has(item.providerId)) {
              item.providerId = idRemapping.get(item.providerId);
            }
          }
        }
      }
    }

    data.users = cleanUsers;

    // Step 5: Save atomically
    writeJsonAtomic(DB_FILE, data);

    console.log(`[MIGRAÇÃO DE CONTAS] Concluída com sucesso:`);
    console.log(` - Total de usuários lidos:       ${report.totalRead}`);
    console.log(` - Emails normalizados:            ${report.totalNormalized}`);
    console.log(` - Duplicidades resolvidas:        ${report.duplicatesResolved}`);
    console.log(` - Master Owner preservado:        ${report.masterOwnerPreserved ? 'SIM' : 'NÃO REQUERIDO'}`);
    console.log(` - Usuários finais persistidos:    ${cleanUsers.length}`);
    console.log('================================================================================');

    return report;
  } catch (err: any) {
    console.error('[MIGRAÇÃO DE CONTAS] Erro durante o processo de migração:', err.message);
    return report;
  }
}

export async function runAccountMigration(): Promise<MigrationReport> {
  return runAccountMigrationSync();
}
