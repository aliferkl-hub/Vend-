import fs from 'fs';
import path from 'path';

export interface BackupOptions {
  label?: string;
  forceTimestampBackup?: boolean;
}

/**
 * Generates a formatted timestamp string YYYYMMDD_HHMMSS
 */
export function getBackupTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

/**
 * Creates an immutable timestamped backup file before any migration or critical operation.
 * Formato padrão: vend_auth_backup_YYYYMMDD_HHMMSS.json
 */
export function createTimestampedBackup(sourceFile: string, prefix = 'vend_auth_backup_'): string | null {
  try {
    if (!fs.existsSync(sourceFile)) {
      return null;
    }
    const dir = path.dirname(sourceFile);
    const timestamp = getBackupTimestamp();
    const backupFileName = `${prefix}${timestamp}.json`;
    const backupPath = path.join(dir, backupFileName);

    fs.copyFileSync(sourceFile, backupPath);
    console.log(`[Storage] Backup de segurança criado com sucesso: ${backupFileName}`);
    return backupPath;
  } catch (err: any) {
    console.error(`[Storage] Falha ao gerar backup de segurança:`, err.message);
    return null;
  }
}

/**
 * Atomically writes data to disk:
 * 1. Writes to temporary file
 * 2. Flushes data to physical disk via fsync
 * 3. Atomic rename guarantees file is never left half-written
 * 4. Preserves previous copy in .bak
 * 5. Safety lock: Prevents overwriting valid database with empty users table
 */
export function writeJsonAtomic(filePath: string, data: any): void {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Safety lock: check existing file
  if (fs.existsSync(filePath)) {
    try {
      const existingRaw = fs.readFileSync(filePath, 'utf8');
      if (existingRaw && existingRaw.trim().length > 0) {
        const parsedExisting = JSON.parse(existingRaw);
        const parsedNew = typeof data === 'string' ? JSON.parse(data) : data;
        const prevUsers = Array.isArray(parsedExisting?.users) ? parsedExisting.users.length : 0;
        const newUsers = Array.isArray(parsedNew?.users) ? parsedNew.users.length : 0;

        // If previous file had users and new one has 0, abort write to prevent data wipe!
        if (prevUsers > 0 && newUsers === 0) {
          console.error(`[Storage] BLOQUEIO DE SEGURANÇA: Tentativa de gravar 0 usuários sobre ${prevUsers} existentes abortada.`);
          throw new Error(`SAFETY_LOCK_ABORT: Attempt to overwrite ${prevUsers} users with 0 users.`);
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message?.startsWith('SAFETY_LOCK_ABORT')) {
        throw checkErr;
      }
      // If parsing fails for safety check, proceed with caution
    }
  }

  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  // Step 1 & 2: Write to tmp file and flush
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeSync(fd, serialized, 0, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  // Step 3: Maintain .bak copy
  const bakPath = `${filePath}.bak`;
  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, bakPath);
    } catch {}
  }

  // Step 4: Atomic rename
  fs.renameSync(tmpPath, filePath);
}
