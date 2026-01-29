-- Migration 027: Add English as a third subject
-- Adds English alongside Math and Reading with all grade levels

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly
-- We need to recreate the tables with the new constraint

-- Step 1: Add English category to math_categories (which is actually a general categories table)
INSERT OR IGNORE INTO math_categories (id, name_sv, name_en, min_grade, max_grade) VALUES
    ('english-vocabulary', 'Engelska - Ordförråd', 'English - Vocabulary', 1, 9),
    ('english-grammar', 'Engelska - Grammatik', 'English - Grammar', 1, 9),
    ('english-comprehension', 'Engelska - Läsförståelse', 'English - Comprehension', 1, 9),
    ('english-translation', 'Engelska - Översättning', 'English - Translation', 1, 9);

-- Step 2: Add English LGR 22 objectives
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    -- Vocabulary objectives
    ('english-vocabulary', 'EN-VOC-01', 'Vardagsord och enkla fraser', '["1","2","3"]'),
    ('english-vocabulary', 'EN-VOC-02', 'Ord och fraser om skola, familj och fritid', '["4","5","6"]'),
    ('english-vocabulary', 'EN-VOC-03', 'Avancerat ordförråd och idiom', '["7","8","9"]'),

    -- Grammar objectives
    ('english-grammar', 'EN-GRM-01', 'Enkla meningar och frågor', '["1","2","3"]'),
    ('english-grammar', 'EN-GRM-02', 'Verbformer, adjektiv och prepositioner', '["4","5","6"]'),
    ('english-grammar', 'EN-GRM-03', 'Avancerad grammatik och satsbyggnad', '["7","8","9"]'),

    -- Comprehension objectives
    ('english-comprehension', 'EN-CMP-01', 'Enkel textförståelse', '["1","2","3"]'),
    ('english-comprehension', 'EN-CMP-02', 'Läsförståelse av berättelser och faktatexter', '["4","5","6"]'),
    ('english-comprehension', 'EN-CMP-03', 'Avancerad textanalys och tolkning', '["7","8","9"]'),

    -- Translation objectives
    ('english-translation', 'EN-TRN-01', 'Översättning av ord och enkla fraser', '["1","2","3"]'),
    ('english-translation', 'EN-TRN-02', 'Översättning av meningar och korta texter', '["4","5","6"]'),
    ('english-translation', 'EN-TRN-03', 'Avancerad översättning med idiom och nyanser', '["7","8","9"]');

-- Step 3: Update assignments table to allow 'english' type
-- SQLite requires recreating the table to change CHECK constraint

-- Create new assignments table with updated constraint
CREATE TABLE IF NOT EXISTS assignments_new (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading', 'english')) NOT NULL,
    title TEXT NOT NULL,
    grade_level INTEGER,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    hints_allowed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    package_id TEXT REFERENCES math_packages(id) ON DELETE SET NULL,
    display_order INTEGER,
    assigned_by_id TEXT REFERENCES parents(id) ON DELETE SET NULL
);

-- Copy data from old table
INSERT INTO assignments_new
SELECT id, parent_id, child_id, assignment_type, title, grade_level, status, hints_allowed, created_at, completed_at, package_id, display_order, assigned_by_id
FROM assignments;

-- Drop old table and rename new one
DROP TABLE assignments;
ALTER TABLE assignments_new RENAME TO assignments;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_assignments_child ON assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Step 4: Update math_packages table to allow 'english' type
CREATE TABLE IF NOT EXISTS math_packages_new (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 9),
    category_id TEXT REFERENCES math_categories(id),
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading', 'english')) DEFAULT 'math',
    problem_count INTEGER NOT NULL,
    difficulty_summary TEXT,
    description TEXT,
    story_text TEXT,
    is_global INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
);

-- Copy data from old table
INSERT INTO math_packages_new
SELECT id, parent_id, name, grade_level, category_id, assignment_type, problem_count, difficulty_summary, description, story_text, is_global, created_at, is_active
FROM math_packages;

-- Drop old table and rename new one
DROP TABLE math_packages;
ALTER TABLE math_packages_new RENAME TO math_packages;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_packages_grade ON math_packages(grade_level);
CREATE INDEX IF NOT EXISTS idx_packages_parent ON math_packages(parent_id);

-- Step 5: Update exercise_curriculum_mapping to include english
-- Add 'english_problem' as a valid exercise_type
CREATE TABLE IF NOT EXISTS exercise_curriculum_mapping_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_type TEXT NOT NULL CHECK (exercise_type IN ('math_problem', 'reading_question', 'package_problem', 'english_problem')),
    exercise_id TEXT NOT NULL,
    objective_id INTEGER NOT NULL REFERENCES curriculum_objectives(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exercise_type, exercise_id, objective_id)
);

-- Copy data from old table
INSERT INTO exercise_curriculum_mapping_new
SELECT id, exercise_type, exercise_id, objective_id, created_at
FROM exercise_curriculum_mapping;

-- Drop old table and rename new one
DROP TABLE exercise_curriculum_mapping;
ALTER TABLE exercise_curriculum_mapping_new RENAME TO exercise_curriculum_mapping;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_exercise_curriculum_mapping_objective ON exercise_curriculum_mapping(objective_id);
CREATE INDEX IF NOT EXISTS idx_exercise_curriculum_mapping_exercise ON exercise_curriculum_mapping(exercise_type, exercise_id);
