/**
 * Curriculum API tests - coverage calculation, gaps, and recommendations endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Curriculum Coverage Calculation', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let problemIds: string[] = [];
  let objectiveIds: number[] = [];
  const testEmail = `test-curriculum-coverage-${Date.now()}@example.com`;

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

    // Create child with grade_level 3
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);

    // Get some objectives for grade 3 for testing
    const objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%' LIMIT 5`
    );
    objectiveIds = objectives.map(o => o.id);

    // Create a package with 5 problems
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Coverage Test Package', 3, 'taluppfattning', 5, '{"easy":2,"medium":2,"hard":1}', 0]
    );

    // Create 5 problems
    for (let i = 0; i < 5; i++) {
      const problemId = uuidv4();
      problemIds.push(problemId);
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, i + 1, `What is ${i}+${i}?`, String(i * 2), 'number', 'medium']
      );

      // Map each problem to an objective
      if (objectiveIds[i]) {
        db.run(
          `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
           VALUES (?, ?, ?)`,
          ['package_problem', problemId, objectiveIds[i]]
        );
      }
    }
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    for (const problemId of problemIds) {
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id = ?', [problemId]);
    }
    db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Coverage percentage calculation', () => {
    it('should calculate 0% coverage when no objectives are covered', () => {
      const db = getDb();

      // Get all objectives for grade 3
      const totalObjectives = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      // Get covered objectives for child (should be 0)
      const coveredObjectives = db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT objective_id) as count FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      expect(totalObjectives?.count).toBeGreaterThan(0);
      expect(coveredObjectives?.count).toBe(0);

      // Calculate coverage percentage
      const coveragePercentage = totalObjectives!.count > 0
        ? Math.round((coveredObjectives!.count / totalObjectives!.count) * 100)
        : 0;

      expect(coveragePercentage).toBe(0);
    });

    it('should calculate partial coverage correctly', () => {
      const db = getDb();

      // Get total objectives for grade 3
      const totalObjectives = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      // Mark 2 objectives as covered
      if (objectiveIds[0]) {
        db.run(
          `INSERT INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, objectiveIds[0]]
        );
      }
      if (objectiveIds[1]) {
        db.run(
          `INSERT INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, objectiveIds[1]]
        );
      }

      // Get covered count
      const coveredObjectives = db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT objective_id) as count FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      expect(coveredObjectives?.count).toBe(2);

      // Calculate coverage percentage
      const coveragePercentage = totalObjectives!.count > 0
        ? Math.round((coveredObjectives!.count / totalObjectives!.count) * 100)
        : 0;

      // Should be some percentage greater than 0 but less than 100
      expect(coveragePercentage).toBeGreaterThan(0);
      expect(coveragePercentage).toBeLessThan(100);

      // Clean up for other tests
      db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    });

    it('should calculate 100% coverage when all objectives are covered', () => {
      const db = getDb();

      // Get all objectives for grade 3
      const objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      // Mark all as covered
      for (const obj of objectives) {
        db.run(
          `INSERT OR IGNORE INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, obj.id]
        );
      }

      // Get covered count
      const coveredObjectives = db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT objective_id) as count FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      expect(coveredObjectives?.count).toBe(objectives.length);

      // Calculate coverage percentage
      const coveragePercentage = objectives.length > 0
        ? Math.round((coveredObjectives!.count / objectives.length) * 100)
        : 0;

      expect(coveragePercentage).toBe(100);

      // Clean up for other tests
      db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    });

    it('should round coverage percentage to nearest integer', () => {
      // Test the rounding logic
      const testCases = [
        { covered: 1, total: 3, expected: 33 },  // 33.33% -> 33%
        { covered: 2, total: 3, expected: 67 },  // 66.67% -> 67%
        { covered: 1, total: 7, expected: 14 },  // 14.29% -> 14%
        { covered: 3, total: 7, expected: 43 },  // 42.86% -> 43%
      ];

      for (const { covered, total, expected } of testCases) {
        const percentage = Math.round((covered / total) * 100);
        expect(percentage).toBe(expected);
      }
    });
  });

  describe('Coverage via completed assignments', () => {
    let assignmentId: string;

    beforeEach(() => {
      assignmentId = uuidv4();
    });

    afterEach(() => {
      const db = getDb();
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    });

    it('should count objectives as covered when exercises are completed correctly', () => {
      const db = getDb();

      // Create a completed assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Completed Test', 3, packageId]
      );

      // Add correct answers for first 3 problems
      for (let i = 0; i < 3; i++) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [uuidv4(), assignmentId, problemIds[i], String(i * 2), 1]
        );
      }

      // Query objectives covered via exercises
      const coveredViaExercises = db.all<{ objective_id: number }>(
        `SELECT DISTINCT ecm.objective_id
         FROM exercise_curriculum_mapping ecm
         JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
         LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
           AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
         WHERE aa.id IS NOT NULL`,
        [childId]
      );

      // Should have 3 objectives covered (for the 3 correct answers)
      expect(coveredViaExercises.length).toBe(3);
    });

    it('should not count objectives as covered for incorrect answers', () => {
      const db = getDb();

      // Create a completed assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Wrong Answers Test', 3, packageId]
      );

      // Add incorrect answers
      for (let i = 0; i < 3; i++) {
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [uuidv4(), assignmentId, problemIds[i], 'wrong', 0]
        );
      }

      // Query objectives covered via exercises
      const coveredViaExercises = db.all<{ objective_id: number }>(
        `SELECT DISTINCT ecm.objective_id
         FROM exercise_curriculum_mapping ecm
         JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
         LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
           AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
         WHERE aa.id IS NOT NULL`,
        [childId]
      );

      // Should have 0 objectives covered (all answers were incorrect)
      expect(coveredViaExercises.length).toBe(0);
    });

    it('should not count objectives from pending assignments', () => {
      const db = getDb();

      // Create a pending assignment (not completed)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Pending Test', 3, packageId]
      );

      // Query objectives covered via exercises (should only count completed assignments)
      const coveredViaExercises = db.all<{ objective_id: number }>(
        `SELECT DISTINCT ecm.objective_id
         FROM exercise_curriculum_mapping ecm
         JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
         LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
           AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
         WHERE aa.id IS NOT NULL`,
        [childId]
      );

      // Should have 0 objectives covered (assignment is pending)
      expect(coveredViaExercises.length).toBe(0);
    });

    it('should combine coverage from child_curriculum_progress and exercise mappings', () => {
      const db = getDb();

      // Add one objective directly to child_curriculum_progress
      if (objectiveIds[0]) {
        db.run(
          `INSERT INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, objectiveIds[0]]
        );
      }

      // Create a completed assignment for a different objective
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Combined Test', 3, packageId]
      );

      // Add correct answer for the second problem (maps to second objective)
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemIds[1], '2', 1]
      );

      // Query direct progress
      const directProgress = db.all<{ objective_id: number }>(
        `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      // Query exercise-based progress
      const exerciseProgress = db.all<{ objective_id: number }>(
        `SELECT DISTINCT ecm.objective_id
         FROM exercise_curriculum_mapping ecm
         JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
         LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
           AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
         WHERE aa.id IS NOT NULL`,
        [childId]
      );

      // Combine without duplicates
      const allCoveredIds = new Set<number>();
      for (const obj of directProgress) {
        allCoveredIds.add(obj.objective_id);
      }
      for (const obj of exerciseProgress) {
        allCoveredIds.add(obj.objective_id);
      }

      // Should have 2 unique objectives covered
      expect(allCoveredIds.size).toBe(2);
    });
  });

  describe('Category-based coverage grouping', () => {
    it('should group objectives by category correctly', () => {
      const db = getDb();

      // Get objectives grouped by category for grade 3
      const categoryGroups = db.all<{ category_id: string; category_name: string; objective_count: number }>(
        `SELECT co.category_id, mc.name_sv as category_name, COUNT(*) as objective_count
         FROM curriculum_objectives co
         JOIN math_categories mc ON co.category_id = mc.id
         WHERE co.grade_levels LIKE '%"3"%'
         GROUP BY co.category_id
         ORDER BY mc.name_sv`
      );

      expect(categoryGroups.length).toBeGreaterThan(0);

      // Each category should have at least one objective
      for (const group of categoryGroups) {
        expect(group.objective_count).toBeGreaterThan(0);
        expect(group.category_name).toBeDefined();
        expect(group.category_id).toBeDefined();
      }
    });

    it('should calculate coverage percentage per category', () => {
      const db = getDb();

      // Get a category and its objectives
      const category = db.get<{ category_id: string; objective_count: number }>(
        `SELECT co.category_id, COUNT(*) as objective_count
         FROM curriculum_objectives co
         WHERE co.grade_levels LIKE '%"3"%'
         GROUP BY co.category_id
         LIMIT 1`
      );

      if (!category) return;

      // Get objectives for this category
      const objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE category_id = ? AND grade_levels LIKE '%"3"%'`,
        [category.category_id]
      );

      // Mark half of them as covered
      const halfCount = Math.floor(objectives.length / 2);
      for (let i = 0; i < halfCount; i++) {
        db.run(
          `INSERT INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, objectives[i].id]
        );
      }

      // Calculate category coverage
      const coveredInCategory = db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT ccp.objective_id) as count
         FROM child_curriculum_progress ccp
         JOIN curriculum_objectives co ON ccp.objective_id = co.id
         WHERE ccp.child_id = ? AND co.category_id = ?`,
        [childId, category.category_id]
      );

      const expectedPercentage = Math.round((halfCount / objectives.length) * 100);
      const actualPercentage = Math.round((coveredInCategory!.count / objectives.length) * 100);

      expect(actualPercentage).toBe(expectedPercentage);

      // Clean up
      db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    });
  });
});

describe('Curriculum Gap Identification', () => {
  let parentId: string;
  let childId: string;
  let objectiveIds: number[] = [];
  const testEmail = `test-curriculum-gaps-${Date.now()}@example.com`;

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

    // Create child with grade_level 3
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);

    // Get objectives for testing
    const objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%' LIMIT 10`
    );
    objectiveIds = objectives.map(o => o.id);
  });

  afterAll(() => {
    const db = getDb();
    db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  it('should identify all objectives as gaps when nothing is covered', () => {
    const db = getDb();

    // Get all objectives for grade 3
    const allObjectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
    );

    // Get covered objectives
    const coveredObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
      [childId]
    );

    // Ensure no objectives are covered
    expect(coveredObjectives.length).toBe(0);

    // Find gaps
    const coveredIds = new Set(coveredObjectives.map(o => o.objective_id));
    const gaps = allObjectives.filter(obj => !coveredIds.has(obj.id));

    // All objectives should be gaps
    expect(gaps.length).toBe(allObjectives.length);
  });

  it('should correctly identify specific gaps when some objectives are covered', () => {
    const db = getDb();

    // Mark first 3 objectives as covered
    for (let i = 0; i < 3; i++) {
      if (objectiveIds[i]) {
        db.run(
          `INSERT INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, objectiveIds[i]]
        );
      }
    }

    // Get all objectives for grade 3
    const allObjectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
    );

    // Get covered objectives
    const coveredObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
      [childId]
    );

    expect(coveredObjectives.length).toBe(3);

    // Find gaps
    const coveredIds = new Set(coveredObjectives.map(o => o.objective_id));
    const gaps = allObjectives.filter(obj => !coveredIds.has(obj.id));

    // Gaps should be total minus covered
    expect(gaps.length).toBe(allObjectives.length - 3);

    // Verify the covered objectives are NOT in gaps
    for (let i = 0; i < 3; i++) {
      expect(gaps.some(g => g.id === objectiveIds[i])).toBe(false);
    }

    // Clean up
    db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
  });

  it('should return empty gaps array when all objectives are covered', () => {
    const db = getDb();

    // Get all objectives for grade 3
    const allObjectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
    );

    // Mark all as covered
    for (const obj of allObjectives) {
      db.run(
        `INSERT OR IGNORE INTO child_curriculum_progress (child_id, objective_id, completed_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [childId, obj.id]
      );
    }

    // Get covered objectives
    const coveredObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
      [childId]
    );

    // Find gaps
    const coveredIds = new Set(coveredObjectives.map(o => o.objective_id));
    const gaps = allObjectives.filter(obj => !coveredIds.has(obj.id));

    // Should be no gaps
    expect(gaps.length).toBe(0);

    // Clean up
    db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
  });
});

describe('Grade Level Filtering', () => {
  let parentId: string;
  let child1Id: string; // Grade 1
  let child3Id: string; // Grade 3
  let child9Id: string; // Grade 9
  const testEmail = `test-grade-filter-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    child1Id = uuidv4();
    child3Id = uuidv4();
    child9Id = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create children at different grade levels
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child1Id, parentId, 'Grade 1 Child', 1, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child1Id]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child3Id, parentId, 'Grade 3 Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child3Id]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child9Id, parentId, 'Grade 9 Child', 9, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child9Id]);
  });

  afterAll(() => {
    const db = getDb();
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?, ?)', [child1Id, child3Id, child9Id]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  it('should return objectives specific to grade 1', () => {
    const db = getDb();

    const grade1Objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"1"%'`
    );

    expect(grade1Objectives.length).toBeGreaterThan(0);
  });

  it('should return objectives specific to grade 3', () => {
    const db = getDb();

    const grade3Objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
    );

    expect(grade3Objectives.length).toBeGreaterThan(0);
  });

  it('should return objectives specific to grade 9', () => {
    const db = getDb();

    const grade9Objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"9"%'`
    );

    expect(grade9Objectives.length).toBeGreaterThan(0);
  });

  it('should filter objectives correctly based on child grade level', () => {
    const db = getDb();

    // Get child's grade level
    const child = db.get<{ grade_level: number }>(
      'SELECT grade_level FROM children WHERE id = ?',
      [child3Id]
    );

    expect(child?.grade_level).toBe(3);

    // Get objectives for this grade
    const objectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE ?`,
      [`%"${child!.grade_level}"%`]
    );

    expect(objectives.length).toBeGreaterThan(0);
  });

  it('should handle objectives that span multiple grade levels', () => {
    const db = getDb();

    // Some objectives may apply to multiple grades (e.g., ["1", "2", "3"])
    // Check that the same objective can appear in queries for different grades
    const objective = db.get<{ id: number; grade_levels: string }>(
      `SELECT id, grade_levels FROM curriculum_objectives LIMIT 1`
    );

    if (!objective) return;

    const gradeLevels: string[] = JSON.parse(objective.grade_levels);

    // Verify the objective appears in queries for each of its grade levels
    for (const grade of gradeLevels) {
      const found = db.get<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE id = ? AND grade_levels LIKE ?`,
        [objective.id, `%"${grade}"%`]
      );
      expect(found).toBeDefined();
    }
  });

  it('should not return objectives for grades outside the range', () => {
    const db = getDb();

    // Query for an invalid grade level
    const invalidGradeObjectives = db.all<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"99"%'`
    );

    expect(invalidGradeObjectives.length).toBe(0);
  });
});

describe('Curriculum Recommendations', () => {
  let parentId: string;
  let childId: string;
  let packageId: string;
  let problemId: string;
  let objectiveId: number;
  const testEmail = `test-curriculum-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    packageId = uuidv4();
    problemId = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child with grade_level 3
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);

    // Get an objective for grade 3
    const objective = db.get<{ id: number }>(
      `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%' LIMIT 1`
    );
    objectiveId = objective?.id || 1;

    // Create a package with a problem mapped to the objective
    db.run(
      `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageId, parentId, 'Curriculum Test Package', 3, 'taluppfattning', 1, '{"medium":1}', 0]
    );

    // Create a problem
    db.run(
      `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [problemId, packageId, 1, 'What is 2+2?', '4', 'number', 'medium']
    );

    // Map problem to curriculum objective
    db.run(
      `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
       VALUES (?, ?, ?)`,
      ['package_problem', problemId, objectiveId]
    );
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id = ?', [problemId]);
    db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
    db.run('DELETE FROM math_packages WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Recommendations endpoint logic', () => {
    it('should find uncovered objectives for a child', () => {
      const db = getDb();

      // Get all objectives for grade 3
      const objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      expect(objectives.length).toBeGreaterThan(0);

      // Get covered objectives (should be empty since child has no progress)
      const coveredObjectives = db.all<{ objective_id: number }>(
        `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      expect(coveredObjectives.length).toBe(0);

      // All objectives should be gaps
      const gaps = objectives.filter(obj =>
        !coveredObjectives.some(cov => cov.objective_id === obj.id)
      );

      expect(gaps.length).toBe(objectives.length);
    });

    it('should find packages that cover gap objectives', () => {
      const db = getDb();

      // Query packages that cover the test objective
      const packages = db.all<{ package_id: string; package_name: string }>(
        `SELECT DISTINCT mp.id as package_id, mp.name as package_name
         FROM exercise_curriculum_mapping ecm
         JOIN package_problems pp ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
         JOIN math_packages mp ON pp.package_id = mp.id
         WHERE ecm.objective_id = ? AND mp.is_active = 1`,
        [objectiveId]
      );

      expect(packages.length).toBeGreaterThan(0);
      // Check that our test package is among the packages found
      const testPackage = packages.find(p => p.package_name === 'Curriculum Test Package');
      expect(testPackage).toBeDefined();
    });

    it('should return recommendations with packages for gap objectives', () => {
      const db = getDb();

      // Get objectives for grade 3
      const objectives = db.all<{ id: number; code: string; description: string; category_id: string }>(
        `SELECT id, code, description, category_id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      // Get covered objective IDs
      const coveredIds = new Set(
        db.all<{ objective_id: number }>(
          `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
          [childId]
        ).map(o => o.objective_id)
      );

      // Find gaps
      const gaps = objectives.filter(obj => !coveredIds.has(obj.id));

      // For each gap, find packages
      const gapIds = gaps.map(g => g.id);
      const placeholders = gapIds.map(() => '?').join(',');

      const packageMappings = db.all<{ objective_id: number; package_id: string; package_name: string }>(
        `SELECT DISTINCT ecm.objective_id, mp.id as package_id, mp.name as package_name
         FROM exercise_curriculum_mapping ecm
         JOIN package_problems pp ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
         JOIN math_packages mp ON pp.package_id = mp.id
         WHERE ecm.objective_id IN (${placeholders}) AND mp.is_active = 1`,
        gapIds
      );

      // The test objective should have our test package among the mappings
      const testObjectiveMapping = packageMappings.find(
        m => m.objective_id === objectiveId && m.package_name === 'Curriculum Test Package'
      );
      expect(testObjectiveMapping).toBeDefined();
    });

    it('should correctly mark objectives as covered after completing an assignment', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create a completed assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, completed_at)
         VALUES (?, ?, ?, 'math', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)`,
        [assignmentId, parentId, childId, 'Completed Test', 3, packageId]
      );

      // Add a correct answer
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), assignmentId, problemId, '4', 1]
      );

      // Now check if objective is covered via exercise mapping
      const coveredViaExercises = db.all<{ objective_id: number }>(
        `SELECT DISTINCT ecm.objective_id
         FROM exercise_curriculum_mapping ecm
         JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
         LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
           AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
         WHERE aa.id IS NOT NULL`,
        [childId]
      );

      // The objective should now be covered
      expect(coveredViaExercises.some(o => o.objective_id === objectiveId)).toBe(true);

      // Clean up
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });
  });

  describe('Edge cases', () => {
    it('should return empty recommendations when all objectives are covered', () => {
      const db = getDb();

      // Get all objectives for grade 3
      const objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );

      // Mark all objectives as covered
      for (const obj of objectives) {
        db.run(
          `INSERT OR IGNORE INTO child_curriculum_progress (child_id, objective_id, completed_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [childId, obj.id]
        );
      }

      // Get covered objectives
      const coveredObjectives = db.all<{ objective_id: number }>(
        `SELECT DISTINCT objective_id FROM child_curriculum_progress WHERE child_id = ?`,
        [childId]
      );

      // All objectives should be covered
      expect(coveredObjectives.length).toBe(objectives.length);

      // Clean up - remove the added progress so other tests work
      db.run('DELETE FROM child_curriculum_progress WHERE child_id = ?', [childId]);
    });

    it('should handle filtering objectives by grade level correctly', () => {
      const db = getDb();

      // Query objectives for different grade levels
      const grade1Objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"1"%'`
      );

      const grade9Objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"9"%'`
      );

      // Grade 1 and 9 should have different objective counts (some objectives are grade-specific)
      // Both should have some objectives
      expect(grade1Objectives.length).toBeGreaterThan(0);
      expect(grade9Objectives.length).toBeGreaterThan(0);

      // Grade 3 objectives (our test child) should exist
      const grade3Objectives = db.all<{ id: number }>(
        `SELECT id FROM curriculum_objectives WHERE grade_levels LIKE '%"3"%'`
      );
      expect(grade3Objectives.length).toBeGreaterThan(0);
    });
  });
});
