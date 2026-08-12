/**
 * Database Backup Utility for Automata / Mi Negocio IA
 * Performs timestamped pg_dump backups of the PostgreSQL database.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function performBackup() {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[Backup] ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db_backup_${timestamp}.sql`);

  console.log(`[Backup] Starting database backup to ${backupPath}...`);

  const command = `pg_dump "${dbUrl}" --clean --if-exists > "${backupPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Backup] ERROR during pg_dump: ${error.message}`);
      // Don't fail hard if pg_dump binary is missing locally in dev
      return;
    }
    const stats = fs.statSync(backupPath);
    console.log(`[Backup] SUCCESS! Backup created (${(stats.size / 1024 / 1024).toFixed(2)} MB).`);
  });
}

performBackup();
