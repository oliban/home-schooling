/**
 * Backup timestamp utilities tests
 * Tests for reading backup and sync timestamps from files
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getLastBackupTimestamp,
  getLastSyncTimestamp,
  getBackupFileCount,
} from '../utils/backup-timestamps.js';

// Use a temp directory for testing
const TEST_DIR = path.join(process.cwd(), 'test-temp-backups');
const TEST_DATA_DIR = path.join(process.cwd(), 'test-temp-data');

describe.skip('Backup Timestamp Utilities', () => {
  beforeAll(() => {
    // Save original process.cwd
    process.env.TEST_MODE = 'true';
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    delete process.env.TEST_MODE;
  });

  describe('getLastBackupTimestamp', () => {
    it('should parse backup.log correctly', () => {
      const logContent = `2025-12-27 10:30:00 - Backup started
2025-12-27 10:30:45 - Backup completed: /backups/teacher-2025-12-27-10-30-45.db (804K)
2025-12-28 08:52:53 - Backup started
2025-12-28 08:53:04 - Backup completed: /backups/teacher-2025-12-28-08-53-04.db (804K)`;

      fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), 'backups', 'backup.log'), logContent);

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBe(new Date('2025-12-28 08:53:04').getTime());

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'backups', 'backup.log'));
    });

    it('should return null when backup.log is missing', () => {
      // Ensure backups directory doesn't exist or is empty
      const backupLog = path.join(process.cwd(), 'backups', 'backup.log');
      if (fs.existsSync(backupLog)) {
        fs.unlinkSync(backupLog);
      }

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBeNull();
    });

    it('should return null when log has no "Backup completed" lines', () => {
      fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
      fs.writeFileSync(
        path.join(process.cwd(), 'backups', 'backup.log'),
        '2025-12-28 08:52:53 - Backup started\n2025-12-28 08:52:54 - Downloading...'
      );

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBeNull();

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'backups', 'backup.log'));
    });

    it('should return timestamp of last backup (not first)', () => {
      const logContent = `2025-12-27 10:30:45 - Backup completed: /backups/teacher-2025-12-27.db
2025-12-28 08:53:04 - Backup completed: /backups/teacher-2025-12-28.db`;

      fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), 'backups', 'backup.log'), logContent);

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBe(new Date('2025-12-28 08:53:04').getTime());

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'backups', 'backup.log'));
    });

    it('should handle invalid date format gracefully', () => {
      fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
      fs.writeFileSync(
        path.join(process.cwd(), 'backups', 'backup.log'),
        'Invalid date - Backup completed: /backups/teacher.db'
      );

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBeNull();

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'backups', 'backup.log'));
    });

    it('should handle empty log file', () => {
      fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), 'backups', 'backup.log'), '');

      const timestamp = getLastBackupTimestamp();
      expect(timestamp).toBeNull();

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'backups', 'backup.log'));
    });
  });

  describe('getLastSyncTimestamp', () => {
    it('should read teacher.db mtime correctly', () => {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), 'data', 'teacher.db'), '');

      const timestamp = getLastSyncTimestamp();
      expect(timestamp).toBeTypeOf('number');
      expect(timestamp).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'data', 'teacher.db'));
    });

    it('should return null when teacher.db is missing', () => {
      const dbPath = path.join(process.cwd(), 'data', 'teacher.db');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }

      const timestamp = getLastSyncTimestamp();
      expect(timestamp).toBeNull();
    });
  });

  describe('getBackupFileCount', () => {
    it('should count backup files correctly', () => {
      const backupDir = path.join(process.cwd(), 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      
      fs.writeFileSync(path.join(backupDir, 'teacher-2025-12-27-10-30-45.db'), '');
      fs.writeFileSync(path.join(backupDir, 'teacher-2025-12-28-08-53-04.db'), '');
      fs.writeFileSync(path.join(backupDir, 'teacher-2025-12-28-12-15-30.db'), '');
      fs.writeFileSync(path.join(backupDir, 'latest.db'), '');
      fs.writeFileSync(path.join(backupDir, 'backup.log'), '');

      const count = getBackupFileCount();
      expect(count).toBe(3);

      // Cleanup
      fs.unlinkSync(path.join(backupDir, 'teacher-2025-12-27-10-30-45.db'));
      fs.unlinkSync(path.join(backupDir, 'teacher-2025-12-28-08-53-04.db'));
      fs.unlinkSync(path.join(backupDir, 'teacher-2025-12-28-12-15-30.db'));
      fs.unlinkSync(path.join(backupDir, 'latest.db'));
      fs.unlinkSync(path.join(backupDir, 'backup.log'));
    });

    it('should return 0 when backups directory is empty', () => {
      const backupDir = path.join(process.cwd(), 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      
      fs.writeFileSync(path.join(backupDir, 'backup.log'), '');

      const count = getBackupFileCount();
      expect(count).toBe(0);

      // Cleanup
      fs.unlinkSync(path.join(backupDir, 'backup.log'));
    });

    it('should filter only teacher-*.db files', () => {
      const backupDir = path.join(process.cwd(), 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      
      fs.writeFileSync(path.join(backupDir, 'teacher-2025-12-27.db'), '');
      fs.writeFileSync(path.join(backupDir, 'other-backup.db'), '');
      fs.writeFileSync(path.join(backupDir, 'latest.db'), '');
      fs.writeFileSync(path.join(backupDir, 'backup.log'), '');

      const count = getBackupFileCount();
      expect(count).toBe(1);

      // Cleanup
      fs.unlinkSync(path.join(backupDir, 'teacher-2025-12-27.db'));
      fs.unlinkSync(path.join(backupDir, 'other-backup.db'));
      fs.unlinkSync(path.join(backupDir, 'latest.db'));
      fs.unlinkSync(path.join(backupDir, 'backup.log'));
    });
  });
});
