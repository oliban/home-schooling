import { getDb } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function runMigrations(): void {
  const db = getDb();

  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of applied migrations
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row: any) => row.version)
  );

  // Get list of migration files
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found');
    return;
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order

  let appliedCount = 0;

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '');

    if (applied.has(version)) {
      console.log(`✓ Migration ${version} already applied`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running migration ${version}...`);

    try {
      // Run migration in a transaction
      db.transaction(() => {
        // Split by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement) {
            db.exec(statement);
          }
        }
      })();

      console.log(`✓ Migration ${version} completed`);
      appliedCount++;
    } catch (error) {
      console.error(`✗ Migration ${version} failed:`, error);
      throw error;
    }
  }

  if (appliedCount === 0) {
    console.log('No new migrations to apply');
  } else {
    console.log(`\nApplied ${appliedCount} migration(s) successfully`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
