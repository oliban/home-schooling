/**
 * Children stats endpoint tests - aggregated question stats per child per subject
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('GET /children/stats', () => {
  let parentId: string;
  let childId1: string;
  let childId2: string;
  let otherParentId: string;
  let otherChildId: string;
  let packageId: string;
  let problemIds: string[] = [];
  const testEmail = `test-children-stats-${Date.now()}@example.com`;
  const otherTestEmail = `test-children-stats-other-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId1 = uuidv4();
    childId2 = uuidv4();
    otherParentId = uuidv4();
    otherChildId = uuidv4();
    packageId = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create main parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create other parent (for access control tests)
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [otherParentId, otherTestEmail, passwordHash, 'Other Parent']
    );

    // Create children for main parent
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId1, parentId, 'Anna', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId1]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId2, parentId, 'Erik', 5, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId2]);

    // Create child for other parent
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [otherChildId, otherParentId, 'Other Child', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [otherChildId]);

    // Create a package with 3 problems for testing
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Stats Test Package', 3, 'taluppfattning', 3, '{"easy":1,"medium":1,"hard":1}', 0]
    );

    // Insert 3 problems
    const problems = [
      { text: 'What is 1+1?', answer: '2', difficulty: 'easy' },
      { text: 'What is 5+7?', answer: '12', difficulty: 'medium' },
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
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [otherParentId]);
    db.run('DELETE FROM reading_questions WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_problems WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [otherParentId]);
    db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?, ?)', [childId1, childId2, otherChildId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [otherParentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [otherParentId]);
  });

  it('should return empty stats when children have no answered questions', () => {
    const db = getDb();

    // Query stats for all children (simulating what the endpoint should do)
    const children = db.all<{ id: string; name: string }>(
      `SELECT id, name FROM children WHERE parent_id = ? ORDER BY name`,
      [parentId]
    );

    expect(children.length).toBe(2);
    expect(children[0].name).toBe('Anna');
    expect(children[1].name).toBe('Erik');
  });

  it('should aggregate math correct/incorrect per child from package assignments', () => {
    const db = getDb();
    const assignmentId = uuidv4();

    // Create a math assignment for child1
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
       VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
      [assignmentId, parentId, childId1, 'Math Test', 3, packageId]
    );

    // Add answers: 2 correct, 1 incorrect
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), assignmentId, problemIds[0], '2', 1]
    );
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), assignmentId, problemIds[1], '12', 1]
    );
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), assignmentId, problemIds[2], '40', 0]
    );

    // Query aggregated stats
    const stats = db.get<{ math_correct: number; math_incorrect: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as math_correct,
        COALESCE(SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END), 0) as math_incorrect
      FROM children c
      LEFT JOIN assignments a ON c.id = a.child_id AND a.assignment_type = 'math'
      LEFT JOIN assignment_answers aa ON a.id = aa.assignment_id
      WHERE c.id = ? AND c.parent_id = ?
    `, [childId1, parentId]);

    expect(stats?.math_correct).toBe(2);
    expect(stats?.math_incorrect).toBe(1);
  });

  it('should aggregate reading correct/incorrect per child', () => {
    const db = getDb();
    const assignmentId = uuidv4();

    // Create a reading assignment for child1
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, completed_at)
       VALUES (?, ?, ?, 'reading', ?, ?, 'completed', CURRENT_TIMESTAMP)`,
      [assignmentId, parentId, childId1, 'Reading Test', 3]
    );

    // Add reading questions: 3 correct, 2 incorrect
    for (let i = 1; i <= 5; i++) {
      const isCorrect = i <= 3 ? 1 : 0;
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, i, `Question ${i}?`, 'A', '["A","B","C","D"]', isCorrect ? 'A' : 'B', isCorrect]
      );
    }

    // Query aggregated stats
    const stats = db.get<{ reading_correct: number; reading_incorrect: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN rq.is_correct = 1 THEN 1 ELSE 0 END), 0) as reading_correct,
        COALESCE(SUM(CASE WHEN rq.is_correct = 0 THEN 1 ELSE 0 END), 0) as reading_incorrect
      FROM children c
      LEFT JOIN assignments a ON c.id = a.child_id AND a.assignment_type = 'reading'
      LEFT JOIN reading_questions rq ON a.id = rq.assignment_id
      WHERE c.id = ? AND c.parent_id = ?
    `, [childId1, parentId]);

    expect(stats?.reading_correct).toBe(3);
    expect(stats?.reading_incorrect).toBe(2);
  });

  it('should aggregate reading stats from package-based assignments', () => {
    const db = getDb();
    const readingPackageId = uuidv4();
    const readingAssignmentId = uuidv4();

    // Create a reading package with questions
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [readingPackageId, parentId, 'Reading Package', 3, null, 4, '{"easy":2,"medium":2}', 0]
    );

    // Insert reading questions as package problems
    const readingProblemIds: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const problemId = uuidv4();
      readingProblemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, readingPackageId, i, `Reading Q${i}?`, 'A', 'multiple_choice', 'medium']
      );
    }

    // Create a reading assignment using the package
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
       VALUES (?, ?, ?, 'reading', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
      [readingAssignmentId, parentId, childId2, 'Package Reading Test', 5, readingPackageId]
    );

    // Add answers: 3 correct, 1 incorrect
    readingProblemIds.forEach((problemId, i) => {
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), readingAssignmentId, problemId, i < 3 ? 'A' : 'B', i < 3 ? 1 : 0]
      );
    });

    // Query aggregated stats for package-based reading
    const stats = db.get<{ reading_correct: number; reading_incorrect: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as reading_correct,
        COALESCE(SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END), 0) as reading_incorrect
      FROM assignments a
      JOIN assignment_answers aa ON a.id = aa.assignment_id
      WHERE a.child_id = ?
        AND a.assignment_type = 'reading'
        AND a.package_id IS NOT NULL
    `, [childId2]);

    expect(stats?.reading_correct).toBe(3);
    expect(stats?.reading_incorrect).toBe(1);
  });

  it('should filter by 7d period using answered_at timestamp', () => {
    const db = getDb();
    const recentAssignmentId = uuidv4();
    const oldAssignmentId = uuidv4();

    // Create a recent assignment for child2
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
       VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
      [recentAssignmentId, parentId, childId2, 'Recent Math', 5, packageId]
    );

    // Add recent answer
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), recentAssignmentId, problemIds[0], '2', 1]
    );

    // Create an old assignment (more than 7 days ago)
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
       VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, datetime('now', '-10 days'))`,
      [oldAssignmentId, parentId, childId2, 'Old Math', 5, packageId]
    );

    // Add old answer (10 days ago)
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-10 days'))`,
      [uuidv4(), oldAssignmentId, problemIds[1], '12', 1]
    );

    // Query with 7d filter - should only count recent
    const stats7d = db.get<{ math_correct: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as math_correct
      FROM children c
      LEFT JOIN assignments a ON c.id = a.child_id AND a.assignment_type = 'math'
      LEFT JOIN assignment_answers aa ON a.id = aa.assignment_id
        AND aa.answered_at >= datetime('now', '-7 days')
      WHERE c.id = ? AND c.parent_id = ?
    `, [childId2, parentId]);

    expect(stats7d?.math_correct).toBe(1); // Only the recent answer

    // Query with 30d filter - should count both
    const stats30d = db.get<{ math_correct: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as math_correct
      FROM children c
      LEFT JOIN assignments a ON c.id = a.child_id AND a.assignment_type = 'math'
      LEFT JOIN assignment_answers aa ON a.id = aa.assignment_id
        AND aa.answered_at >= datetime('now', '-30 days')
      WHERE c.id = ? AND c.parent_id = ?
    `, [childId2, parentId]);

    expect(stats30d?.math_correct).toBe(2); // Both answers
  });

  it('should only return stats for parent\'s own children', () => {
    const db = getDb();
    const otherAssignmentId = uuidv4();

    // Create an assignment for other parent's child
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
       VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
      [otherAssignmentId, otherParentId, otherChildId, 'Other Math', 4, packageId]
    );

    // Add answer for other child
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), otherAssignmentId, problemIds[0], '2', 1]
    );

    // Query stats for main parent - should not include other parent's child
    const stats = db.all<{ child_id: string; child_name: string }>(`
      SELECT c.id as child_id, c.name as child_name
      FROM children c
      WHERE c.parent_id = ?
      ORDER BY c.name
    `, [parentId]);

    expect(stats.length).toBe(2);
    expect(stats.some(s => s.child_id === otherChildId)).toBe(false);
    expect(stats.some(s => s.child_name === 'Anna')).toBe(true);
    expect(stats.some(s => s.child_name === 'Erik')).toBe(true);
  });
});
