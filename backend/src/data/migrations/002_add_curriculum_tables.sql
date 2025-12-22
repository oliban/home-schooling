-- Migration 002: Add curriculum tables and populate with LGR 22 objectives
-- This migration creates the curriculum tracking tables and seeds initial data

-- Ensure curriculum_objectives table exists (should already be created by schema.sql)
CREATE TABLE IF NOT EXISTS curriculum_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id TEXT NOT NULL REFERENCES math_categories(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    grade_levels TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ensure exercise_curriculum_mapping table exists
CREATE TABLE IF NOT EXISTS exercise_curriculum_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_type TEXT NOT NULL CHECK (exercise_type IN ('math_problem', 'reading_question', 'package_problem')),
    exercise_id TEXT NOT NULL,
    objective_id INTEGER NOT NULL REFERENCES curriculum_objectives(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exercise_type, exercise_id, objective_id)
);

-- Ensure child_curriculum_progress table exists
CREATE TABLE IF NOT EXISTS child_curriculum_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    objective_id INTEGER NOT NULL REFERENCES curriculum_objectives(id) ON DELETE CASCADE,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
    UNIQUE(child_id, objective_id, assignment_id)
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_curriculum_objectives_category ON curriculum_objectives(category_id);
CREATE INDEX IF NOT EXISTS idx_exercise_curriculum_mapping_objective ON exercise_curriculum_mapping(objective_id);
CREATE INDEX IF NOT EXISTS idx_exercise_curriculum_mapping_exercise ON exercise_curriculum_mapping(exercise_type, exercise_id);
CREATE INDEX IF NOT EXISTS idx_child_curriculum_progress_child ON child_curriculum_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_curriculum_progress_objective ON child_curriculum_progress(objective_id);

-- Seed LGR 22 Curriculum Objectives for Mathematics
-- Category: Taluppfattning (Number sense) - grades 1-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('taluppfattning', 'MA-TAL-01', 'Naturliga tal och deras egenskaper', '["1","2","3"]'),
    ('taluppfattning', 'MA-TAL-02', 'Positionssystemet för naturliga tal', '["1","2","3"]'),
    ('taluppfattning', 'MA-TAL-03', 'Del av helhet och del av antal', '["1","2","3"]'),
    ('taluppfattning', 'MA-TAL-04', 'Naturliga tal och enkla tal i brakform', '["4","5","6"]'),
    ('taluppfattning', 'MA-TAL-05', 'Positionssystemet for hela tal och decimaltal', '["4","5","6"]'),
    ('taluppfattning', 'MA-TAL-06', 'Tal i brakform och decimalform', '["4","5","6"]'),
    ('taluppfattning', 'MA-TAL-07', 'Tal i procentform och sambandet med brak och decimal', '["4","5","6"]'),
    ('taluppfattning', 'MA-TAL-08', 'Negativa tal och deras egenskaper', '["4","5","6"]'),
    ('taluppfattning', 'MA-TAL-09', 'Reella tal och deras egenskaper', '["7","8","9"]'),
    ('taluppfattning', 'MA-TAL-10', 'Talsystemets utveckling fran naturliga tal till reella tal', '["7","8","9"]'),
    ('taluppfattning', 'MA-TAL-11', 'Centrala metoder for berakningar med reella tal', '["7","8","9"]'),
    ('taluppfattning', 'MA-TAL-12', 'Rimlighetsbedamning vid uppskattningar och berakningar', '["1","2","3","4","5","6","7","8","9"]');

-- Category: Algebra - grades 1-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('algebra', 'MA-ALG-01', 'Likheter och likhetstecknets betydelse', '["1","2","3"]'),
    ('algebra', 'MA-ALG-02', 'Hur enkla monster kan beskrivas och konstrueras', '["1","2","3"]'),
    ('algebra', 'MA-ALG-03', 'Obekanta tal och hur de kan representeras', '["4","5","6"]'),
    ('algebra', 'MA-ALG-04', 'Metoder for enkel ekvationslosning', '["4","5","6"]'),
    ('algebra', 'MA-ALG-05', 'Hur monster i talfoljder kan konstrueras och beskrivas', '["4","5","6"]'),
    ('algebra', 'MA-ALG-06', 'Inneborden av variabelbegreppet', '["7","8","9"]'),
    ('algebra', 'MA-ALG-07', 'Algebraiska uttryck, formler och ekvationer', '["7","8","9"]'),
    ('algebra', 'MA-ALG-08', 'Metoder for ekvationslosning', '["7","8","9"]'),
    ('algebra', 'MA-ALG-09', 'Losning av linjara ekvationssystem', '["7","8","9"]'),
    ('algebra', 'MA-ALG-10', 'Potenser med heltaliga exponenter', '["7","8","9"]');

