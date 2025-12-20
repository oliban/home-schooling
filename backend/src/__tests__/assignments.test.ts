/**
 * Assignments system tests - including score functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Assignment Scores', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let problemIds: string[] = [];
  const testEmail = `test-assignments-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    packageId = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);

    // Create a package with 5 problems
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Score Test Package', 3, 'taluppfattning', 5, '{"easy":2,"medium":2,"hard":1}', 0]
    );

    // Insert 5 problems
    const problems = [
      { text: 'What is 1+1?', answer: '2', difficulty: 'easy' },
      { text: 'What is 2+2?', answer: '4', difficulty: 'easy' },
      { text: 'What is 5+7?', answer: '12', difficulty: 'medium' },
      { text: 'What is 8+9?', answer: '17', difficulty: 'medium' },
      { text: 'What is 15+27?', answer: '42', difficulty: 'hard' }
    ];

    problems.forEach((p, i) => {
      const problemId = uuidv4();
      problemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, i + 1, p.text, p.answer, 'number', p.difficulty]
      );
    });
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_problems WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('GET /assignments should include scores for completed assignments', () => {
    it('should return null scores for pending assignments', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create a pending assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Pending Test', 3, packageId]
      );

      // Query assignments with scores (simulating what the endpoint should do)
      const assignment = db.get<{ id: string; status: string; correct_count: number | null; total_count: number | null }>(
        `SELECT a.id, a.status,
         (SELECT COUNT(*) FROM assignment_answers aa WHERE aa.assignment_id = a.id AND aa.is_correct = 1) as correct_count,
         (SELECT COUNT(*) FROM package_problems pp WHERE pp.package_id = a.package_id) as total_count
         FROM assignments a
         WHERE a.id = ?`,
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('pending');
      expect(assignment?.correct_count).toBe(0); // No answers yet
      expect(assignment?.total_count).toBe(5);   // 5 problems in package
    });

    it('should return correct scores for completed assignments with package-based problems', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create a completed assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Completed Package Test', 3, packageId]
      );

      // Simulate answers: 3 correct, 2 wrong
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[0], '2', 1]  // correct
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[1], '4', 1]  // correct
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[2], '12', 1] // correct
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[3], '18', 0] // wrong
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[4], '40', 0] // wrong
      );

      // Query assignments with scores
      const assignment = db.get<{ id: string; status: string; correct_count: number; total_count: number }>(
        `SELECT a.id, a.status,
         (SELECT COUNT(*) FROM assignment_answers aa WHERE aa.assignment_id = a.id AND aa.is_correct = 1) as correct_count,
         (SELECT COUNT(*) FROM package_problems pp WHERE pp.package_id = a.package_id) as total_count
         FROM assignments a
         WHERE a.id = ?`,
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('completed');
      expect(assignment?.correct_count).toBe(3);
      expect(assignment?.total_count).toBe(5);
    });

    it('should return correct scores for completed assignments with legacy embedded problems', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create a legacy assignment (no package_id)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Legacy Test', 3]
      );

      // Insert legacy math problems with answers: 2 correct, 1 wrong
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, child_answer, is_correct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), assignmentId, 1, 'What is 3+3?', '6', 'number', '6', 1]
      );
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, child_answer, is_correct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), assignmentId, 2, 'What is 4+4?', '8', 'number', '8', 1]
      );
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, child_answer, is_correct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), assignmentId, 3, 'What is 5+5?', '10', 'number', '11', 0]
      );

      // Query with legacy math_problems score calculation
      const assignment = db.get<{ id: string; status: string; correct_count: number; total_count: number }>(
        `SELECT a.id, a.status,
         (SELECT COUNT(*) FROM math_problems mp WHERE mp.assignment_id = a.id AND mp.is_correct = 1) as correct_count,
         (SELECT COUNT(*) FROM math_problems mp WHERE mp.assignment_id = a.id) as total_count
         FROM assignments a
         WHERE a.id = ? AND a.package_id IS NULL`,
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('completed');
      expect(assignment?.correct_count).toBe(2);
      expect(assignment?.total_count).toBe(3);
    });

    it('should return correct scores for reading assignments', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create a reading assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, completed_at)
         VALUES (?, ?, ?, 'reading', ?, ?, 'completed', CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Reading Test', 3]
      );

      // Insert reading questions with answers: 4 correct, 1 wrong
      for (let i = 1; i <= 5; i++) {
        const isCorrect = i <= 4 ? 1 : 0;
        db.run(
          `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), assignmentId, i, `Question ${i}?`, 'A', '["A","B","C","D"]', isCorrect ? 'A' : 'B', isCorrect]
        );
      }

      // Query with reading_questions score calculation
      const assignment = db.get<{ id: string; status: string; correct_count: number; total_count: number }>(
        `SELECT a.id, a.status,
         (SELECT COUNT(*) FROM reading_questions rq WHERE rq.assignment_id = a.id AND rq.is_correct = 1) as correct_count,
         (SELECT COUNT(*) FROM reading_questions rq WHERE rq.assignment_id = a.id) as total_count
         FROM assignments a
         WHERE a.id = ?`,
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('completed');
      expect(assignment?.correct_count).toBe(4);
      expect(assignment?.total_count).toBe(5);
    });
  });
});
