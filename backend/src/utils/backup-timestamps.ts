import fs from 'fs';
import path from 'path';

/**
 * Reads the last backup timestamp from backup.log.
 * Returns null if the log doesn't exist or has no completed backups.
 */
export function getLastBackupTimestamp(): number | null {
  try {
    const backupLogPath = path.join(process.cwd(), '..', 'backups', 'backup.log');
    
    if (!fs.existsSync(backupLogPath)) {
      return null;
    }
    
    const content = fs.readFileSync(backupLogPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.includes('Backup completed'));
    
    if (lines.length === 0) {
      return null;
    }
    
    const lastLine = lines[lines.length - 1];
    // Parse: "2025-12-28 08:53:04 - Backup completed: ..."
    const match = lastLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    
    if (!match) {
      return null;
    }
    
    return new Date(match[1]).getTime();
  } catch {
    return null;
  }
}

/**
 * Reads the modification time of the local database file.
 * Returns null if the file doesn't exist.
 */
export function getLastSyncTimestamp(): number | null {
  try {
    const dbPath = path.join(process.cwd(), '..', 'data', 'teacher.db');
    
    if (!fs.existsSync(dbPath)) {
      return null;
    }
    
    const stats = fs.statSync(dbPath);
    return stats.mtime.getTime();
  } catch {
    return null;
  }
}

/**
 * Counts the number of backup files in the backups directory.
 * Only counts files matching the pattern teacher-*.db.
 */
export function getBackupFileCount(): number {
  try {
    const backupDir = path.join(process.cwd(), '..', 'backups');

    if (!fs.existsSync(backupDir)) {
      return 0;
    }

    const files = fs.readdirSync(backupDir);
    return files.filter(f => f.startsWith('teacher-') && f.endsWith('.db')).length;
  } catch {
    return 0;
  }
}

export interface SyncInfo {
  syncedAt: number | null;
  sourceFile: string | null;
  syncedAtHuman: string | null;
}

/**
 * Reads sync info from the .last-sync file created during restore.
 * Returns null values if the file doesn't exist.
 */
export function getSyncInfo(): SyncInfo {
  try {
    const syncInfoPath = path.join(process.cwd(), '..', 'data', '.last-sync');

    if (!fs.existsSync(syncInfoPath)) {
      return { syncedAt: null, sourceFile: null, syncedAtHuman: null };
    }

    const content = fs.readFileSync(syncInfoPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { syncedAt: null, sourceFile: null, syncedAtHuman: null };
  }
}
