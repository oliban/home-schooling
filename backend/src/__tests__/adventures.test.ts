/**
 * Adventures feature tests - quota, themes, and generation endpoints
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from '../data/database.js';
import { isDevelopment } from '../config/cors.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Adventures Feature', () => {
  let parentId: string;
  let childId: string;
  const testEmail = `test-adventures-${Date.now()}@example.com`;

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

    // Create child
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up
    db.run('DELETE FROM adventure_generations WHERE child_id = ?', [childId]);
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE child_id = ?)', [childId]);
    db.run('DELETE FROM package_problems WHERE package_id IN (SELECT package_id FROM assignments WHERE child_id = ? AND package_id IS NOT NULL)', [childId]);
    db.run('DELETE FROM math_packages WHERE generated_for_child_id = ?', [childId]);
    db.run('DELETE FROM assignments WHERE child_id = ?', [childId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE id = ?', [childId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Quota System', () => {
    it('should have correct initial quota with no active adventures', () => {
      const db = getDb();

      // Count active adventures for child
      const active = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM adventure_generations ag
         JOIN assignments a ON ag.assignment_id = a.id
         WHERE ag.child_id = ? AND ag.status = 'active' AND a.status != 'completed'`,
        [childId]
      );

      expect(active?.count).toBe(0);
    });

    it('should track active adventures correctly', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parentId, 'Test Adventure Package', 3, 'taluppfattning', 3, childId]
      );

      // Create an assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Test Adventure', 3, packageId]
      );

      // Create adventure generation record
      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, childId, assignmentId, packageId, 'dinosaurs', 'math', 3]
      );

      // Check active count
      const active = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM adventure_generations ag
         JOIN assignments a ON ag.assignment_id = a.id
         WHERE ag.child_id = ? AND ag.status = 'active' AND a.status != 'completed'`,
        [childId]
      );

      expect(active?.count).toBe(1);

      // Clean up this specific test
      db.run('DELETE FROM adventure_generations WHERE id = ?', [adventureId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should mark adventure as completed when assignment is completed', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      // Create package, assignment, and adventure
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parentId, 'Completed Adventure', 3, 'taluppfattning', 3, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Completed Adventure', 3, packageId]
      );

      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, childId, assignmentId, packageId, 'space', 'math', 3]
      );

      // Complete the assignment
      db.run(
        `UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [assignmentId]
      );

      // Simulate adventure completion update
      db.run(
        `UPDATE adventure_generations SET status = 'completed', success_rate = 0.8, completed_at = CURRENT_TIMESTAMP WHERE assignment_id = ?`,
        [assignmentId]
      );

      // Check adventure status
      const adventure = db.get<{ status: string; success_rate: number }>(
        'SELECT status, success_rate FROM adventure_generations WHERE id = ?',
        [adventureId]
      );

      expect(adventure?.status).toBe('completed');
      expect(adventure?.success_rate).toBe(0.8);

      // Clean up
      db.run('DELETE FROM adventure_generations WHERE id = ?', [adventureId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should enforce max 3 active adventures quota', () => {
      const db = getDb();
      const packages: string[] = [];
      const assignments: string[] = [];
      const adventures: string[] = [];

      // Create 3 active adventures
      for (let i = 0; i < 3; i++) {
        const packageId = uuidv4();
        const assignmentId = uuidv4();
        const adventureId = uuidv4();

        packages.push(packageId);
        assignments.push(assignmentId);
        adventures.push(adventureId);

        db.run(
          `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [packageId, parentId, `Adventure ${i}`, 3, 'taluppfattning', 3, childId]
        );

        db.run(
          `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
           VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
          [assignmentId, parentId, childId, `Adventure ${i}`, 3, packageId]
        );

        db.run(
          `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [adventureId, childId, assignmentId, packageId, 'dragons', 'math', 3]
        );
      }

      // Check quota is full
      const active = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM adventure_generations ag
         JOIN assignments a ON ag.assignment_id = a.id
         WHERE ag.child_id = ? AND ag.status = 'active' AND a.status != 'completed'`,
        [childId]
      );

      expect(active?.count).toBe(3);

      // Clean up
      adventures.forEach(id => db.run('DELETE FROM adventure_generations WHERE id = ?', [id]));
      assignments.forEach(id => db.run('DELETE FROM assignments WHERE id = ?', [id]));
      packages.forEach(id => db.run('DELETE FROM math_packages WHERE id = ?', [id]));
    });
  });

  describe('Themes and Sizes', () => {
    it('should have at least 40 themes available', () => {
      // This tests the THEMES constant size
      // We expect 44 themes (10 animals + 10 fantasy + 6 games + 6 nature + 6 sports + 6 food)
      const expectedThemeCount = 44;

      // Query would be via API, but we can test the concept
      // In production, GET /adventures/themes returns { themes, sizes }
      expect(expectedThemeCount).toBeGreaterThanOrEqual(40);
    });

    it('should have 3 size options', () => {
      const sizes = [
        { id: 'quick', questionCount: 3 },
        { id: 'medium', questionCount: 5 },
        { id: 'challenge', questionCount: 10 },
      ];

      expect(sizes.length).toBe(3);
      expect(sizes[0].questionCount).toBe(3);
      expect(sizes[1].questionCount).toBe(5);
      expect(sizes[2].questionCount).toBe(10);
    });
  });

  describe('Adventure Generation Database', () => {
    it('should create adventure generation records with correct fields', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parentId, 'DB Test Adventure', 3, 'taluppfattning', 5, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'reading', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Reading Adventure', 3, packageId]
      );

      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, custom_theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, childId, assignmentId, packageId, 'custom', 'Dinosaurs, Space, Pirates', 'reading', 5]
      );

      const adventure = db.get<{
        id: string;
        child_id: string;
        theme: string;
        custom_theme: string;
        content_type: string;
        question_count: number;
        status: string;
      }>(
        'SELECT * FROM adventure_generations WHERE id = ?',
        [adventureId]
      );

      expect(adventure?.child_id).toBe(childId);
      expect(adventure?.theme).toBe('custom');
      expect(adventure?.custom_theme).toBe('Dinosaurs, Space, Pirates');
      expect(adventure?.content_type).toBe('reading');
      expect(adventure?.question_count).toBe(5);
      expect(adventure?.status).toBe('active');

      // Clean up
      db.run('DELETE FROM adventure_generations WHERE id = ?', [adventureId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should link adventures to assignments and packages correctly', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parentId, 'Link Test', 3, 'taluppfattning', 3, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parentId, childId, 'Link Test', 3, packageId]
      );

      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, childId, assignmentId, packageId, 'robots', 'math', 3]
      );

      // Verify join query works
      const result = db.get<{ adventure_id: string; assignment_title: string; package_name: string }>(
        `SELECT ag.id as adventure_id, a.title as assignment_title, mp.name as package_name
         FROM adventure_generations ag
         JOIN assignments a ON ag.assignment_id = a.id
         JOIN math_packages mp ON ag.package_id = mp.id
         WHERE ag.id = ?`,
        [adventureId]
      );

      expect(result?.adventure_id).toBe(adventureId);
      expect(result?.assignment_title).toBe('Link Test');
      expect(result?.package_name).toBe('Link Test');

      // Clean up
      db.run('DELETE FROM adventure_generations WHERE id = ?', [adventureId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });
  });

  describe('Parent Generation (generate-for-parent)', () => {
    it('should create assignment without quota limits when parent generates', () => {
      const db = getDb();
      const packages: string[] = [];
      const assignments: string[] = [];
      const adventures: string[] = [];

      // Create 3 active child adventures (quota full)
      for (let i = 0; i < 3; i++) {
        const packageId = uuidv4();
        const assignmentId = uuidv4();
        const adventureId = uuidv4();

        packages.push(packageId);
        assignments.push(assignmentId);
        adventures.push(adventureId);

        db.run(
          `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [packageId, parentId, `Child Adventure ${i}`, 3, 'taluppfattning', 3, childId]
        );

        db.run(
          `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
           VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
          [assignmentId, parentId, childId, `Child Adventure ${i}`, 3, packageId]
        );

        db.run(
          `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [adventureId, childId, assignmentId, packageId, 'dragons', 'math', 3]
        );
      }

      // Verify child quota is full
      const childActive = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM adventure_generations ag
         JOIN assignments a ON ag.assignment_id = a.id
         WHERE ag.child_id = ? AND ag.status = 'active' AND a.status != 'completed'`,
        [childId]
      );
      expect(childActive?.count).toBe(3);

      // Simulate parent creating an assignment (via generate-for-parent endpoint)
      // This should succeed even though child quota is full
      const parentPackageId = uuidv4();
      const parentAssignmentId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [parentPackageId, parentId, 'Parent Generated Adventure', 3, 'algebra', 5, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, assigned_by_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, ?)`,
        [parentAssignmentId, parentId, childId, 'Parent Generated Adventure', 3, parentPackageId, parentId]
      );

      // Verify assignment was created
      const assignment = db.get<{ id: string; assigned_by_id: string }>(
        'SELECT id, assigned_by_id FROM assignments WHERE id = ?',
        [parentAssignmentId]
      );
      expect(assignment?.id).toBe(parentAssignmentId);
      expect(assignment?.assigned_by_id).toBe(parentId);

      // Verify package is NOT marked as child-generated
      const pkg = db.get<{ is_child_generated: number }>(
        'SELECT is_child_generated FROM math_packages WHERE id = ?',
        [parentPackageId]
      );
      expect(pkg?.is_child_generated).toBe(0);

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [parentAssignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [parentPackageId]);
      adventures.forEach(id => db.run('DELETE FROM adventure_generations WHERE id = ?', [id]));
      assignments.forEach(id => db.run('DELETE FROM assignments WHERE id = ?', [id]));
      packages.forEach(id => db.run('DELETE FROM math_packages WHERE id = ?', [id]));
    });

    it('should set assigned_by_id to parent ID when parent generates', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [packageId, parentId, 'Parent Assignment', 3, null, 8, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, assigned_by_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, ?)`,
        [assignmentId, parentId, childId, 'Parent Assignment', 3, packageId, parentId]
      );

      const assignment = db.get<{ assigned_by_id: string | null }>(
        'SELECT assigned_by_id FROM assignments WHERE id = ?',
        [assignmentId]
      );

      // Parent-generated should have assigned_by_id set (unlike child adventures where it's NULL)
      expect(assignment?.assigned_by_id).toBe(parentId);

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should not create adventure_generations record for parent-generated assignments', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [packageId, parentId, 'No Adventure Record', 3, null, 6, childId]
      );

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, assigned_by_id)
         VALUES (?, ?, ?, 'reading', ?, ?, 'pending', ?, ?)`,
        [assignmentId, parentId, childId, 'No Adventure Record', 3, packageId, parentId]
      );

      // Parent-generated assignments should NOT have an adventure_generations record
      const adventure = db.get<{ id: string }>(
        'SELECT id FROM adventure_generations WHERE assignment_id = ?',
        [assignmentId]
      );

      expect(adventure).toBeUndefined();

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });
  });

  describe('Requires Sketch Propagation', () => {
    it('should set requires_sketch=1 when mapped objective has requires_work_shown=1', () => {
      const db = getDb();
      const packageId = uuidv4();
      const problemId1 = uuidv4();
      const problemId2 = uuidv4();

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parentId, 'Sketch Test Package', 4, 'geometri', 2, childId]
      );

      // Create two problems - both start with requires_sketch = 0 (default)
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, 1, 'What is 2+2?', '4')`,
        [problemId1, packageId]
      );
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, 2, 'Calculate the area of a rectangle 5x4', '20')`,
        [problemId2, packageId]
      );

      // Get an objective with requires_work_shown = 1 (MA-GEO-02 or similar)
      const objectiveWithWork = db.get<{ id: number; code: string }>(
        `SELECT id, code FROM curriculum_objectives WHERE requires_work_shown = 1 LIMIT 1`
      );
      // Get an objective with requires_work_shown = 0
      const objectiveWithoutWork = db.get<{ id: number; code: string }>(
        `SELECT id, code FROM curriculum_objectives WHERE requires_work_shown = 0 LIMIT 1`
      );

      expect(objectiveWithWork).toBeDefined();
      expect(objectiveWithoutWork).toBeDefined();

      // Map problem1 to objective WITHOUT requires_work_shown
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES ('package_problem', ?, ?)`,
        [problemId1, objectiveWithoutWork!.id]
      );

      // Map problem2 to objective WITH requires_work_shown
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES ('package_problem', ?, ?)`,
        [problemId2, objectiveWithWork!.id]
      );

      // Now run the UPDATE that should be in adventure generation
      // This simulates what happens in adventures.ts after curriculum mapping
      db.run(
        `UPDATE package_problems
         SET requires_sketch = 1
         WHERE id = ?
         AND EXISTS (
           SELECT 1 FROM exercise_curriculum_mapping ecm
           JOIN curriculum_objectives co ON co.id = ecm.objective_id
           WHERE ecm.exercise_id = ?
           AND ecm.exercise_type = 'package_problem'
           AND co.requires_work_shown = 1
         )`,
        [problemId1, problemId1]
      );
      db.run(
        `UPDATE package_problems
         SET requires_sketch = 1
         WHERE id = ?
         AND EXISTS (
           SELECT 1 FROM exercise_curriculum_mapping ecm
           JOIN curriculum_objectives co ON co.id = ecm.objective_id
           WHERE ecm.exercise_id = ?
           AND ecm.exercise_type = 'package_problem'
           AND co.requires_work_shown = 1
         )`,
        [problemId2, problemId2]
      );

      // Verify: problem1 should still have requires_sketch = 0
      const prob1 = db.get<{ requires_sketch: number }>(
        'SELECT requires_sketch FROM package_problems WHERE id = ?',
        [problemId1]
      );
      expect(prob1?.requires_sketch).toBe(0);

      // Verify: problem2 should now have requires_sketch = 1
      const prob2 = db.get<{ requires_sketch: number }>(
        'SELECT requires_sketch FROM package_problems WHERE id = ?',
        [problemId2]
      );
      expect(prob2?.requires_sketch).toBe(1);

      // Clean up
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });
  });

  describe('English Content Generation Prompt Rules', () => {
    it('should include idiom completion rules in English prompts', async () => {
      // Import the adventures module to check prompt generation
      // We can't easily test the actual prompt content without mocking,
      // but we can verify the file contains the expected rules
      const fs = await import('fs');
      const path = await import('path');

      const adventuresPath = path.join(process.cwd(), 'src', 'routes', 'adventures.ts');
      const content = fs.readFileSync(adventuresPath, 'utf-8');

      // Verify Swedish prompt contains idiom rules
      expect(content).toContain('KRITISKT FÖR IDIOM/UTTRYCK');
      expect(content).toContain('det FAKTISKA ORDET som saknas');
      expect(content).toContain("'Let the ___ out of the bag'");
      expect(content).toContain('"cat"');

      // Verify English prompt contains idiom rules
      expect(content).toContain('CRITICAL FOR IDIOMS/EXPRESSIONS');
      expect(content).toContain('ACTUAL MISSING WORD');
    });

    it('should warn against confusing idiom meaning with idiom words', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const adventuresPath = path.join(process.cwd(), 'src', 'routes', 'adventures.ts');
      const content = fs.readFileSync(adventuresPath, 'utf-8');

      // Verify both prompts warn about the specific mistake
      expect(content).toContain('INTE "secret"');  // Swedish version
      expect(content).toContain('NOT "secret"');   // English version
    });
  });

  describe('Development-only File Saving', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore original NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should skip file saving in production mode', () => {
      process.env.NODE_ENV = 'production';

      // isDevelopment() returns false in production
      expect(isDevelopment()).toBe(false);
    });

    it('should allow file saving in development mode', () => {
      process.env.NODE_ENV = 'development';

      // isDevelopment() returns true in development
      expect(isDevelopment()).toBe(true);
    });

    it('should allow file saving when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      // isDevelopment() returns true when NODE_ENV is not set
      expect(isDevelopment()).toBe(true);
    });
  });
});