-- Category: Geometri (Geometry) - grades 1-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('geometri', 'MA-GEO-01', 'Grundlaggande geometriska objekt', '["1","2","3"]'),
    ('geometri', 'MA-GEO-02', 'Konstruktion av enkla geometriska objekt', '["1","2","3"]'),
    ('geometri', 'MA-GEO-03', 'Vanliga lagesord for att beskriva placering i rummet', '["1","2","3"]'),
    ('geometri', 'MA-GEO-04', 'Symmetri i vardagen och i konsten', '["1","2","3"]'),
    ('geometri', 'MA-GEO-05', 'Grundlaggande geometriska objekt och deras egenskaper', '["4","5","6"]'),
    ('geometri', 'MA-GEO-06', 'Konstruktion av geometriska objekt', '["4","5","6"]'),
    ('geometri', 'MA-GEO-07', 'Metoder for att bestamma omkrets och area', '["4","5","6"]'),
    ('geometri', 'MA-GEO-08', 'Skala och dess anvandning i vardagliga situationer', '["4","5","6"]'),
    ('geometri', 'MA-GEO-09', 'Geometriska objekt och deras egenskaper', '["7","8","9"]'),
    ('geometri', 'MA-GEO-10', 'Avbildning och konstruktion av geometriska objekt', '["7","8","9"]'),
    ('geometri', 'MA-GEO-11', 'Likformighet och symmetri', '["7","8","9"]'),
    ('geometri', 'MA-GEO-12', 'Metoder for berakning av area, omkrets och volym', '["7","8","9"]'),
    ('geometri', 'MA-GEO-13', 'Satsen om triangelns vinkelsumma och Pythagoras sats', '["7","8","9"]');

-- Category: Sannolikhet och statistik (Probability and Statistics) - grades 1-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('sannolikhet', 'MA-SAN-01', 'Slumphandelser i experiment och spel', '["1","2","3"]'),
    ('sannolikhet', 'MA-SAN-02', 'Enkla tabeller och diagram', '["1","2","3"]'),
    ('sannolikhet', 'MA-SAN-03', 'Sannolikhet och chans i enkla situationer', '["4","5","6"]'),
    ('sannolikhet', 'MA-SAN-04', 'Enkel kombinatorik', '["4","5","6"]'),
    ('sannolikhet', 'MA-SAN-05', 'Tabeller och diagram for att beskriva resultat', '["4","5","6"]'),
    ('sannolikhet', 'MA-SAN-06', 'Lagesmatt och hur de anvands i statistik', '["4","5","6"]'),
    ('sannolikhet', 'MA-SAN-07', 'Likformig sannolikhet och metoder for berakning', '["7","8","9"]'),
    ('sannolikhet', 'MA-SAN-08', 'Hur kombinatorik kan anvandas', '["7","8","9"]'),
    ('sannolikhet', 'MA-SAN-09', 'Tabeller, diagram och grafer', '["7","8","9"]'),
    ('sannolikhet', 'MA-SAN-10', 'Lagesmatt och spridningsmatt', '["7","8","9"]'),
    ('sannolikhet', 'MA-SAN-11', 'Bedamning av risker och chanser', '["7","8","9"]');

-- Category: Samband och forandring (Relationships and Change) - grades 4-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('samband', 'MA-SAM-01', 'Proportionalitet och procent', '["4","5","6"]'),
    ('samband', 'MA-SAM-02', 'Grafer for att uttrycka proportionella samband', '["4","5","6"]'),
    ('samband', 'MA-SAM-03', 'Koordinatsystem och gradering av axlar', '["4","5","6"]'),
    ('samband', 'MA-SAM-04', 'Funktioner och linjara ekvationer', '["7","8","9"]'),
    ('samband', 'MA-SAM-05', 'Hur funktioner kan anvandas', '["7","8","9"]'),
    ('samband', 'MA-SAM-06', 'Linjara funktioner och linjara ekvationssystem', '["7","8","9"]'),
    ('samband', 'MA-SAM-07', 'Proportionalitet, forandringsfaktor och procentforandring', '["7","8","9"]');

-- Category: Problemlosning (Problem Solving) - grades 1-9
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('problemlosning', 'MA-PRO-01', 'Strategier for problemlosning i vardagliga situationer', '["1","2","3"]'),
    ('problemlosning', 'MA-PRO-02', 'Matematisk formulering av fragestallningar', '["1","2","3"]'),
    ('problemlosning', 'MA-PRO-03', 'Strategier for problemlosning med addition och subtraktion', '["1","2","3"]'),
    ('problemlosning', 'MA-PRO-04', 'Strategier for problemlosning i vardagsnara situationer', '["4","5","6"]'),
    ('problemlosning', 'MA-PRO-05', 'Formulering av fragestallningar med hjllp av matematik', '["4","5","6"]'),
    ('problemlosning', 'MA-PRO-06', 'Strategier for problemlosning med de fyra raknesatten', '["4","5","6"]'),
    ('problemlosning', 'MA-PRO-07', 'Strategier for problemlosning i vardags- och yrkessituationer', '["7","8","9"]'),
    ('problemlosning', 'MA-PRO-08', 'Formulering av fragestallningar med matematiska modeller', '["7","8","9"]'),
    ('problemlosning', 'MA-PRO-09', 'Strategier for matematisk problemlosning och resonemangsformaga', '["7","8","9"]');
