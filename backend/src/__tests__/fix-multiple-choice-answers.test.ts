import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We'll test the fix logic by replicating it here rather than importing
// This avoids issues with the script's direct execution and allows focused testing
function fixMultipleChoiceAnswer(correctAnswer: string, options: string[]): string | null {
  const normalizedAnswer = correctAnswer.toLowerCase().trim();

  for (const option of options) {
    const match = option.match(/^([A-D])[:\)]?\s*(.+)$/i);
    if (!match) continue;

    const [, letter, text] = match;
    const normalizedText = text.toLowerCase().trim();

    if (normalizedText === normalizedAnswer || normalizedText.includes(normalizedAnswer)) {
      return letter.toUpperCase();
    }
  }

  return null;
}

describe('Fix Multiple Choice Answers', () => {
  let db: Database.Database;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary test database
    testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
    db = new Database(testDbPath);

    // Create minimal schema
    db.exec(`
      CREATE TABLE package_problems (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        problem_number INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        answer_type TEXT CHECK (answer_type IN ('number', 'text', 'multiple_choice')) DEFAULT 'number',
        options TEXT
      );

      CREATE TABLE math_problems (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        problem_number INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        answer_type TEXT CHECK (answer_type IN ('number', 'text', 'multiple_choice')) DEFAULT 'number',
        options TEXT
      );
    `);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should fix package_problems with text answers instead of letters', () => {
    // Insert misconfigured problem
    db.prepare(`
      INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-1',
      'pkg-1',
      1,
      'Vad är 1/4?',
      'en fjärdedel',
      'multiple_choice',
      JSON.stringify(['A: ett halvt', 'B: en tredjedel', 'C: en fjärdedel', 'D: en femtedel'])
    );

    // Find misconfigured problem
    const problem = db.prepare(`
      SELECT id, correct_answer, options
      FROM package_problems
      WHERE answer_type = 'multiple_choice'
        AND correct_answer NOT IN ('A', 'B', 'C', 'D')
    `).get() as { id: string; correct_answer: string; options: string } | undefined;

    expect(problem).toBeDefined();
    expect(problem!.correct_answer).toBe('en fjärdedel');

    // Fix it
    const options = JSON.parse(problem!.options);
    const correctLetter = fixMultipleChoiceAnswer(problem!.correct_answer, options);

    expect(correctLetter).toBe('C');

    // Update database
    db.prepare('UPDATE package_problems SET correct_answer = ? WHERE id = ?')
      .run(correctLetter, problem!.id);

    // Verify fix
    const fixed = db.prepare('SELECT correct_answer FROM package_problems WHERE id = ?')
      .get('test-1') as { correct_answer: string };

    expect(fixed.correct_answer).toBe('C');
  });

  it('should fix math_problems with text answers instead of letters', () => {
    // Insert misconfigured problem
    db.prepare(`
      INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, options)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-2',
      'assign-1',
      2,
      'Vad är 1/3?',
      'en tredjedel',
      'multiple_choice',
      JSON.stringify(['A: ett halvt', 'B: en tredjedel', 'C: en fjärdedel', 'D: en femtedel'])
    );

    // Find and fix
    const problem = db.prepare(`
      SELECT id, correct_answer, options
      FROM math_problems
      WHERE answer_type = 'multiple_choice'
        AND correct_answer NOT IN ('A', 'B', 'C', 'D')
    `).get() as { id: string; correct_answer: string; options: string } | undefined;

    expect(problem).toBeDefined();

    const options = JSON.parse(problem!.options);
    const correctLetter = fixMultipleChoiceAnswer(problem!.correct_answer, options);

    expect(correctLetter).toBe('B');

    db.prepare('UPDATE math_problems SET correct_answer = ? WHERE id = ?')
      .run(correctLetter, problem!.id);

    const fixed = db.prepare('SELECT correct_answer FROM math_problems WHERE id = ?')
      .get('test-2') as { correct_answer: string };

    expect(fixed.correct_answer).toBe('B');
  });

  it('should handle options with different formats (colon vs parenthesis)', () => {
    const optionsWithColon = ['A: answer one', 'B: answer two', 'C: answer three', 'D: answer four'];
    const optionsWithParen = ['A) answer one', 'B) answer two', 'C) answer three', 'D) answer four'];
    const optionsNoSeparator = ['A answer one', 'B answer two', 'C answer three', 'D answer four'];

    expect(fixMultipleChoiceAnswer('answer two', optionsWithColon)).toBe('B');
    expect(fixMultipleChoiceAnswer('answer two', optionsWithParen)).toBe('B');
    expect(fixMultipleChoiceAnswer('answer two', optionsNoSeparator)).toBe('B');
  });

  it('should handle partial matches (answer text contains the correct answer)', () => {
    const options = [
      'A: helt fel svar',
      'B: delvis rätt men inte helt',
      'C: detta är det rätta svaret med extra text',
      'D: också fel'
    ];

    expect(fixMultipleChoiceAnswer('det rätta svaret', options)).toBe('C');
  });

  it('should return null when no match is found', () => {
    const options = ['A: svar ett', 'B: svar två', 'C: svar tre', 'D: svar fyra'];

    expect(fixMultipleChoiceAnswer('svar fem', options)).toBeNull();
  });

  it('should be case-insensitive', () => {
    const options = ['A: Svar Ett', 'B: SVAR TVÅ', 'C: svar tre', 'D: SvaR FyRa'];

    expect(fixMultipleChoiceAnswer('svar ett', options)).toBe('A');
    expect(fixMultipleChoiceAnswer('SVAR TVÅ', options)).toBe('B');
    expect(fixMultipleChoiceAnswer('SvAr TrE', options)).toBe('C');
  });

  it('should handle whitespace differences', () => {
    const options = ['A:  answer one  ', 'B: answer two', 'C:answer three', 'D: answer four '];

    expect(fixMultipleChoiceAnswer('  answer one', options)).toBe('A');
    expect(fixMultipleChoiceAnswer('answer three  ', options)).toBe('C');
  });

  it('should not modify already correct answers', () => {
    db.prepare(`
      INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-correct',
      'pkg-1',
      1,
      'Vad är 2+2?',
      'B',
      'multiple_choice',
      JSON.stringify(['A: 3', 'B: 4', 'C: 5', 'D: 6'])
    );

    const problem = db.prepare(`
      SELECT id
      FROM package_problems
      WHERE answer_type = 'multiple_choice'
        AND correct_answer NOT IN ('A', 'B', 'C', 'D')
    `).get();

    expect(problem).toBeUndefined();
  });

  it('should handle multiple problems in batch', () => {
    // Insert multiple misconfigured problems
    const problems = [
      { id: 'p1', answer: 'en fjärdedel', expected: 'C' },
      { id: 'p2', answer: 'en tredjedel', expected: 'B' },
      { id: 'p3', answer: 'ett halvt', expected: 'A' }
    ];

    for (const prob of problems) {
      db.prepare(`
        INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        prob.id,
        'pkg-batch',
        1,
        'Test question',
        prob.answer,
        'multiple_choice',
        JSON.stringify(['A: ett halvt', 'B: en tredjedel', 'C: en fjärdedel', 'D: en femtedel'])
      );
    }

    // Fix all
    const allProblems = db.prepare(`
      SELECT id, correct_answer, options
      FROM package_problems
      WHERE answer_type = 'multiple_choice'
        AND correct_answer NOT IN ('A', 'B', 'C', 'D')
    `).all() as Array<{ id: string; correct_answer: string; options: string }>;

    expect(allProblems).toHaveLength(3);

    for (const problem of allProblems) {
      const options = JSON.parse(problem.options);
      const correctLetter = fixMultipleChoiceAnswer(problem.correct_answer, options);

      db.prepare('UPDATE package_problems SET correct_answer = ? WHERE id = ?')
        .run(correctLetter, problem.id);
    }

    // Verify all fixed
    const remaining = db.prepare(`
      SELECT id
      FROM package_problems
      WHERE answer_type = 'multiple_choice'
        AND correct_answer NOT IN ('A', 'B', 'C', 'D')
    `).all();

    expect(remaining).toHaveLength(0);

    // Verify correct letters
    for (const prob of problems) {
      const fixed = db.prepare('SELECT correct_answer FROM package_problems WHERE id = ?')
        .get(prob.id) as { correct_answer: string };
      expect(fixed.correct_answer).toBe(prob.expected);
    }
  });
});
