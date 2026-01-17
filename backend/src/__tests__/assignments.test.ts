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

  describe('In-Progress Assignment Status', () => {
    it('should support in_progress status for assignments', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create an in_progress assignment (child started but not finished)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parentId, childId, 'In Progress Test', 3, packageId]
      );

      // Add a partial answer (only 2 of 5 answered)
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[0], '2', 1]
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[1], '5', 0]
      );

      // Query the assignment
      const assignment = db.get<{ id: string; status: string; correct_count: number; total_count: number }>(
        `SELECT a.id, a.status,
         (SELECT COUNT(*) FROM assignment_answers aa WHERE aa.assignment_id = a.id AND aa.is_correct = 1) as correct_count,
         (SELECT COUNT(*) FROM package_problems pp WHERE pp.package_id = a.package_id) as total_count
         FROM assignments a
         WHERE a.id = ?`,
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('in_progress');
      expect(assignment?.correct_count).toBe(1); // 1 correct answer so far
      expect(assignment?.total_count).toBe(5);   // 5 total problems
    });

    it('should be able to filter assignments by in_progress status', () => {
      const db = getDb();
      const inProgressId = uuidv4();
      const pendingId = uuidv4();

      // Create one in_progress assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [inProgressId, parentId, childId, 'Filter In Progress', 3, packageId]
      );

      // Create one pending assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [pendingId, parentId, childId, 'Filter Pending', 3, packageId]
      );

      // Query only in_progress assignments
      const inProgressAssignments = db.all<{ id: string; status: string }>(
        `SELECT id, status FROM assignments WHERE parent_id = ? AND status = ?`,
        [parentId, 'in_progress']
      );

      expect(inProgressAssignments.length).toBeGreaterThanOrEqual(1);
      expect(inProgressAssignments.every(a => a.status === 'in_progress')).toBe(true);

      // Query only pending assignments
      const pendingAssignments = db.all<{ id: string; status: string }>(
        `SELECT id, status FROM assignments WHERE parent_id = ? AND status = ?`,
        [parentId, 'pending']
      );

      expect(pendingAssignments.length).toBeGreaterThanOrEqual(1);
      expect(pendingAssignments.every(a => a.status === 'pending')).toBe(true);
    });

    it('should track partial progress in in_progress assignments', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create an in_progress assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parentId, childId, 'Partial Progress Test', 3, packageId]
      );

      // Add 3 answers out of 5
      const answersToAdd = [
        { problemId: problemIds[0], answer: '2', correct: 1 },
        { problemId: problemIds[1], answer: '4', correct: 1 },
        { problemId: problemIds[2], answer: '15', correct: 0 },
      ];

      for (const ans of answersToAdd) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [uuidv4(), assignmentId, ans.problemId, ans.answer, ans.correct]
        );
      }

      // Count answered questions
      const answeredCount = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ?`,
        [assignmentId]
      );

      // Count total questions
      const totalCount = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?`,
        [packageId]
      );

      expect(answeredCount?.count).toBe(3);
      expect(totalCount?.count).toBe(5);

      // Verify assignment is still in_progress
      const assignment = db.get<{ status: string }>(
        `SELECT status FROM assignments WHERE id = ?`,
        [assignmentId]
      );
      expect(assignment?.status).toBe('in_progress');
    });
  });

  describe('Assignment Completion Logic', () => {
    it('should mark assignment as completed when all problems are answered, even if some are wrong', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create an in_progress assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parentId, childId, 'Completion Test', 3, packageId]
      );

      // Answer all 5 problems: 2 correct, 3 wrong
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[0], '2', 1]  // correct
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[1], '5', 0]  // wrong
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[2], '13', 0] // wrong
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[3], '17', 1] // correct
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[4], '50', 0] // wrong
      );

      // Simulate the completion check logic that happens in the submit endpoint
      const totalProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?',
        [packageId]
      );

      const answeredProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ? AND child_answer IS NOT NULL',
        [assignmentId]
      );

      // Should mark as completed when all are answered
      if (answeredProblems && totalProblems && answeredProblems.count === totalProblems.count) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [assignmentId]
        );
      }

      // Verify assignment is now completed
      const assignment = db.get<{ status: string; completed_at: string | null }>(
        'SELECT status, completed_at FROM assignments WHERE id = ?',
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('completed');
      expect(assignment?.completed_at).not.toBeNull();

      // Verify we still have the correct answer counts
      const correctCount = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ? AND is_correct = 1',
        [assignmentId]
      );
      expect(correctCount?.count).toBe(2); // Only 2 correct out of 5
    });
  });

  describe('Assignment Reordering', () => {
    let reorderAssignmentIds: string[] = [];

    beforeAll(() => {
      const db = getDb();

      // Create 4 assignments for reordering tests
      for (let i = 0; i < 4; i++) {
        const assignmentId = uuidv4();
        reorderAssignmentIds.push(assignmentId);
        db.run(
          `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, created_at)
           VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, datetime('now', '-${3 - i} days'))`,
          [assignmentId, parentId, childId, `Reorder Test ${i + 1}`, 3, packageId]
        );
      }
    });

    afterAll(() => {
      const db = getDb();
      for (const id of reorderAssignmentIds) {
        db.run('DELETE FROM assignments WHERE id = ?', [id]);
      }
    });

    it('should update display_order when reordering assignments', () => {
      const db = getDb();

      // Reorder: reverse the order
      const newOrder = [...reorderAssignmentIds].reverse();

      // Update display_order for each assignment
      newOrder.forEach((id, index) => {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [index, id, parentId]
        );
      });

      // Verify the order was updated
      const assignments = db.all<{ id: string; display_order: number }>(
        'SELECT id, display_order FROM assignments WHERE id IN (?, ?, ?, ?) ORDER BY display_order ASC',
        reorderAssignmentIds
      );

      expect(assignments.length).toBe(4);
      expect(assignments[0].id).toBe(newOrder[0]);
      expect(assignments[1].id).toBe(newOrder[1]);
      expect(assignments[2].id).toBe(newOrder[2]);
      expect(assignments[3].id).toBe(newOrder[3]);
    });

    it('should return assignments ordered by display_order', () => {
      const db = getDb();

      // Set specific order: [2, 0, 3, 1]
      const customOrder = [
        reorderAssignmentIds[2],
        reorderAssignmentIds[0],
        reorderAssignmentIds[3],
        reorderAssignmentIds[1],
      ];

      customOrder.forEach((id, index) => {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ?',
          [index, id]
        );
      });

      // Query with ORDER BY display_order
      const assignments = db.all<{ id: string; title: string; display_order: number }>(
        `SELECT id, title, display_order FROM assignments
         WHERE id IN (?, ?, ?, ?)
         ORDER BY display_order ASC, created_at DESC`,
        reorderAssignmentIds
      );

      expect(assignments[0].id).toBe(customOrder[0]);
      expect(assignments[1].id).toBe(customOrder[1]);
      expect(assignments[2].id).toBe(customOrder[2]);
      expect(assignments[3].id).toBe(customOrder[3]);
    });

    it('should not allow reordering assignments belonging to another parent', () => {
      const db = getDb();
      const otherParentId = uuidv4();

      // Try to update an assignment with wrong parent_id
      const result = db.run(
        'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
        [0, reorderAssignmentIds[0], otherParentId]
      );

      // Should not have updated any rows
      expect(result.changes).toBe(0);
    });

    it('should handle assignments without display_order using created_at fallback', () => {
      const db = getDb();

      // Create assignments without display_order
      const noOrderIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const id = uuidv4();
        noOrderIds.push(id);
        db.run(
          `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, created_at)
           VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, datetime('now', '-${1 - i} hours'))`,
          [id, parentId, childId, `No Order Test ${i + 1}`, 3, packageId]
        );
      }

      // Query - should fallback to created_at DESC when display_order is NULL
      const assignments = db.all<{ id: string; display_order: number | null; created_at: string }>(
        `SELECT id, display_order, created_at FROM assignments
         WHERE id IN (?, ?)
         ORDER BY COALESCE(display_order, 999999) ASC, created_at DESC`,
        noOrderIds
      );

      // Newer assignment (noOrderIds[1]) should come first due to created_at DESC
      expect(assignments[0].id).toBe(noOrderIds[1]);
      expect(assignments[0].display_order).toBeNull();

      // Cleanup
      for (const id of noOrderIds) {
        db.run('DELETE FROM assignments WHERE id = ?', [id]);
      }
    });
  });

  describe('Multiple Choice Validation', () => {
    it('should reject multiple_choice problems without options', () => {
      const db = getDb();

      // Simulate what the POST /api/assignments validation should do
      const problems = [
        {
          question_text: 'What is correct?',
          correct_answer: 'A',
          answer_type: 'multiple_choice',
          options: null, // Invalid - missing options
          difficulty: 'easy'
        }
      ];

      // Validation logic from assignments.ts
      let validationError: string | null = null;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        if (p.answer_type === 'multiple_choice') {
          if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
            validationError = `Problem ${i + 1}: multiple_choice requires options array with at least 2 items`;
            break;
          }
        }
      }

      expect(validationError).toBe('Problem 1: multiple_choice requires options array with at least 2 items');
    });

    it('should reject multiple_choice problems with only one option', () => {
      // Validation logic from assignments.ts
      const problems = [
        {
          question_text: 'What is correct?',
          correct_answer: 'A',
          answer_type: 'multiple_choice',
          options: ['A: Yes'], // Invalid - only one option
          difficulty: 'easy'
        }
      ];

      let validationError: string | null = null;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        if (p.answer_type === 'multiple_choice') {
          if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
            validationError = `Problem ${i + 1}: multiple_choice requires options array with at least 2 items`;
            break;
          }
        }
      }

      expect(validationError).toBe('Problem 1: multiple_choice requires options array with at least 2 items');
    });

    it('should accept multiple_choice problems with valid options', () => {
      // Validation logic from assignments.ts
      const problems = [
        {
          question_text: 'What is correct?',
          correct_answer: 'A',
          answer_type: 'multiple_choice',
          options: ['A: Yes', 'B: No'], // Valid
          difficulty: 'easy'
        }
      ];

      let validationError: string | null = null;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        if (p.answer_type === 'multiple_choice') {
          if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
            validationError = `Problem ${i + 1}: multiple_choice requires options array with at least 2 items`;
            break;
          }
        }
      }

      expect(validationError).toBeNull();
    });

    it('should not validate options for number answer types', () => {
      // Validation logic from assignments.ts
      const problems = [
        {
          question_text: 'What is 2+2?',
          correct_answer: '4',
          answer_type: 'number',
          options: null, // OK for number type
          difficulty: 'easy'
        }
      ];

      let validationError: string | null = null;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        if (p.answer_type === 'multiple_choice') {
          if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
            validationError = `Problem ${i + 1}: multiple_choice requires options array with at least 2 items`;
            break;
          }
        }
      }

      expect(validationError).toBeNull();
    });
  });

  describe('Reading Assignment Coins', () => {
    it('should award coins for correct reading answers (package-based)', () => {
      const db = getDb();

      // Use package-based reading assignment (new system)
      const assignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'reading', ?, ?, 'in_progress', ?)`,
        [assignmentId, parentId, childId, 'Reading Coin Test', 3, packageId]
      );

      // Submit correct answer to first problem
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, attempts_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), assignmentId, problemIds[0], 'A', 1, 1]
      );

      // Award coins (simulating what submit endpoint does)
      db.run(
        'UPDATE child_coins SET balance = balance + 10, total_earned = total_earned + 10 WHERE child_id = ?',
        [childId]
      );

      const coins = db.get<{ balance: number }>('SELECT balance FROM child_coins WHERE child_id = ?', [childId]);
      expect(coins?.balance).toBe(10);

      // Cleanup
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should reset streak for wrong reading answers', () => {
      const db = getDb();

      // Set initial streak
      db.run('UPDATE child_coins SET current_streak = 3 WHERE child_id = ?', [childId]);

      // Reset streak (simulating what submit endpoint does when wrong)
      db.run('UPDATE child_coins SET current_streak = 0 WHERE child_id = ?', [childId]);

      const coins = db.get<{ current_streak: number }>(
        'SELECT current_streak FROM child_coins WHERE child_id = ?',
        [childId]
      );
      expect(coins?.current_streak).toBe(0);
    });
  });
});

/**
 * Tests for unanswerable question handling in completion logic
 *
 * A question is "unanswerable" if it's multiple_choice with invalid options:
 * - NULL options
 * - empty array []
 * - less than 2 options
 *
 * Skipped/corrupted questions should not block assignment completion.
 */
describe('Unanswerable Question Completion Logic', () => {
  // Import the helper function once it's exported
  // For now, we test the behavior through database operations
  let parentId: string;
  let childId: string;
  const testEmail = `test-unanswerable-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent Unanswerable']
    );

    // Create child
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child Unanswerable', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_problems WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM reading_questions WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id IN (SELECT id FROM math_packages WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('isAnswerableQuestion helper', () => {
    // Import the helper for direct testing from the utility file
    it('should return true for number answer types', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('number', null)).toBe(true);
    });

    it('should return true for text answer types', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('text', null)).toBe(true);
    });

    it('should return true for multiple_choice with valid options (2+)', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('multiple_choice', '["A: Yes", "B: No"]')).toBe(true);
      expect(isAnswerableQuestion('multiple_choice', '["A", "B", "C", "D"]')).toBe(true);
    });

    it('should return false for multiple_choice with null options', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('multiple_choice', null)).toBe(false);
    });

    it('should return false for multiple_choice with empty array', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('multiple_choice', '[]')).toBe(false);
    });

    it('should return false for multiple_choice with only 1 option', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('multiple_choice', '["A: Only option"]')).toBe(false);
    });

    it('should return false for multiple_choice with invalid JSON', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion('multiple_choice', 'not valid json')).toBe(false);
    });

    it('should return true for null answer_type (defaults to number)', async () => {
      const { isAnswerableQuestion } = await import('../utils/question-validation.js');
      expect(isAnswerableQuestion(null, null)).toBe(true);
    });
  });

  describe('Package-based assignment completion with corrupted questions', () => {
    it('should mark assignment complete when all ANSWERABLE questions are answered, ignoring corrupted ones', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const problemIds: string[] = [];

      // Create a package with 3 problems: 2 valid, 1 corrupted
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parentId, 'Corrupted Test Package', 3, 'taluppfattning', 3, '{}', 0]
      );

      // Problem 1: valid number type
      const problem1Id = uuidv4();
      problemIds.push(problem1Id);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problem1Id, packageId, 1, 'What is 2+2?', '4', 'number', 'easy']
      );

      // Problem 2: valid multiple_choice
      const problem2Id = uuidv4();
      problemIds.push(problem2Id);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem2Id, packageId, 2, 'Choose A', 'A', 'multiple_choice', '["A: Yes", "B: No"]', 'easy']
      );

      // Problem 3: CORRUPTED - multiple_choice with null options
      const problem3Id = uuidv4();
      problemIds.push(problem3Id);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem3Id, packageId, 3, 'Corrupted question', 'A', 'multiple_choice', null, 'easy']
      );

      // Create assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parentId, childId, 'Test Corrupted Package', 3, packageId]
      );

      // Answer only the 2 answerable problems
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problem1Id, '4', 1]
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problem2Id, 'A', 1]
      );

      // Import and use the completion logic (simulating what submit endpoint does)
      // This tests that the completion check now considers answerable questions only
      const allProblems = db.all<{ answer_type: string | null; options: string | null }>(
        'SELECT answer_type, options FROM package_problems WHERE package_id = ?',
        [packageId]
      );

      // Filter to answerable questions only (this is the new logic we need to implement)
      const isAnswerable = (answerType: string | null, options: string | null): boolean => {
        if (answerType === 'multiple_choice') {
          if (!options) return false;
          try {
            const parsed = JSON.parse(options);
            return Array.isArray(parsed) && parsed.length >= 2;
          } catch {
            return false;
          }
        }
        return true;
      };
      const answerableCount = allProblems.filter(p => isAnswerable(p.answer_type, p.options)).length;

      const answeredProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ? AND child_answer IS NOT NULL',
        [assignmentId]
      );

      // Expect only 2 answerable questions
      expect(answerableCount).toBe(2);
      expect(answeredProblems?.count).toBe(2);

      // The new logic should mark this as complete
      if (answeredProblems && answeredProblems.count >= answerableCount) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [assignmentId]
        );
      }

      // Verify assignment is completed
      const assignment = db.get<{ status: string }>(
        'SELECT status FROM assignments WHERE id = ?',
        [assignmentId]
      );
      expect(assignment?.status).toBe('completed');
    });
  });

  describe('Legacy reading assignment completion with corrupted questions', () => {
    it('should mark assignment complete when all ANSWERABLE reading questions are answered', () => {
      const db = getDb();
      const assignmentId = uuidv4();
      const questionIds: string[] = [];

      // Create a reading assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'reading', ?, ?, 'in_progress')`,
        [assignmentId, parentId, childId, 'Reading Corrupted Test', 3]
      );

      // Question 1: valid options
      const q1Id = uuidv4();
      questionIds.push(q1Id);
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [q1Id, assignmentId, 1, 'Valid question 1', 'A', '["A: Yes", "B: No"]']
      );

      // Question 2: valid options
      const q2Id = uuidv4();
      questionIds.push(q2Id);
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [q2Id, assignmentId, 2, 'Valid question 2', 'B', '["A: First", "B: Second", "C: Third"]']
      );

      // Question 3: CORRUPTED - empty array (no options)
      const q3Id = uuidv4();
      questionIds.push(q3Id);
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [q3Id, assignmentId, 3, 'Corrupted question', 'A', '[]']
      );

      // Question 4: CORRUPTED - only 1 option
      const q4Id = uuidv4();
      questionIds.push(q4Id);
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [q4Id, assignmentId, 4, 'Single option question', 'A', '["A: Only"]']
      );

      // Answer only the 2 answerable questions
      db.run(
        `UPDATE reading_questions SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['A', 1, q1Id]
      );
      db.run(
        `UPDATE reading_questions SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['B', 1, q2Id]
      );

      // Simulate the new completion logic for reading questions
      const allQuestions = db.all<{ options: string | null }>(
        'SELECT options FROM reading_questions WHERE assignment_id = ?',
        [assignmentId]
      );

      const isAnswerableReading = (options: string | null): boolean => {
        if (!options) return false;
        try {
          const parsed = JSON.parse(options);
          return Array.isArray(parsed) && parsed.length >= 2;
        } catch {
          return false;
        }
      };
      const answerableCount = allQuestions.filter(q => isAnswerableReading(q.options)).length;

      const answeredQuestions = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM reading_questions WHERE assignment_id = ? AND child_answer IS NOT NULL',
        [assignmentId]
      );

      // Expect only 2 answerable questions
      expect(answerableCount).toBe(2);
      expect(answeredQuestions?.count).toBe(2);

      // The new logic should mark this as complete
      if (answeredQuestions && answeredQuestions.count >= answerableCount) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [assignmentId]
        );
      }

      // Verify assignment is completed
      const assignment = db.get<{ status: string }>(
        'SELECT status FROM assignments WHERE id = ?',
        [assignmentId]
      );
      expect(assignment?.status).toBe('completed');
    });
  });

  describe('Legacy math assignment completion with corrupted questions', () => {
    it('should mark assignment complete when all ANSWERABLE math problems are answered', () => {
      const db = getDb();
      const assignmentId = uuidv4();
      const problemIds: string[] = [];

      // Create a legacy math assignment (no package_id)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress')`,
        [assignmentId, parentId, childId, 'Math Corrupted Test', 3]
      );

      // Problem 1: valid number type
      const p1Id = uuidv4();
      problemIds.push(p1Id);
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p1Id, assignmentId, 1, 'What is 3+3?', '6', 'number', 'easy']
      );

      // Problem 2: valid text type
      const p2Id = uuidv4();
      problemIds.push(p2Id);
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p2Id, assignmentId, 2, 'Write hello', 'hello', 'text', 'easy']
      );

      // Problem 3: valid multiple_choice
      const p3Id = uuidv4();
      problemIds.push(p3Id);
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, options, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p3Id, assignmentId, 3, 'Choose B', 'B', 'multiple_choice', '["A: Wrong", "B: Right"]', 'easy']
      );

      // Problem 4: CORRUPTED - multiple_choice with null options
      const p4Id = uuidv4();
      problemIds.push(p4Id);
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, options, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p4Id, assignmentId, 4, 'Corrupted MC', 'A', 'multiple_choice', null, 'easy']
      );

      // Problem 5: CORRUPTED - multiple_choice with empty array
      const p5Id = uuidv4();
      problemIds.push(p5Id);
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type, options, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p5Id, assignmentId, 5, 'Empty options MC', 'A', 'multiple_choice', '[]', 'easy']
      );

      // Answer only the 3 answerable problems
      db.run(
        `UPDATE math_problems SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['6', 1, p1Id]
      );
      db.run(
        `UPDATE math_problems SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['hello', 1, p2Id]
      );
      db.run(
        `UPDATE math_problems SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['B', 1, p3Id]
      );

      // Simulate the new completion logic for math problems
      const allProblems = db.all<{ answer_type: string | null; options: string | null }>(
        'SELECT answer_type, options FROM math_problems WHERE assignment_id = ?',
        [assignmentId]
      );

      const isAnswerableMath = (answerType: string | null, options: string | null): boolean => {
        if (answerType === 'multiple_choice') {
          if (!options) return false;
          try {
            const parsed = JSON.parse(options);
            return Array.isArray(parsed) && parsed.length >= 2;
          } catch {
            return false;
          }
        }
        return true;
      };
      const answerableCount = allProblems.filter(p => isAnswerableMath(p.answer_type, p.options)).length;

      const solvedProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM math_problems WHERE assignment_id = ? AND child_answer IS NOT NULL',
        [assignmentId]
      );

      // Expect only 3 answerable problems
      expect(answerableCount).toBe(3);
      expect(solvedProblems?.count).toBe(3);

      // The new logic should mark this as complete
      if (solvedProblems && solvedProblems.count >= answerableCount) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [assignmentId]
        );
      }

      // Verify assignment is completed
      const assignment = db.get<{ status: string }>(
        'SELECT status FROM assignments WHERE id = ?',
        [assignmentId]
      );
      expect(assignment?.status).toBe('completed');
    });
  });
});
