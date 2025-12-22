-- Migration 003: Add reading comprehension category and objectives
-- Adds simple reading skill codes for lasforstaelse (reading comprehension)

-- Add reading comprehension category
INSERT OR IGNORE INTO math_categories (id, name_sv, name_en, min_grade, max_grade) VALUES
    ('lasforstaelse', 'Lasforstaelse', 'Reading Comprehension', 1, 9);

-- Add Swedish reading objectives (5 simple codes)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('lasforstaelse', 'SV-LITERAL', 'Direkt textforstaelse - fakta och detaljer', '["1","2","3","4","5","6","7","8","9"]'),
    ('lasforstaelse', 'SV-INFERENCE', 'Inferens och slutledning', '["1","2","3","4","5","6","7","8","9"]'),
    ('lasforstaelse', 'SV-MAIN-IDEA', 'Huvudtanke och budskap', '["1","2","3","4","5","6","7","8","9"]'),
    ('lasforstaelse', 'SV-CHARACTER', 'Karaktarsforstaelse och motiv', '["1","2","3","4","5","6","7","8","9"]'),
    ('lasforstaelse', 'SV-VOCABULARY', 'Ordforstaelse i kontext', '["1","2","3","4","5","6","7","8","9"]');
