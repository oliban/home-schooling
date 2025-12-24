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
});
