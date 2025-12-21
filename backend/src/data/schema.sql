-- Home Schooling Database Schema

-- Parents (main accounts)
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    family_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Children (linked to parents)
CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthdate DATE,
    grade_level INTEGER CHECK (grade_level >= 1 AND grade_level <= 9),
    pin_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Books
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    source_type TEXT CHECK (source_type IN ('pdf', 'images', 'video')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    extracted_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, chapter_number)
);

-- Book pages (OCR source)
CREATE TABLE IF NOT EXISTS book_pages (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    page_number INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    extracted_text TEXT,
    ocr_confidence REAL,
    UNIQUE(book_id, page_number)
);

-- Math categories (LGR 22)
CREATE TABLE IF NOT EXISTS math_categories (
    id TEXT PRIMARY KEY,
    name_sv TEXT NOT NULL,
    name_en TEXT,
    min_grade INTEGER,
    max_grade INTEGER
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading')) NOT NULL,
    title TEXT NOT NULL,
    grade_level INTEGER,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    hints_allowed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Math problems
CREATE TABLE IF NOT EXISTS math_problems (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES math_categories(id),
    problem_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    answer_type TEXT CHECK (answer_type IN ('number', 'text', 'multiple_choice')) DEFAULT 'number',
    options TEXT,
    explanation TEXT,
    hint TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    child_answer TEXT,
    is_correct INTEGER,
    answered_at DATETIME,
    attempts_count INTEGER DEFAULT 1,
    hint_purchased INTEGER DEFAULT 0,
    UNIQUE(assignment_id, problem_number)
);

-- Reading questions (multiple choice only)
CREATE TABLE IF NOT EXISTS reading_questions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    chapter_id TEXT REFERENCES chapters(id),
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    options TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    child_answer TEXT,
    is_correct INTEGER,
    answered_at DATETIME,
    UNIQUE(assignment_id, question_number)
);

-- Gamification: Coins
CREATE TABLE IF NOT EXISTS child_coins (
    child_id TEXT PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0
);

-- Collectibles
CREATE TABLE IF NOT EXISTS collectibles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ascii_art TEXT NOT NULL,
    price INTEGER NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- Child collectibles (purchased)
CREATE TABLE IF NOT EXISTS child_collectibles (
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    collectible_id TEXT NOT NULL REFERENCES collectibles(id),
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (child_id, collectible_id)
);

-- Progress logs
CREATE TABLE IF NOT EXISTS progress_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('started', 'answered', 'completed')) NOT NULL,
    details TEXT,
    coins_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Packages (reusable problem sets for math and reading)
CREATE TABLE IF NOT EXISTS math_packages (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 9),
    category_id TEXT REFERENCES math_categories(id),
    assignment_type TEXT CHECK (assignment_type IN ('math', 'reading')) DEFAULT 'math',
    problem_count INTEGER NOT NULL,
    difficulty_summary TEXT,
    description TEXT,
    is_global INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
);

-- Package problems (immutable question definitions)
CREATE TABLE IF NOT EXISTS package_problems (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES math_packages(id) ON DELETE CASCADE,
    problem_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    answer_type TEXT CHECK (answer_type IN ('number', 'text', 'multiple_choice')) DEFAULT 'number',
    options TEXT,
    explanation TEXT,
    hint TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    UNIQUE(package_id, problem_number)
);

-- Child answers for package-based assignments
CREATE TABLE IF NOT EXISTS assignment_answers (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    problem_id TEXT NOT NULL REFERENCES package_problems(id),
    child_answer TEXT,
    is_correct INTEGER,
    answered_at DATETIME,
    attempts_count INTEGER DEFAULT 1,
    hint_purchased INTEGER DEFAULT 0,
    coins_spent_on_hint INTEGER DEFAULT 0,
    UNIQUE(assignment_id, problem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_books_parent ON books(parent_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_assignments_child ON assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_math_problems_assignment ON math_problems(assignment_id);
CREATE INDEX IF NOT EXISTS idx_reading_questions_assignment ON reading_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_packages_grade ON math_packages(grade_level);
CREATE INDEX IF NOT EXISTS idx_packages_parent ON math_packages(parent_id);
CREATE INDEX IF NOT EXISTS idx_package_problems_package ON package_problems(package_id);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_assignment ON assignment_answers(assignment_id);

-- Seed math categories (LGR 22)
INSERT OR IGNORE INTO math_categories (id, name_sv, name_en, min_grade, max_grade) VALUES
    ('taluppfattning', 'Taluppfattning och tals användning', 'Number sense', 1, 9),
    ('algebra', 'Algebra', 'Algebra', 1, 9),
    ('geometri', 'Geometri', 'Geometry', 1, 9),
    ('sannolikhet', 'Sannolikhet och statistik', 'Probability and Statistics', 1, 9),
    ('samband', 'Samband och förändring', 'Relationships and Change', 4, 9),
    ('problemlosning', 'Problemlösning', 'Problem Solving', 1, 9);

-- Seed collectibles (brainrot characters)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity) VALUES
('meatballo', 'Meatballo Runnerino', '        .-"""-.
       /        \
      |  O    O  |
      |    __    |
       \  """"  /
        ''-....-''
         /|  |\
        / |  | \
       [NIKE] [NIKE]
      ~MEATBALLO~
     ~RUNNERINO!~', 100, 'common'),

('pencilini', 'Pencilini Scribblero', '         /\
        /  \
       /    \
      |  ()  |
      |  ||  |
      |  ||  |
      |  ||  |
      | ==== |
      |______|
     SCRIBBLERO!', 100, 'common'),

('bookwormio', 'Bookwormio Readarino', '      ___===___
     /  O   O  \
    |    ___    |
     \  (===)  /
      \_______/
       |     |
      [BOOK!!]
     READARINO!', 250, 'rare'),

('calculatoro', 'Calculatoro Mathmagico', '      /\  /\  /\
     /  \/  \/  \
    |  * MATH *  |
    +-----------+
    | 1+1=MAGIC |
    |  [7][8][9]|
    |  [4][5][6]|
    |  [1][2][3]|
    +-----------+
    MATHMAGICO!', 250, 'rare'),

('brainiac', 'Brainiac Thinkertino', '       @@@@@@@@
      @   @@   @
     @  @@@@@@  @
    @  @@@@@@@@  @
     @ @@@@@@@@ @
      @@@(O)(O)@
        \  __  /
         |    |
        /|    |\
    THINKERTINO!', 500, 'epic'),

('starbursto', 'Starbursto Shinario', '         *
        /|\
       /*|*\
      /  *  \
     *---*---*
      \  *  /
       \*|*/
        \|/
         *
     SHINARIO!', 500, 'epic'),

('cosmico', 'Cosmico Galaxerio', '        .  *  .
       . oOOo  .
      *  OOOOO  *
       . oOOo  .
        .-||-.
       /  ||  \
      [ROCKET!]
     GALAXERIO!', 1000, 'legendary'),

('ultimato', 'Ultimato Championo', '         *
        /|\
       / | \
      /  |  \
     |  ~~~  |
     | CHAMP |
     |   1   |
      \_____/
     CHAMPIONO!', 1000, 'legendary');
