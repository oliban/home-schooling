-- Migration: Fix adventure_generations CHECK constraint to allow 'english'
-- Migration 027 added English support but forgot to update this table
-- SQLite requires recreating the table to change CHECK constraint
-- DATA IS PRESERVED - all rows are copied to the new table

CREATE TABLE IF NOT EXISTS adventure_generations_new (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES math_packages(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    custom_theme TEXT,
    content_type TEXT CHECK (content_type IN ('math', 'reading', 'english')) NOT NULL,
    question_count INTEGER NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
    success_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Copy ALL data from old table (preserves everything)
INSERT INTO adventure_generations_new
SELECT id, child_id, assignment_id, package_id, theme, custom_theme, content_type, question_count, status, success_rate, created_at, completed_at
FROM adventure_generations;

-- Drop old table and rename new one
DROP TABLE adventure_generations;
ALTER TABLE adventure_generations_new RENAME TO adventure_generations;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_adventure_generations_child ON adventure_generations(child_id);
CREATE INDEX IF NOT EXISTS idx_adventure_generations_status ON adventure_generations(status);
CREATE INDEX IF NOT EXISTS idx_adventure_generations_assignment ON adventure_generations(assignment_id);
