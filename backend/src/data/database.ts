import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedCollectibles } from './collectibles-seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// From compiled location (backend/dist/data/) go up 3 levels to project root, then into data/
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/homeschooling.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class HomeSchoolingDatabase {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('foreign_keys = ON');
    this.initializeSchema();
  }

  private initializeSchema() {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    this.db.exec(schema);
    this.runMigrations();
    this.seedData();
  }

  private seedData() {
    // Seed collectibles (120 brainrot characters)
    seedCollectibles(this);
  }

  private runMigrations() {
    // Migration: Add family_code column to parents if it doesn't exist
    const parentColumns = this.db.prepare("PRAGMA table_info(parents)").all() as { name: string }[];
    const hasCode = parentColumns.some(c => c.name === 'family_code');

    if (!hasCode) {
      // SQLite doesn't allow UNIQUE in ALTER TABLE, add without constraint
      this.db.exec('ALTER TABLE parents ADD COLUMN family_code TEXT');
      // Create unique index instead
      this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_parents_family_code ON parents(family_code)');

      // Generate family codes for existing parents
      const parents = this.db.prepare('SELECT id FROM parents WHERE family_code IS NULL').all() as { id: string }[];
      for (const parent of parents) {
        let code: string;
        let attempts = 0;
        do {
          code = String(Math.floor(1000 + Math.random() * 9000));
          const existing = this.db.prepare('SELECT id FROM parents WHERE family_code = ?').get(code);
          if (!existing) break;
          attempts++;
        } while (attempts < 100);

        this.db.prepare('UPDATE parents SET family_code = ? WHERE id = ?').run(code, parent.id);
      }
    }

    // Migration: Add coins_earned column to progress_logs if it doesn't exist
    const logColumns = this.db.prepare("PRAGMA table_info(progress_logs)").all() as { name: string }[];
    const hasCoinsEarned = logColumns.some(c => c.name === 'coins_earned');
    if (!hasCoinsEarned) {
      this.db.exec('ALTER TABLE progress_logs ADD COLUMN coins_earned INTEGER DEFAULT 0');
    }

    // Migration: Add shop unlocking columns to children table
    const childColumns = this.db.prepare("PRAGMA table_info(children)").all() as { name: string }[];

    if (!childColumns.some(c => c.name === 'last_login_date')) {
      this.db.exec('ALTER TABLE children ADD COLUMN last_login_date DATE');
    }
    if (!childColumns.some(c => c.name === 'unlocked_shop_items')) {
      this.db.exec('ALTER TABLE children ADD COLUMN unlocked_shop_items INTEGER DEFAULT 3');
    }
    if (!childColumns.some(c => c.name === 'new_item_unlocked_today')) {
      this.db.exec('ALTER TABLE children ADD COLUMN new_item_unlocked_today INTEGER DEFAULT 0');
    }
    if (!childColumns.some(c => c.name === 'preferred_language')) {
      this.db.exec("ALTER TABLE children ADD COLUMN preferred_language TEXT DEFAULT 'sv'");
    }

    // Migration: Add preferred_language to parents table
    const parentColsForLang = this.db.prepare("PRAGMA table_info(parents)").all() as { name: string }[];
    if (!parentColsForLang.some(c => c.name === 'preferred_language')) {
      this.db.exec("ALTER TABLE parents ADD COLUMN preferred_language TEXT DEFAULT 'sv'");
    }

    // Migration: Add package_id to assignments table for package-based assignments
    const assignmentColumns = this.db.prepare("PRAGMA table_info(assignments)").all() as { name: string }[];
    if (!assignmentColumns.some(c => c.name === 'package_id')) {
      this.db.exec('ALTER TABLE assignments ADD COLUMN package_id TEXT REFERENCES math_packages(id)');
    }

    // Migration: Add assignment_type to math_packages table for reading/math distinction
    const packageColumns = this.db.prepare("PRAGMA table_info(math_packages)").all() as { name: string }[];
    if (!packageColumns.some(c => c.name === 'assignment_type')) {
      this.db.exec("ALTER TABLE math_packages ADD COLUMN assignment_type TEXT DEFAULT 'math'");
    }

    // Migration: Add hints_allowed to assignments table for multi-attempt feature
    const assignmentColsForHints = this.db.prepare("PRAGMA table_info(assignments)").all() as { name: string }[];
    if (!assignmentColsForHints.some(c => c.name === 'hints_allowed')) {
      this.db.exec('ALTER TABLE assignments ADD COLUMN hints_allowed INTEGER DEFAULT 1');
    }

    // Migration: Add multi-attempt columns to assignment_answers table
    const answerColumns = this.db.prepare("PRAGMA table_info(assignment_answers)").all() as { name: string }[];
    if (!answerColumns.some(c => c.name === 'attempts_count')) {
      this.db.exec('ALTER TABLE assignment_answers ADD COLUMN attempts_count INTEGER DEFAULT 1');
    }
    if (!answerColumns.some(c => c.name === 'hint_purchased')) {
      this.db.exec('ALTER TABLE assignment_answers ADD COLUMN hint_purchased INTEGER DEFAULT 0');
    }
    if (!answerColumns.some(c => c.name === 'coins_spent_on_hint')) {
      this.db.exec('ALTER TABLE assignment_answers ADD COLUMN coins_spent_on_hint INTEGER DEFAULT 0');
    }

    // Migration: Add multi-attempt columns to math_problems table (legacy assignments)
    const mathProblemColumns = this.db.prepare("PRAGMA table_info(math_problems)").all() as { name: string }[];
    if (!mathProblemColumns.some(c => c.name === 'attempts_count')) {
      this.db.exec('ALTER TABLE math_problems ADD COLUMN attempts_count INTEGER DEFAULT 1');
    }
    if (!mathProblemColumns.some(c => c.name === 'hint_purchased')) {
      this.db.exec('ALTER TABLE math_problems ADD COLUMN hint_purchased INTEGER DEFAULT 0');
    }
  }

  get connection(): Database.Database {
    return this.db;
  }

  // Helper to run a query and return all results
  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  // Helper to run a query and return first result
  get<T>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  // Helper to run an insert/update/delete
  run(sql: string, params: unknown[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  // Transaction helper
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: HomeSchoolingDatabase | null = null;

export function getDb(): HomeSchoolingDatabase {
  if (!dbInstance) {
    dbInstance = new HomeSchoolingDatabase();
  }
  return dbInstance;
}

export type { HomeSchoolingDatabase };
