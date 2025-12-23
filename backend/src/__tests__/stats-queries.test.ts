/**
 * Stats Query Service tests
 * Tests for the reusable stats query functions extracted from children routes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  getAggregatedStats,
  getStatsByDate,
  getChildStats,
  getChildStatsByDate,
  buildDateFilter,
  type StatsResult,
  type DateStatsResult,
  type ChildStats,
  type ChildStatsByDate
} from '../services/stats-queries.js';

describe('stats-queries service', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let assignmentId1: string; // Package-based math
  let assignmentId2: string; // Legacy math
  let assignmentId3: string; // Package-based reading
  let assignmentId4: string; // Legacy reading
  const testEmail = `test-stats-queries-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    packageId = uuidv4();
    assignmentId1 = uuidv4();
    assignmentId2 = uuidv4();
    assignmentId3 = uuidv4();
    assignmentId4 = uuidv4();

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

    // Create a math package with problems
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global, assignment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Stats Test Package', 3, 'taluppfattning', 3, '{"easy":1,"medium":1,"hard":1}', 0, 'math']
    );

    // Insert problems for the package
    const problemIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const problemId = uuidv4();
      problemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, i + 1, `Problem ${i + 1}`, String(i + 1), 'number', 'easy']
      );
    }

    // Assignment 1: Package-based math (2 correct, 1 incorrect)
    db.run(
      `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assignmentId1, childId, parentId, 'math', 'Math Package Test', 'completed', packageId]
    );
    // Add answers
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId1, problemIds[0], '1', 1]
    );
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId1, problemIds[1], '2', 1]
    );
    db.run(
      `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId1, problemIds[2], 'wrong', 0]
    );

    // Assignment 2: Legacy math (1 correct, 2 incorrect)
    db.run(
      `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [assignmentId2, childId, parentId, 'math', 'Legacy Math Test', 'completed']
    );
    // Add legacy math_problems
    db.run(
      `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId2, 1, '1+1=?', '2', '2', 1]
    );
    db.run(
      `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId2, 2, '2+2=?', '4', '5', 0]
    );
    db.run(
      `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId2, 3, '3+3=?', '6', '7', 0]
    );

    // Assignment 3: Package-based reading (3 correct, 0 incorrect)
    // Create a reading package (category_id can be NULL for reading packages)
    const readingPackageId = uuidv4();
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global, assignment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [readingPackageId, parentId, 'Reading Package', 3, null, 3, '{}', 0, 'reading']
    );
    const readingProblemIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const problemId = uuidv4();
      readingProblemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId, readingPackageId, i + 1, `Reading question ${i + 1}`, 'a', 'multiple_choice']
      );
    }
    db.run(
      `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assignmentId3, childId, parentId, 'reading', 'Reading Package Test', 'completed', readingPackageId]
    );
    for (const problemId of readingProblemIds) {
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [uuidv4(), assignmentId3, problemId, 'a', 1]
      );
    }

    // Assignment 4: Legacy reading (0 correct, 2 incorrect)
    db.run(
      `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [assignmentId4, childId, parentId, 'reading', 'Legacy Reading Test', 'completed']
    );
    db.run(
      `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId4, 1, 'Question 1?', 'a', '["a","b","c","d"]', 'b', 0]
    );
    db.run(
      `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), assignmentId4, 2, 'Question 2?', 'b', '["a","b","c","d"]', 'c', 0]
    );
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM reading_questions WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_problems WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id IN (SELECT id FROM math_packages WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('buildDateFilter', () => {
    it('should return 7-day filter for 7d period', () => {
      const filter = buildDateFilter('7d', 'aa');
      expect(filter).toBe("AND aa.answered_at >= datetime('now', '-7 days')");
    });

    it('should return 30-day filter for 30d period', () => {
      const filter = buildDateFilter('30d', 'mp');
      expect(filter).toBe("AND mp.answered_at >= datetime('now', '-30 days')");
    });

    it('should return empty string for all period', () => {
      const filter = buildDateFilter('all', 'rq');
      expect(filter).toBe('');
    });
  });

  describe('getAggregatedStats', () => {
    it('should return math package-based stats correctly', () => {
      const db = getDb();
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'math',
        dataSource: 'package'
      });

      // 2 correct, 1 incorrect from package-based math assignment
      expect(result.correct).toBe(2);
      expect(result.incorrect).toBe(1);
    });

    it('should return math legacy stats correctly', () => {
      const db = getDb();
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy'
      });

      // 1 correct, 2 incorrect from legacy math assignment
      expect(result.correct).toBe(1);
      expect(result.incorrect).toBe(2);
    });

    it('should return reading package-based stats correctly', () => {
      const db = getDb();
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'reading',
        dataSource: 'package'
      });

      // 3 correct, 0 incorrect from package-based reading assignment
      expect(result.correct).toBe(3);
      expect(result.incorrect).toBe(0);
    });

    it('should return reading legacy stats correctly', () => {
      const db = getDb();
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy'
      });

      // 0 correct, 2 incorrect from legacy reading assignment
      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(2);
    });

    it('should return zeros for non-existent child', () => {
      const db = getDb();
      const result: StatsResult = getAggregatedStats(db, {
        childId: 'non-existent-id',
        subject: 'math',
        dataSource: 'package'
      });

      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(0);
    });

    it('should use COALESCE for null handling', () => {
      const db = getDb();
      // Create a new child with no data
      const emptyChildId = uuidv4();
      const pinHash = '$2a$10$abcdefghijklmnopqrstuv';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [emptyChildId, parentId, 'Empty Child', 1, pinHash]
      );

      const result: StatsResult = getAggregatedStats(db, {
        childId: emptyChildId,
        subject: 'math',
        dataSource: 'package'
      });

      // Should return 0, not null
      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(0);

      // Clean up
      db.run('DELETE FROM children WHERE id = ?', [emptyChildId]);
    });

    it('should apply 7d date filter correctly', () => {
      const db = getDb();

      // Create an old assignment (8 days ago)
      const oldAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [oldAssignmentId, childId, parentId, 'math', 'Old Math Test', 'completed', packageId]
      );

      // Add an old answer (8 days ago)
      const problemId = db.get<{ id: string }>(
        'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
        [packageId]
      )?.id;

      if (problemId) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
          [uuidv4(), oldAssignmentId, problemId, 'old', 1]
        );

        // Query with 7-day filter
        const result: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package',
          dateFilter: buildDateFilter('7d', 'aa')
        });

        // Old answer should be excluded, only 2 correct, 1 incorrect from recent data
        expect(result.correct).toBe(2);
        expect(result.incorrect).toBe(1);

        // Query without filter should include old data
        const resultAll: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package'
        });

        // Should include the old correct answer: 3 correct, 1 incorrect
        expect(resultAll.correct).toBe(3);
        expect(resultAll.incorrect).toBe(1);

        // Clean up
        db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
        db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
      }
    });

    it('should apply 30d date filter correctly', () => {
      const db = getDb();

      // Create an old assignment (31 days ago)
      const oldAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [oldAssignmentId, childId, parentId, 'math', 'Old Math 30d Test', 'completed', packageId]
      );

      // Add an old answer (31 days ago)
      const problemId = db.get<{ id: string }>(
        'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
        [packageId]
      )?.id;

      if (problemId) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-31 days'))`,
          [uuidv4(), oldAssignmentId, problemId, 'old30', 1]
        );

        // Query with 30-day filter - should exclude the 31-day old answer
        const result: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package',
          dateFilter: buildDateFilter('30d', 'aa')
        });

        // Old answer should be excluded, only 2 correct, 1 incorrect from recent data
        expect(result.correct).toBe(2);
        expect(result.incorrect).toBe(1);

        // Query without filter should include old data
        const resultAll: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package'
        });

        // Should include the old correct answer: 3 correct, 1 incorrect
        expect(resultAll.correct).toBe(3);
        expect(resultAll.incorrect).toBe(1);

        // Clean up
        db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
        db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
      }
    });

    it('should include all data when using "all" period filter', () => {
      const db = getDb();

      // Create a very old assignment (100 days ago)
      const veryOldAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [veryOldAssignmentId, childId, parentId, 'math', 'Very Old Math Test', 'completed', packageId]
      );

      // Add a very old answer (100 days ago)
      const problemId = db.get<{ id: string }>(
        'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
        [packageId]
      )?.id;

      if (problemId) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-100 days'))`,
          [uuidv4(), veryOldAssignmentId, problemId, 'veryold', 1]
        );

        // Query with 'all' filter - should include everything
        const resultAll: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package',
          dateFilter: buildDateFilter('all', 'aa')
        });

        // Should include all data: 3 correct (2 recent + 1 very old), 1 incorrect
        expect(resultAll.correct).toBe(3);
        expect(resultAll.incorrect).toBe(1);

        // Query with 7d filter should exclude old data
        const result7d: StatsResult = getAggregatedStats(db, {
          childId,
          subject: 'math',
          dataSource: 'package',
          dateFilter: buildDateFilter('7d', 'aa')
        });

        // Only recent data: 2 correct, 1 incorrect
        expect(result7d.correct).toBe(2);
        expect(result7d.incorrect).toBe(1);

        // Clean up
        db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [veryOldAssignmentId]);
        db.run('DELETE FROM assignments WHERE id = ?', [veryOldAssignmentId]);
      }
    });

    it('should apply date filter to legacy math data source', () => {
      const db = getDb();

      // Create an old legacy assignment (8 days ago)
      const oldLegacyAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oldLegacyAssignmentId, childId, parentId, 'math', 'Old Legacy Math Test', 'completed']
      );

      // Add an old legacy math problem (8 days ago)
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
        [uuidv4(), oldLegacyAssignmentId, 1, 'Old: 5+5=?', '10', '10', 1]
      );

      // Query with 7-day filter on legacy data
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy',
        dateFilter: buildDateFilter('7d', 'mp')
      });

      // Old answer should be excluded, only 1 correct, 2 incorrect from recent legacy data
      expect(result.correct).toBe(1);
      expect(result.incorrect).toBe(2);

      // Query without filter should include old data
      const resultAll: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy'
      });

      // Should include the old correct answer: 2 correct, 2 incorrect
      expect(resultAll.correct).toBe(2);
      expect(resultAll.incorrect).toBe(2);

      // Clean up
      db.run('DELETE FROM math_problems WHERE assignment_id = ?', [oldLegacyAssignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [oldLegacyAssignmentId]);
    });

    it('should apply date filter to legacy reading data source', () => {
      const db = getDb();

      // Create an old legacy reading assignment (8 days ago)
      const oldLegacyAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oldLegacyAssignmentId, childId, parentId, 'reading', 'Old Legacy Reading Test', 'completed']
      );

      // Add an old legacy reading question (8 days ago)
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
        [uuidv4(), oldLegacyAssignmentId, 1, 'Old Reading Q?', 'a', '["a","b","c","d"]', 'a', 1]
      );

      // Query with 7-day filter on legacy reading data
      const result: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy',
        dateFilter: buildDateFilter('7d', 'rq')
      });

      // Old answer should be excluded, only 0 correct, 2 incorrect from recent legacy data
      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(2);

      // Query without filter should include old data
      const resultAll: StatsResult = getAggregatedStats(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy'
      });

      // Should include the old correct answer: 1 correct, 2 incorrect
      expect(resultAll.correct).toBe(1);
      expect(resultAll.incorrect).toBe(2);

      // Clean up
      db.run('DELETE FROM reading_questions WHERE assignment_id = ?', [oldLegacyAssignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [oldLegacyAssignmentId]);
    });
  });

  describe('getStatsByDate', () => {
    it('should return math package-based stats grouped by date', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'package'
      });

      // All package-based math answers were inserted at the same time
      expect(results.length).toBeGreaterThanOrEqual(1);

      // Sum up all results
      const totals = results.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // 2 correct, 1 incorrect from package-based math assignment
      expect(totals.correct).toBe(2);
      expect(totals.incorrect).toBe(1);
    });

    it('should return math legacy stats grouped by date', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy'
      });

      expect(results.length).toBeGreaterThanOrEqual(1);

      const totals = results.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // 1 correct, 2 incorrect from legacy math assignment
      expect(totals.correct).toBe(1);
      expect(totals.incorrect).toBe(2);
    });

    it('should return reading package-based stats grouped by date', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'reading',
        dataSource: 'package'
      });

      expect(results.length).toBeGreaterThanOrEqual(1);

      const totals = results.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // 3 correct, 0 incorrect from package-based reading assignment
      expect(totals.correct).toBe(3);
      expect(totals.incorrect).toBe(0);
    });

    it('should return reading legacy stats grouped by date', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy'
      });

      expect(results.length).toBeGreaterThanOrEqual(1);

      const totals = results.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // 0 correct, 2 incorrect from legacy reading assignment
      expect(totals.correct).toBe(0);
      expect(totals.incorrect).toBe(2);
    });

    it('should return empty array for non-existent child', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId: 'non-existent-id',
        subject: 'math',
        dataSource: 'package'
      });

      expect(results).toEqual([]);
    });

    it('should include date field in results', () => {
      const db = getDb();
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'package'
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const result of results) {
        expect(result.date).toBeDefined();
        expect(typeof result.date).toBe('string');
        // Date should be in YYYY-MM-DD format
        expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should apply date filter when provided', () => {
      const db = getDb();

      // Create an old assignment (8 days ago)
      const oldAssignmentId = uuidv4();
      const packageIdQuery = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      );
      const testPackageId = packageIdQuery?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [oldAssignmentId, childId, parentId, 'math', 'Old Stats Test', 'completed', testPackageId]
        );

        // Add an old answer (8 days ago)
        const problemId = db.get<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
          [testPackageId]
        )?.id;

        if (problemId) {
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
            [uuidv4(), oldAssignmentId, problemId, 'old', 1]
          );

          // Query with 7-day filter
          const filteredResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package',
            dateFilter: buildDateFilter('7d', 'aa')
          });

          // Sum filtered results
          const filteredTotals = filteredResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Old answer should be excluded, only 2 correct, 1 incorrect from recent data
          expect(filteredTotals.correct).toBe(2);
          expect(filteredTotals.incorrect).toBe(1);

          // Query without filter should include old data
          const allResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package'
          });

          const allTotals = allResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Should include the old correct answer: 3 correct, 1 incorrect
          expect(allTotals.correct).toBe(3);
          expect(allTotals.incorrect).toBe(1);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
        }
      }
    });

    it('should group multiple answers on same date together', () => {
      const db = getDb();

      // All test data answers were inserted at datetime('now'), so they should all be on today's date
      const results: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'package'
      });

      // Since all answers were inserted "now", they should be grouped into one date
      // Find today's date in the results
      const today = new Date().toISOString().slice(0, 10);
      const todayResult = results.find(r => r.date === today);

      if (todayResult) {
        // Should have 2 correct and 1 incorrect on today's date
        expect(todayResult.correct).toBe(2);
        expect(todayResult.incorrect).toBe(1);
      }
    });

    it('should apply 30d date filter correctly', () => {
      const db = getDb();

      // Create an old assignment (31 days ago)
      const oldAssignmentId = uuidv4();
      const testPackageId = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      )?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [oldAssignmentId, childId, parentId, 'math', 'Old 30d Stats Test', 'completed', testPackageId]
        );

        const problemId = db.get<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
          [testPackageId]
        )?.id;

        if (problemId) {
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-31 days'))`,
            [uuidv4(), oldAssignmentId, problemId, 'old30d', 1]
          );

          // Query with 30-day filter - should exclude the 31-day old answer
          const filteredResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package',
            dateFilter: buildDateFilter('30d', 'aa')
          });

          const filteredTotals = filteredResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Old answer should be excluded, only 2 correct, 1 incorrect from recent data
          expect(filteredTotals.correct).toBe(2);
          expect(filteredTotals.incorrect).toBe(1);

          // Query without filter should include old data
          const allResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package'
          });

          const allTotals = allResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Should include the old correct answer: 3 correct, 1 incorrect
          expect(allTotals.correct).toBe(3);
          expect(allTotals.incorrect).toBe(1);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
        }
      }
    });

    it('should handle data from multiple different dates', () => {
      const db = getDb();

      // Create assignments with answers on different dates
      const multiDateAssignmentId = uuidv4();
      const testPackageId = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      )?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [multiDateAssignmentId, childId, parentId, 'math', 'Multi Date Test', 'completed', testPackageId]
        );

        const problemIds = db.all<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 3',
          [testPackageId]
        );

        if (problemIds.length >= 3) {
          // Add answers on 3 different dates (2 days ago, 4 days ago, 6 days ago)
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))`,
            [uuidv4(), multiDateAssignmentId, problemIds[0].id, 'day2', 1]
          );
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-4 days'))`,
            [uuidv4(), multiDateAssignmentId, problemIds[1].id, 'day4', 0]
          );
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-6 days'))`,
            [uuidv4(), multiDateAssignmentId, problemIds[2].id, 'day6', 1]
          );

          // Query without filter
          const results: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package'
          });

          // Should have at least 4 dates (today + 3 different days)
          // because original test data is on today
          expect(results.length).toBeGreaterThanOrEqual(4);

          // Verify each date has its own entry
          const dates = results.map(r => r.date);
          const uniqueDates = [...new Set(dates)];
          expect(uniqueDates.length).toBe(results.length);

          // Sum all results
          const totals = results.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Original (2 correct, 1 incorrect) + new (2 correct, 1 incorrect) = 4 correct, 2 incorrect
          expect(totals.correct).toBe(4);
          expect(totals.incorrect).toBe(2);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [multiDateAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [multiDateAssignmentId]);
        }
      }
    });

    it('should apply 7d date filter to legacy math data source', () => {
      const db = getDb();

      // Create an old legacy math assignment (8 days ago)
      const oldLegacyAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oldLegacyAssignmentId, childId, parentId, 'math', 'Old Legacy Math Stats Test', 'completed']
      );

      // Add an old legacy math problem (8 days ago)
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
        [uuidv4(), oldLegacyAssignmentId, 1, 'Old Stats: 5+5=?', '10', '10', 1]
      );

      // Query with 7-day filter on legacy math data
      const filteredResults: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy',
        dateFilter: buildDateFilter('7d', 'mp')
      });

      const filteredTotals = filteredResults.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Old answer should be excluded, only 1 correct, 2 incorrect from recent legacy data
      expect(filteredTotals.correct).toBe(1);
      expect(filteredTotals.incorrect).toBe(2);

      // Query without filter should include old data
      const allResults: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'math',
        dataSource: 'legacy'
      });

      const allTotals = allResults.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Should include the old correct answer: 2 correct, 2 incorrect
      expect(allTotals.correct).toBe(2);
      expect(allTotals.incorrect).toBe(2);

      // Clean up
      db.run('DELETE FROM math_problems WHERE assignment_id = ?', [oldLegacyAssignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [oldLegacyAssignmentId]);
    });

    it('should apply 7d date filter to legacy reading data source', () => {
      const db = getDb();

      // Create an old legacy reading assignment (8 days ago)
      const oldLegacyAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oldLegacyAssignmentId, childId, parentId, 'reading', 'Old Legacy Reading Stats Test', 'completed']
      );

      // Add an old legacy reading question (8 days ago)
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
        [uuidv4(), oldLegacyAssignmentId, 1, 'Old Reading Stats Q?', 'a', '["a","b","c","d"]', 'a', 1]
      );

      // Query with 7-day filter on legacy reading data
      const filteredResults: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy',
        dateFilter: buildDateFilter('7d', 'rq')
      });

      const filteredTotals = filteredResults.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Old answer should be excluded, only 0 correct, 2 incorrect from recent legacy data
      expect(filteredTotals.correct).toBe(0);
      expect(filteredTotals.incorrect).toBe(2);

      // Query without filter should include old data
      const allResults: DateStatsResult[] = getStatsByDate(db, {
        childId,
        subject: 'reading',
        dataSource: 'legacy'
      });

      const allTotals = allResults.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Should include the old correct answer: 1 correct, 2 incorrect
      expect(allTotals.correct).toBe(1);
      expect(allTotals.incorrect).toBe(2);

      // Clean up
      db.run('DELETE FROM reading_questions WHERE assignment_id = ?', [oldLegacyAssignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [oldLegacyAssignmentId]);
    });

    it('should include all data when using "all" period filter', () => {
      const db = getDb();

      // Create a very old assignment (100 days ago)
      const veryOldAssignmentId = uuidv4();
      const testPackageId = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      )?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [veryOldAssignmentId, childId, parentId, 'math', 'Very Old Stats Test', 'completed', testPackageId]
        );

        const problemId = db.get<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
          [testPackageId]
        )?.id;

        if (problemId) {
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-100 days'))`,
            [uuidv4(), veryOldAssignmentId, problemId, 'veryold', 1]
          );

          // Query with 'all' filter - should include everything
          const allResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package',
            dateFilter: buildDateFilter('all', 'aa')
          });

          const allTotals = allResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Should include all data: 3 correct (2 recent + 1 very old), 1 incorrect
          expect(allTotals.correct).toBe(3);
          expect(allTotals.incorrect).toBe(1);

          // Query with 7d filter should exclude very old data
          const filteredResults: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package',
            dateFilter: buildDateFilter('7d', 'aa')
          });

          const filteredTotals = filteredResults.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Only recent data: 2 correct, 1 incorrect
          expect(filteredTotals.correct).toBe(2);
          expect(filteredTotals.incorrect).toBe(1);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [veryOldAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [veryOldAssignmentId]);
        }
      }
    });

    it('should return correct date format for multiple dates', () => {
      const db = getDb();

      // Create an assignment with answers on a specific past date
      const pastDateAssignmentId = uuidv4();
      const testPackageId = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      )?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pastDateAssignmentId, childId, parentId, 'math', 'Past Date Format Test', 'completed', testPackageId]
        );

        const problemId = db.get<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
          [testPackageId]
        )?.id;

        if (problemId) {
          // Insert answer 5 days ago
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-5 days'))`,
            [uuidv4(), pastDateAssignmentId, problemId, 'past5d', 1]
          );

          const results: DateStatsResult[] = getStatsByDate(db, {
            childId,
            subject: 'math',
            dataSource: 'package'
          });

          // All dates should be in YYYY-MM-DD format
          for (const result of results) {
            expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }

          // Should have at least 2 dates (today + 5 days ago)
          expect(results.length).toBeGreaterThanOrEqual(2);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [pastDateAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [pastDateAssignmentId]);
        }
      }
    });
  });

  describe('getChildStats', () => {
    it('should return combined math stats (package + legacy)', () => {
      const db = getDb();
      const result: ChildStats = getChildStats(db, childId);

      // Math: package (2 correct, 1 incorrect) + legacy (1 correct, 2 incorrect) = 3 correct, 3 incorrect
      expect(result.math.correct).toBe(3);
      expect(result.math.incorrect).toBe(3);
    });

    it('should return combined reading stats (package + legacy)', () => {
      const db = getDb();
      const result: ChildStats = getChildStats(db, childId);

      // Reading: package (3 correct, 0 incorrect) + legacy (0 correct, 2 incorrect) = 3 correct, 2 incorrect
      expect(result.reading.correct).toBe(3);
      expect(result.reading.incorrect).toBe(2);
    });

    it('should return zeros for non-existent child', () => {
      const db = getDb();
      const result: ChildStats = getChildStats(db, 'non-existent-id');

      expect(result.math.correct).toBe(0);
      expect(result.math.incorrect).toBe(0);
      expect(result.reading.correct).toBe(0);
      expect(result.reading.incorrect).toBe(0);
    });

    it('should apply period filter when provided', () => {
      const db = getDb();

      // Create an old assignment (8 days ago)
      const oldAssignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [oldAssignmentId, childId, parentId, 'math', 'Old Math Test', 'completed', packageId]
      );

      // Add an old answer (8 days ago)
      const problemId = db.get<{ id: string }>(
        'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
        [packageId]
      )?.id;

      if (problemId) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
          [uuidv4(), oldAssignmentId, problemId, 'old', 1]
        );

        // Query with 7-day filter
        const result: ChildStats = getChildStats(db, childId, '7d');

        // Old answer should be excluded
        // Math: package (2 correct, 1 incorrect) + legacy (1 correct, 2 incorrect) = 3 correct, 3 incorrect
        expect(result.math.correct).toBe(3);
        expect(result.math.incorrect).toBe(3);

        // Query without filter (all) should include old data
        const resultAll: ChildStats = getChildStats(db, childId, 'all');

        // Should include the old correct answer: 4 correct, 3 incorrect
        expect(resultAll.math.correct).toBe(4);
        expect(resultAll.math.incorrect).toBe(3);

        // Clean up
        db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
        db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
      }
    });
  });

  describe('getChildStatsByDate', () => {
    it('should return combined math stats by date (package + legacy merged)', () => {
      const db = getDb();
      const result: ChildStatsByDate = getChildStatsByDate(db, childId);

      // Sum up all math results
      const mathTotals = result.math.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Math: package (2 correct, 1 incorrect) + legacy (1 correct, 2 incorrect) = 3 correct, 3 incorrect
      expect(mathTotals.correct).toBe(3);
      expect(mathTotals.incorrect).toBe(3);
    });

    it('should return combined reading stats by date (package + legacy merged)', () => {
      const db = getDb();
      const result: ChildStatsByDate = getChildStatsByDate(db, childId);

      // Sum up all reading results
      const readingTotals = result.reading.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
        { correct: 0, incorrect: 0 }
      );

      // Reading: package (3 correct, 0 incorrect) + legacy (0 correct, 2 incorrect) = 3 correct, 2 incorrect
      expect(readingTotals.correct).toBe(3);
      expect(readingTotals.incorrect).toBe(2);
    });

    it('should return empty arrays for non-existent child', () => {
      const db = getDb();
      const result: ChildStatsByDate = getChildStatsByDate(db, 'non-existent-id');

      expect(result.math).toEqual([]);
      expect(result.reading).toEqual([]);
    });

    it('should merge package and legacy data on same date', () => {
      const db = getDb();
      const result: ChildStatsByDate = getChildStatsByDate(db, childId);

      // All test data was inserted at 'now', so should be merged into one date entry per subject
      const today = new Date().toISOString().slice(0, 10);

      const todayMath = result.math.find(r => r.date === today);
      if (todayMath) {
        // Package (2 correct, 1 incorrect) + Legacy (1 correct, 2 incorrect) = 3 correct, 3 incorrect
        expect(todayMath.correct).toBe(3);
        expect(todayMath.incorrect).toBe(3);
      }

      const todayReading = result.reading.find(r => r.date === today);
      if (todayReading) {
        // Package (3 correct, 0 incorrect) + Legacy (0 correct, 2 incorrect) = 3 correct, 2 incorrect
        expect(todayReading.correct).toBe(3);
        expect(todayReading.incorrect).toBe(2);
      }
    });

    it('should apply period filter when provided', () => {
      const db = getDb();

      // Create an old assignment (8 days ago)
      const oldAssignmentId = uuidv4();
      const testPackageId = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE parent_id = ? LIMIT 1',
        [parentId]
      )?.id;

      if (testPackageId) {
        db.run(
          `INSERT INTO assignments (id, child_id, parent_id, assignment_type, title, status, package_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [oldAssignmentId, childId, parentId, 'math', 'Old Stats Test', 'completed', testPackageId]
        );

        const problemId = db.get<{ id: string }>(
          'SELECT id FROM package_problems WHERE package_id = ? LIMIT 1',
          [testPackageId]
        )?.id;

        if (problemId) {
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '-8 days'))`,
            [uuidv4(), oldAssignmentId, problemId, 'old', 1]
          );

          // Query with 7-day period filter
          const filteredResult: ChildStatsByDate = getChildStatsByDate(db, childId, '7d');

          const filteredMathTotals = filteredResult.math.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Old answer should be excluded: 3 correct, 3 incorrect
          expect(filteredMathTotals.correct).toBe(3);
          expect(filteredMathTotals.incorrect).toBe(3);

          // Query without filter (all) should include old data
          const allResult: ChildStatsByDate = getChildStatsByDate(db, childId, 'all');

          const allMathTotals = allResult.math.reduce(
            (acc, r) => ({ correct: acc.correct + r.correct, incorrect: acc.incorrect + r.incorrect }),
            { correct: 0, incorrect: 0 }
          );

          // Should include the old correct answer: 4 correct, 3 incorrect
          expect(allMathTotals.correct).toBe(4);
          expect(allMathTotals.incorrect).toBe(3);

          // Clean up
          db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [oldAssignmentId]);
          db.run('DELETE FROM assignments WHERE id = ?', [oldAssignmentId]);
        }
      }
    });
  });
});
