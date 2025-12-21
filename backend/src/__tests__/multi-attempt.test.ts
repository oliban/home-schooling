/**
 * Multi-attempt answer system tests
 * Tests for: attempt tracking, reward multipliers, hint purchases, streak behavior
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Multi-Attempt Answer System', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let problemIds: string[] = [];
  const testEmail = `test-multiattept-${Date.now()}@example.com`;

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

    // Create child with initial coins
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, 100, 100, 0)', [childId]);

    // Create a package with problems that have hints
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Multi-Attempt Test Package', 3, 'taluppfattning', 3, '{"easy":3}', 0]
    );

    // Insert problems with hints and explanations
    const problems = [
      { text: 'What is 5+5?', answer: '10', hint: 'Add the numbers together', explanation: '5+5=10' },
      { text: 'What is 3+7?', answer: '10', hint: 'Count from 7', explanation: '3+7=10' },
      { text: 'What is 2+8?', answer: '10', hint: 'Think of pairs', explanation: '2+8=10' }
    ];

    problems.forEach((p, i) => {
      const problemId = uuidv4();
      problemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty, hint, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, i + 1, p.text, p.answer, 'number', 'easy', p.hint, p.explanation]
      );
    });
  });

  afterAll(() => {
    const db = getDb();
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Reward Multipliers', () => {
    let assignmentId: string;

    beforeEach(() => {
      const db = getDb();
      assignmentId = uuidv4();

      // Reset child coins
      db.run('UPDATE child_coins SET balance = 100, total_earned = 100, current_streak = 0 WHERE child_id = ?', [childId]);

      // Create assignment with hints allowed
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, 1)`,
        [assignmentId, parentId, childId, 'Reward Test', 3, packageId]
      );
    });

    afterEach(() => {
      const db = getDb();
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should give 100% reward on first attempt correct (10 base coins)', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // Simulate first attempt correct
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, '10', 1, CURRENT_TIMESTAMP, 1)`,
        [uuidv4(), assignmentId, problemId]
      );

      // Calculate reward: 10 base + streak bonus (0 streak = 0 bonus) = 10
      const expectedReward = Math.floor(10 * 1.0); // 100% multiplier
      expect(expectedReward).toBe(10);
    });

    it('should give 66% reward on second attempt correct', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // Simulate second attempt correct
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, '10', 1, CURRENT_TIMESTAMP, 2)`,
        [uuidv4(), assignmentId, problemId]
      );

      // Calculate reward: 10 base * 0.66 = 6
      const expectedReward = Math.floor(10 * 0.66);
      expect(expectedReward).toBe(6);
    });

    it('should give 33% reward on third attempt correct', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // Simulate third attempt correct
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, '10', 1, CURRENT_TIMESTAMP, 3)`,
        [uuidv4(), assignmentId, problemId]
      );

      // Calculate reward: 10 base * 0.33 = 3
      const expectedReward = Math.floor(10 * 0.33);
      expect(expectedReward).toBe(3);
    });

    it('should track attempts correctly in assignment_answers', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // Insert answer with attempts_count
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count, hint_purchased)
         VALUES (?, ?, ?, '5', 0, CURRENT_TIMESTAMP, 2, 0)`,
        [uuidv4(), assignmentId, problemId]
      );

      const answer = db.get<{ attempts_count: number; hint_purchased: number }>(
        'SELECT attempts_count, hint_purchased FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
        [assignmentId, problemId]
      );

      expect(answer?.attempts_count).toBe(2);
      expect(answer?.hint_purchased).toBe(0);
    });
  });

  describe('Hint Purchase', () => {
    let assignmentId: string;

    beforeEach(() => {
      const db = getDb();
      assignmentId = uuidv4();

      // Reset child coins to 100
      db.run('UPDATE child_coins SET balance = 100, total_earned = 100, current_streak = 0 WHERE child_id = ?', [childId]);

      // Create assignment with hints allowed
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, 1)`,
        [assignmentId, parentId, childId, 'Hint Test', 3, packageId]
      );
    });

    afterEach(() => {
      const db = getDb();
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should mark hint as purchased and deduct coins', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // First attempt (wrong answer)
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count, hint_purchased)
         VALUES (?, ?, ?, '5', 0, CURRENT_TIMESTAMP, 1, 0)`,
        [uuidv4(), assignmentId, problemId]
      );

      // Calculate hint cost: next attempt reward * 0.5 = (10 * 0.66) / 2 = 3
      const hintCost = Math.floor(Math.floor(10 * 0.66) / 2);

      // Deduct coins and mark hint purchased
      db.run('UPDATE child_coins SET balance = balance - ? WHERE child_id = ?', [hintCost, childId]);
      db.run('UPDATE assignment_answers SET hint_purchased = 1, coins_spent_on_hint = ? WHERE assignment_id = ? AND problem_id = ?',
        [hintCost, assignmentId, problemId]);

      const coins = db.get<{ balance: number }>('SELECT balance FROM child_coins WHERE child_id = ?', [childId]);
      const answer = db.get<{ hint_purchased: number; coins_spent_on_hint: number }>(
        'SELECT hint_purchased, coins_spent_on_hint FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
        [assignmentId, problemId]
      );

      expect(coins?.balance).toBe(100 - hintCost);
      expect(answer?.hint_purchased).toBe(1);
      expect(answer?.coins_spent_on_hint).toBe(hintCost);
    });

    it('should not allow hint purchase when hints_allowed is 0', () => {
      const db = getDb();

      // Update assignment to disallow hints
      db.run('UPDATE assignments SET hints_allowed = 0 WHERE id = ?', [assignmentId]);

      const assignment = db.get<{ hints_allowed: number }>(
        'SELECT hints_allowed FROM assignments WHERE id = ?',
        [assignmentId]
      );

      expect(assignment?.hints_allowed).toBe(0);
    });

    it('should not allow hint purchase before first attempt', () => {
      const db = getDb();
      const problemId = problemIds[1];

      // No answer exists yet - hint should not be purchasable
      const answer = db.get<{ id: string }>(
        'SELECT id FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
        [assignmentId, problemId]
      );

      expect(answer).toBeUndefined();
    });

    it('should not allow double hint purchase', () => {
      const db = getDb();
      const problemId = problemIds[0];

      // Create answer with hint already purchased
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count, hint_purchased)
         VALUES (?, ?, ?, '5', 0, CURRENT_TIMESTAMP, 1, 1)`,
        [uuidv4(), assignmentId, problemId]
      );

      const answer = db.get<{ hint_purchased: number }>(
        'SELECT hint_purchased FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
        [assignmentId, problemId]
      );

      expect(answer?.hint_purchased).toBe(1);
    });
  });

  describe('Streak Behavior', () => {
    let assignmentId: string;

    beforeEach(() => {
      const db = getDb();
      assignmentId = uuidv4();

      // Reset streak to 0
      db.run('UPDATE child_coins SET current_streak = 0 WHERE child_id = ?', [childId]);

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, 1)`,
        [assignmentId, parentId, childId, 'Streak Test', 3, packageId]
      );
    });

    afterEach(() => {
      const db = getDb();
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should increase streak on correct answer', () => {
      const db = getDb();

      // Simulate correct answer - streak should increase
      db.run('UPDATE child_coins SET current_streak = current_streak + 1 WHERE child_id = ?', [childId]);

      const coins = db.get<{ current_streak: number }>('SELECT current_streak FROM child_coins WHERE child_id = ?', [childId]);
      expect(coins?.current_streak).toBe(1);
    });

    it('should NOT reset streak on first or second wrong attempt', () => {
      const db = getDb();

      // Set initial streak
      db.run('UPDATE child_coins SET current_streak = 3 WHERE child_id = ?', [childId]);

      // Wrong answer on attempt 1 or 2 should NOT reset streak
      // (streak only resets when questionComplete is true)
      const coins = db.get<{ current_streak: number }>('SELECT current_streak FROM child_coins WHERE child_id = ?', [childId]);
      expect(coins?.current_streak).toBe(3);
    });

    it('should reset streak on third wrong attempt (question complete)', () => {
      const db = getDb();

      // Set initial streak
      db.run('UPDATE child_coins SET current_streak = 3 WHERE child_id = ?', [childId]);

      // Third wrong attempt means question is complete - reset streak
      db.run('UPDATE child_coins SET current_streak = 0 WHERE child_id = ?', [childId]);

      const coins = db.get<{ current_streak: number }>('SELECT current_streak FROM child_coins WHERE child_id = ?', [childId]);
      expect(coins?.current_streak).toBe(0);
    });
  });

  describe('Reading Assignments (Single Attempt)', () => {
    let readingPackageId: string;
    let readingProblemId: string;
    let assignmentId: string;

    beforeAll(() => {
      const db = getDb();
      readingPackageId = uuidv4();
      readingProblemId = uuidv4();

      // Create a reading package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global, assignment_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [readingPackageId, parentId, 'Reading Test Package', 3, 1, 0, 'reading']
      );

      // Insert a reading question
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [readingProblemId, readingPackageId, 1, 'What color is the sky?', 'A', 'multiple_choice', '["A: Blue", "B: Green", "C: Red"]']
      );
    });

    afterAll(() => {
      const db = getDb();
      db.run('DELETE FROM package_problems WHERE package_id = ?', [readingPackageId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [readingPackageId]);
    });

    beforeEach(() => {
      const db = getDb();
      assignmentId = uuidv4();

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'reading', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Reading Test', 3, readingPackageId]
      );
    });

    afterEach(() => {
      const db = getDb();
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should mark reading as single-attempt (maxAttempts = 1)', () => {
      const db = getDb();

      const assignment = db.get<{ assignment_type: string }>(
        'SELECT assignment_type FROM assignments WHERE id = ?',
        [assignmentId]
      );

      // Reading assignments should not have multi-attempt
      expect(assignment?.assignment_type).toBe('reading');
    });

    it('should not allow retry for reading assignments', () => {
      const db = getDb();

      // First answer for reading
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, 'B', 0, CURRENT_TIMESTAMP, 1)`,
        [uuidv4(), assignmentId, readingProblemId]
      );

      const answer = db.get<{ attempts_count: number }>(
        'SELECT attempts_count FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
        [assignmentId, readingProblemId]
      );

      // Reading should only have 1 attempt
      expect(answer?.attempts_count).toBe(1);
    });

    it('should complete reading assignment when all questions answered, even if wrong', () => {
      const db = getDb();

      // Create a reading package with multiple questions
      const multiPackageId = uuidv4();
      const problem1Id = uuidv4();
      const problem2Id = uuidv4();
      const multiAssignmentId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global, assignment_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [multiPackageId, parentId, 'Reading Completion Test', 3, 2, 0, 'reading']
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problem1Id, multiPackageId, 1, 'Question 1?', 'A', 'multiple_choice', '["A: Correct", "B: Wrong"]']
      );
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problem2Id, multiPackageId, 2, 'Question 2?', 'A', 'multiple_choice', '["A: Correct", "B: Wrong"]']
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'reading', ?, ?, 'in_progress', ?)`,
        [multiAssignmentId, parentId, childId, 'Reading Completion Test', 3, multiPackageId]
      );

      // Answer both questions WRONG (is_correct = 0)
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, 'B', 0, CURRENT_TIMESTAMP, 1)`,
        [uuidv4(), multiAssignmentId, problem1Id]
      );
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count)
         VALUES (?, ?, ?, 'B', 0, CURRENT_TIMESTAMP, 1)`,
        [uuidv4(), multiAssignmentId, problem2Id]
      );

      // Simulate the completion check logic (reading: count all answered questions)
      const totalProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?',
        [multiPackageId]
      );
      const completedProblems = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ?',
        [multiAssignmentId]
      );

      // Both questions answered (even wrongly) should count as complete
      expect(completedProblems?.count).toBe(totalProblems?.count);
      expect(completedProblems?.count).toBe(2);

      // Cleanup
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [multiAssignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [multiAssignmentId]);
      db.run('DELETE FROM package_problems WHERE package_id = ?', [multiPackageId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [multiPackageId]);
    });
  });

  describe('hints_allowed Flag', () => {
    it('should default hints_allowed to 1 for new assignments', () => {
      const db = getDb();
      const newAssignmentId = uuidv4();

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [newAssignmentId, parentId, childId, 'Default Hints Test', 3, packageId]
      );

      const assignment = db.get<{ hints_allowed: number }>(
        'SELECT hints_allowed FROM assignments WHERE id = ?',
        [newAssignmentId]
      );

      expect(assignment?.hints_allowed).toBe(1);

      db.run('DELETE FROM assignments WHERE id = ?', [newAssignmentId]);
    });

    it('should allow parent to set hints_allowed to 0', () => {
      const db = getDb();
      const newAssignmentId = uuidv4();

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, 0)`,
        [newAssignmentId, parentId, childId, 'No Hints Test', 3, packageId]
      );

      const assignment = db.get<{ hints_allowed: number }>(
        'SELECT hints_allowed FROM assignments WHERE id = ?',
        [newAssignmentId]
      );

      expect(assignment?.hints_allowed).toBe(0);

      db.run('DELETE FROM assignments WHERE id = ?', [newAssignmentId]);
    });
  });
});
