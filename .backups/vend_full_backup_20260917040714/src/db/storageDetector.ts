import fs from 'fs';
import path from 'path';

let lastKnownPostgresReachable = false;

export function setPostgresReachable(reachable: boolean): void {
  lastKnownPostgresReachable = reachable;
}

export interface StorageStatus {
  // Required fields by audit specification:
  storageBackend: string;
  persistent: boolean;
  databaseConfigured: boolean;
  databaseReachable: boolean;
  sourceOfTruth: string;
  pgMemActive: boolean;

  // Granular diagnostic fields:
  mechanism: 'PostgreSQL persistente' | 'Armazenamento persistente em disco (JSON atômico + backup)' | 'Fallback temporário';
  engine: 'PostgreSQL' | 'Local Disk JSON Engine';
  isExternalPostgres: boolean;
  isEphemeralEnvironment: boolean;
  dataPath: string;
  backupPath: string;
  hasDiskFile: boolean;
  hasBackupFile: boolean;
  survivesProcessRestart: boolean;
  survivesRebuild: boolean;
  survivesEphemeralRedeploy: boolean;
  statement: string;
}

export function detectStorageStatus(): StorageStatus {
  const isPostgresConfigured = Boolean(
    process.env.DATABASE_URL ||
    (process.env.SQL_HOST && process.env.SQL_HOST !== 'localhost')
  );

  const isEphemeral = Boolean(
    process.env.K_SERVICE || // Google Cloud Run
    process.env.K_REVISION ||
    process.env.CONTAINER_NAME ||
    fs.existsSync('/.dockerenv')
  );

  const dataDir = path.join(process.cwd(), 'data');
  const dbFile = path.join(dataDir, 'vend_database.json');
  const bakFile = path.join(dataDir, 'vend_database.json.bak');

  const hasDiskFile = fs.existsSync(dbFile);
  const hasBackupFile = fs.existsSync(bakFile);

  if (isPostgresConfigured) {
    const isReachable = lastKnownPostgresReachable;
    const isActuallyUsingPostgres = isReachable;

    return {
      storageBackend: isActuallyUsingPostgres ? 'PostgreSQL' : 'Local Disk JSON Engine (fallback temporário)',
      persistent: isActuallyUsingPostgres ? true : false,
      databaseConfigured: true,
      databaseReachable: isReachable,
      sourceOfTruth: isActuallyUsingPostgres ? 'PostgreSQL Database' : 'data/vend_database.json',
      pgMemActive: !isActuallyUsingPostgres,

      mechanism: isActuallyUsingPostgres ? 'PostgreSQL persistente' : 'Fallback temporário',
      engine: isActuallyUsingPostgres ? 'PostgreSQL' : 'Local Disk JSON Engine',
      isExternalPostgres: true,
      isEphemeralEnvironment: isEphemeral,
      dataPath: process.env.DATABASE_URL ? '[DATABASE_URL configurado]' : `host: ${process.env.SQL_HOST}`,
      backupPath: 'Gerenciado pelo provedor PostgreSQL',
      hasDiskFile,
      hasBackupFile,
      survivesProcessRestart: true,
      survivesRebuild: true,
      survivesEphemeralRedeploy: isActuallyUsingPostgres ? true : false,
      statement: isActuallyUsingPostgres
        ? 'Persistência externa definitiva ativa via PostgreSQL.'
        : 'DATABASE_URL configurado, porém não alcançável no momento; operando em fallback.',
    };
  }

  // Without DATABASE_URL, local JSON storage
  return {
    storageBackend: 'Local Disk JSON Engine',
    persistent: false, // In ephemeral environment (Cloud Run), true permanent durability requires external storage
    databaseConfigured: false,
    databaseReachable: false,
    sourceOfTruth: 'data/vend_database.json',
    pgMemActive: true,

    mechanism: 'Armazenamento persistente em disco (JSON atômico + backup)',
    engine: 'Local Disk JSON Engine',
    isExternalPostgres: false,
    isEphemeralEnvironment: isEphemeral,
    dataPath: dbFile,
    backupPath: bakFile,
    hasDiskFile,
    hasBackupFile,
    survivesProcessRestart: true,
    survivesRebuild: true,
    survivesEphemeralRedeploy: false,
    statement: isEphemeral
      ? 'PERSISTÊNCIA PERMANENTE DEPENDE DE BANCO/ARMAZENAMENTO EXTERNO PERSISTENTE.'
      : 'Persistência local atômica em disco ativa (com backup rotativo).',
  };
}

export function printStorageBanner(): void {
  const status = detectStorageStatus();

  console.log('\n================================================================================');
  console.log(' [VEND+] DIAGNÓSTICO DE ARMAZENAMENTO E PERSISTÊNCIA NA INICIALIZAÇÃO');
  console.log('--------------------------------------------------------------------------------');
  console.log(` • Storage Backend:         ${status.storageBackend}`);
  console.log(` • Fonte de Verdade:        ${status.sourceOfTruth}`);
  console.log(` • DATABASE_URL:            ${status.databaseConfigured ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
  console.log(` • PostgreSQL Alcançável:   ${status.databaseReachable ? 'SIM' : 'NÃO'}`);
  console.log(` • pg-mem Ativo:            ${status.pgMemActive ? 'SIM' : 'NÃO'}`);
  console.log(` • Ambiente Efêmero:        ${status.isEphemeralEnvironment ? 'SIM (Cloud Run / Conteinerizado)' : 'NÃO'}`);
  console.log(` • Arquivo de Dados:        ${status.dataPath} (${status.hasDiskFile ? 'EXISTE' : 'NOVO'})`);
  console.log(` • Arquivo de Backup:       ${status.backupPath} (${status.hasBackupFile ? 'EXISTE' : 'NÃO CRIADO AINDA'})`);
  console.log(' • Comportamento de Durabilidade:');
  console.log(`   - Sobrevive a Logout:                       SIM`);
  console.log(`   - Sobrevive a Restart do Processo:          SIM`);
  console.log(`   - Sobrevive a Rebuild do Applet:            SIM`);
  console.log(`   - Sobrevive a Redeploy/Container Efêmero:   ${status.survivesEphemeralRedeploy ? 'SIM' : 'NÃO'}`);
  if (!status.databaseConfigured && status.isEphemeralEnvironment) {
    console.log('--------------------------------------------------------------------------------');
    console.log(' AVISO ARQUITETURAL OBRIGATÓRIO:');
    console.log(' ' + status.statement);
  }
  console.log('================================================================================\n');
}
