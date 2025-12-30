import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_PATH = path.join(__dirname, '../../data/test-migrations.db');
const MIGRATIONS_DIR = path.join(__dirname, '../data/migrations');

describe('Database Migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create fresh test database with base schema
    db = new Database(TEST_DB_PATH);

    // Create base schema (parents table without is_admin)
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parents (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        family_code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('001-add-admin-flag migration', () => {
    function runMigration() {
      const migrationFile = path.join(MIGRATIONS_DIR, '001-add-admin-flag.sql');
      const sql = fs.readFileSync(migrationFile, 'utf-8');
      db.exec(sql);
    }

    it('should add is_admin column to parents table', () => {
      // Run migration
      runMigration();

      // Verify column exists
      const tableInfo = db.prepare('PRAGMA table_info(parents)').all() as Array<{
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
      }>;

      const isAdminColumn = tableInfo.find(col => col.name === 'is_admin');
      expect(isAdminColumn).toBeDefined();
      expect(isAdminColumn?.type).toBe('INTEGER');
      expect(isAdminColumn?.dflt_value).toBe('0');
    });

    it('should create index for admin lookups', () => {
      runMigration();

      // Verify index exists
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='parents'
      `).all() as Array<{ name: string }>;

      const hasAdminIndex = indexes.some(idx => idx.name === 'idx_parents_admin');
      expect(hasAdminIndex).toBe(true);
    });

    it('should set default value of 0 for is_admin', () => {
      // Insert a parent before migration
      db.prepare(`
        INSERT INTO parents (id, email, password_hash, name, family_code)
        VALUES ('test-id', 'test@example.com', 'hash', 'Test Parent', '1234')
      `).run();

      runMigration();

      // Verify existing parent has is_admin = 0
      const parent = db.prepare('SELECT is_admin FROM parents WHERE id = ?').get('test-id') as {
        is_admin: number;
      };

      expect(parent.is_admin).toBe(0);
    });

    it('should record migration in schema_migrations table', () => {
      // Run migration
      runMigration();

      // Verify schema_migrations has entry
      const migrations = db.prepare('SELECT version FROM schema_migrations').all() as Array<{
        version: string;
      }>;

      const adminMigrations = migrations.filter(m => m.version === '001-add-admin-flag');
      expect(adminMigrations.length).toBeGreaterThan(0);

      // Verify table structure is correct
      const tableInfo = db.prepare('PRAGMA table_info(parents)').all() as Array<{
        name: string;
      }>;

      const isAdminColumns = tableInfo.filter(col => col.name === 'is_admin');
      expect(isAdminColumns).toHaveLength(1);
    });

    it('should only allow 0 or 1 for is_admin', () => {
      runMigration();

      // Test valid values (0 and 1)
      expect(() => {
        db.prepare(`
          INSERT INTO parents (id, email, password_hash, name, is_admin)
          VALUES ('admin-id', 'admin@example.com', 'hash', 'Admin', 1)
        `).run();
      }).not.toThrow();

      expect(() => {
        db.prepare(`
          INSERT INTO parents (id, email, password_hash, name, is_admin)
          VALUES ('user-id', 'user@example.com', 'hash', 'User', 0)
        `).run();
      }).not.toThrow();

      // Test invalid value (2)
      expect(() => {
        db.prepare(`
          INSERT INTO parents (id, email, password_hash, name, is_admin)
          VALUES ('invalid-id', 'invalid@example.com', 'hash', 'Invalid', 2)
        `).run();
      }).toThrow();
    });
  });
});
