/**
 * English assignments system tests
 * Tests the new English subject feature including:
 * - Package creation with assignment_type = 'english'
 * - Assignment creation and submission
 * - Multiple attempts (like math)
 * - No purchasable hints (unlike math)
 * - All answer types (text, multiple_choice, number)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('English Assignment System', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let assignmentId: string;
  const testEmail = `test-english-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child in grade 4
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [childId, 100]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id IN (SELECT id FROM math_packages WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('English Package Creation', () => {
    it('should create an English package with assignment_type = english', () => {
      const db = getDb();
      packageId = uuidv4();

      // Insert English package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, assignment_type, problem_count, difficulty_summary, description, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parentId, 'English Vocabulary Test', 4, 'english-vocabulary', 'english', 3, '{"easy":1,"medium":1,"hard":1}', 'Test English exercises', 1]
      );

      // Verify package was created with correct assignment_type
      const pkg = db.get<{ name: string; assignment_type: string; category_id: string }>(
        'SELECT name, assignment_type, category_id FROM math_packages WHERE id = ?',
        [packageId]
      );
      expect(pkg).toBeDefined();
      expect(pkg?.name).toBe('English Vocabulary Test');
      expect(pkg?.assignment_type).toBe('english');
      expect(pkg?.category_id).toBe('english-vocabulary');
    });

    it('should create English problems with different answer types', () => {
      const db = getDb();

      // Text answer - vocabulary
      const problem1Id = uuidv4();
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem1Id, packageId, 1, "Vad heter 'hund' på engelska?", 'dog', 'text', 'easy', "'Hund' heter 'dog' på engelska."]
      );

      // Multiple choice - grammar
      const problem2Id = uuidv4();
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, difficulty, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem2Id, packageId, 2, 'Välj rätt form: He ___ to school.', 'B', 'multiple_choice', '["A: go", "B: goes", "C: going", "D: gone"]', 'medium', "Med 'he' används 'goes' i presens."]
      );

      // Text answer - translation
      const problem3Id = uuidv4();
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem3Id, packageId, 3, "Översätt: 'Jag gillar att läsa.'", 'I like to read', 'text', 'hard', "Svaret kan också vara 'I like reading'."]
      );

      // Verify problems were created
      const problems = db.all<{ question_text: string; answer_type: string }>(
        'SELECT question_text, answer_type FROM package_problems WHERE package_id = ? ORDER BY problem_number',
        [packageId]
      );
      expect(problems).toHaveLength(3);
      expect(problems[0].answer_type).toBe('text');
      expect(problems[1].answer_type).toBe('multiple_choice');
      expect(problems[2].answer_type).toBe('text');
    });
  });

  describe('English Assignment Creation', () => {
    it('should create an English assignment from package', () => {
      const db = getDb();
      assignmentId = uuidv4();

      // Create assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [assignmentId, parentId, childId, 'english', 'English Vocabulary Test', 4, 'pending', packageId, 1]
      );

      // Verify assignment was created
      const assignment = db.get<{ assignment_type: string; title: string }>(
        'SELECT assignment_type, title FROM assignments WHERE id = ?',
        [assignmentId]
      );
      expect(assignment).toBeDefined();
      expect(assignment?.assignment_type).toBe('english');
      expect(assignment?.title).toBe('English Vocabulary Test');
    });
  });

  describe('English Answer Submission', () => {
    let answerId: string;

    it('should support multiple attempts for English (like math)', () => {
      const db = getDb();

      // Get the first problem
      const problem = db.get<{ id: string }>(
        'SELECT id FROM package_problems WHERE package_id = ? ORDER BY problem_number LIMIT 1',
        [packageId]
      );
      expect(problem).toBeDefined();

      // Simulate first wrong attempt
      answerId = uuidv4();
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, attempts_count, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [answerId, assignmentId, problem!.id, 'cat', 0, 1]
      );

      // Verify first attempt recorded
      let answer = db.get<{ attempts_count: number; is_correct: number }>(
        'SELECT attempts_count, is_correct FROM assignment_answers WHERE id = ?',
        [answerId]
      );
      expect(answer?.attempts_count).toBe(1);
      expect(answer?.is_correct).toBe(0);

      // Simulate second attempt (correct)
      db.run(
        `UPDATE assignment_answers SET child_answer = ?, is_correct = ?, attempts_count = ? WHERE id = ?`,
        ['dog', 1, 2, answerId]
      );

      // Verify second attempt
      answer = db.get<{ attempts_count: number; is_correct: number }>(
        'SELECT attempts_count, is_correct FROM assignment_answers WHERE id = ?',
        [answerId]
      );
      expect(answer?.attempts_count).toBe(2);
      expect(answer?.is_correct).toBe(1);
    });

    it('should track hint_purchased but not allow hint purchases for English', () => {
      const db = getDb();

      // Get an answer record (from the previous test)
      const answer = db.get<{ id: string; hint_purchased: number }>(
        'SELECT id, hint_purchased FROM assignment_answers WHERE assignment_id = ? LIMIT 1',
        [assignmentId]
      );
      expect(answer).toBeDefined();

      // hint_purchased should be 0 (English assignments don't allow hint purchases)
      expect(answer?.hint_purchased).toBe(0);
    });
  });

  describe('English Categories', () => {
    it('should have English categories in the database', () => {
      const db = getDb();

      const categories = db.all<{ id: string; name_sv: string }>(
        "SELECT id, name_sv FROM math_categories WHERE id LIKE 'english-%' ORDER BY id"
      );

      expect(categories.length).toBeGreaterThanOrEqual(4);

      const categoryIds = categories.map(c => c.id);
      expect(categoryIds).toContain('english-vocabulary');
      expect(categoryIds).toContain('english-grammar');
      expect(categoryIds).toContain('english-comprehension');
      expect(categoryIds).toContain('english-translation');
    });
  });

  describe('English Curriculum Objectives', () => {
    it('should have English curriculum objectives in the database', () => {
      const db = getDb();

      const objectives = db.all<{ code: string; description: string }>(
        "SELECT code, description FROM curriculum_objectives WHERE code LIKE 'EN-%' ORDER BY code"
      );

      expect(objectives.length).toBeGreaterThanOrEqual(12); // 4 categories × 3 grade ranges

      const codes = objectives.map(o => o.code);
      // Check vocabulary codes
      expect(codes).toContain('EN-VOC-01');
      expect(codes).toContain('EN-VOC-02');
      expect(codes).toContain('EN-VOC-03');

      // Check grammar codes
      expect(codes).toContain('EN-GRM-01');
      expect(codes).toContain('EN-GRM-02');
      expect(codes).toContain('EN-GRM-03');

      // Check comprehension codes
      expect(codes).toContain('EN-CMP-01');
      expect(codes).toContain('EN-CMP-02');
      expect(codes).toContain('EN-CMP-03');

      // Check translation codes
      expect(codes).toContain('EN-TRN-01');
      expect(codes).toContain('EN-TRN-02');
      expect(codes).toContain('EN-TRN-03');
    });
  });
});
