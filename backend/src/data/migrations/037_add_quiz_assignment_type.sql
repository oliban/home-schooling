-- Migration: Add 'quiz' to assignment_type CHECK constraints
-- This allows quiz content to be created via the Adventure Creator

-- Disable foreign key checks for table recreation
PRAGMA foreign_keys = OFF;

-- Step 1: Recreate assignments table with updated constraint
CREATE TABLE assignments_new (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading', 'english', 'quiz')) NOT NULL,
    title TEXT NOT NULL,
    grade_level INTEGER,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    hints_allowed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    package_id TEXT REFERENCES math_packages(id),
    assigned_by_id TEXT REFERENCES parents(id),
    display_order INTEGER DEFAULT 0
);

INSERT INTO assignments_new SELECT * FROM assignments;
DROP TABLE assignments;
ALTER TABLE assignments_new RENAME TO assignments;

-- Recreate indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_child ON assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Step 2: Recreate math_packages table with updated constraint
CREATE TABLE math_packages_new (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 9),
    category_id TEXT REFERENCES math_categories(id),
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading', 'english', 'quiz')) DEFAULT 'math',
    problem_count INTEGER NOT NULL,
    difficulty_summary TEXT,
    description TEXT,
    story_text TEXT,
    is_global INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    is_child_generated INTEGER DEFAULT 0,
    generated_for_child_id TEXT REFERENCES children(id)
);

INSERT INTO math_packages_new SELECT * FROM math_packages;
DROP TABLE math_packages;
ALTER TABLE math_packages_new RENAME TO math_packages;

-- Recreate indexes for math_packages
CREATE INDEX IF NOT EXISTS idx_packages_grade ON math_packages(grade_level);
CREATE INDEX IF NOT EXISTS idx_packages_parent ON math_packages(parent_id);

-- Step 3: Recreate adventure_generations table with updated constraint
CREATE TABLE adventure_generations_new (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES math_packages(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    custom_theme TEXT,
    content_type TEXT CHECK (content_type IN ('math', 'reading', 'english', 'quiz')) NOT NULL,
    question_count INTEGER NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
    success_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

INSERT INTO adventure_generations_new SELECT * FROM adventure_generations;
DROP TABLE adventure_generations;
ALTER TABLE adventure_generations_new RENAME TO adventure_generations;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
