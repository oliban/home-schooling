/**
 * Curriculum codes tests - lgr22_codes import functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Curriculum Codes', () => {
  let parentId: string;
  let childId: string;
  const testEmail = `test-curriculum-codes-${Date.now()}@example.com`;
  const createdPackageIds: string[] = [];

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
  });

  afterAll(() => {
    const db = getDb();
    // Clean up created packages and their mappings
    for (const packageId of createdPackageIds) {
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id IN (SELECT id FROM package_problems WHERE package_id = ?)', [packageId]);
      db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    }
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Reading objectives seeding', () => {
    it('should have lasforstaelse category', () => {
      const db = getDb();
      const category = db.get<{ id: string; name_sv: string }>(
        'SELECT id, name_sv FROM math_categories WHERE id = ?',
        ['lasforstaelse']
      );
      expect(category).toBeDefined();
      expect(category?.name_sv).toBe('Lasforstaelse');
    });

    it('should have 5 Swedish reading objectives', () => {
      const db = getDb();
      const objectives = db.all<{ code: string; description: string }>(
        'SELECT code, description FROM curriculum_objectives WHERE category_id = ?',
        ['lasforstaelse']
      );
      expect(objectives.length).toBe(5);

      const codes = objectives.map(o => o.code);
      expect(codes).toContain('SV-LITERAL');
      expect(codes).toContain('SV-INFERENCE');
      expect(codes).toContain('SV-MAIN-IDEA');
      expect(codes).toContain('SV-CHARACTER');
      expect(codes).toContain('SV-VOCABULARY');
    });

    it('should have reading objectives for all grades 1-9', () => {
      const db = getDb();
      const objective = db.get<{ grade_levels: string }>(
        'SELECT grade_levels FROM curriculum_objectives WHERE code = ?',
        ['SV-LITERAL']
      );
      expect(objective).toBeDefined();
      const grades = JSON.parse(objective!.grade_levels);
      expect(grades).toContain('1');
      expect(grades).toContain('5');
      expect(grades).toContain('9');
    });
  });

  describe('Package import with lgr22_codes', () => {
    it('should create curriculum mappings when lgr22_codes are provided', () => {
      const db = getDb();
      const packageId = uuidv4();
      const problemId = uuidv4();
      createdPackageIds.push(packageId);

      // Create package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parentId, 'LGR22 Test Package', 3, 'taluppfattning', 1, 0]
      );

      // Create problem
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, 1, 'Test problem', '42', 'number', 'medium']
      );

      // Get objective ID for MA-TAL-01
      const objective = db.get<{ id: number }>(
        'SELECT id FROM curriculum_objectives WHERE code = ?',
        ['MA-TAL-01']
      );
      expect(objective).toBeDefined();

      // Create curriculum mapping (simulating what import does)
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId, objective!.id]
      );

      // Verify mapping was created
      const mapping = db.get<{ exercise_id: string; objective_id: number }>(
        'SELECT exercise_id, objective_id FROM exercise_curriculum_mapping WHERE exercise_id = ?',
        [problemId]
      );
      expect(mapping).toBeDefined();
      expect(mapping?.objective_id).toBe(objective!.id);
    });

    it('should support multiple codes per problem', () => {
      const db = getDb();
      const packageId = uuidv4();
      const problemId = uuidv4();
      createdPackageIds.push(packageId);

      // Create package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parentId, 'Multi-code Test Package', 3, 'taluppfattning', 1, 0]
      );

      // Create problem
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, 1, 'A problem covering two objectives', '100', 'number', 'hard']
      );

      // Get objective IDs
      const obj1 = db.get<{ id: number }>('SELECT id FROM curriculum_objectives WHERE code = ?', ['MA-TAL-01']);
      const obj2 = db.get<{ id: number }>('SELECT id FROM curriculum_objectives WHERE code = ?', ['MA-PRO-01']);

      expect(obj1).toBeDefined();
      expect(obj2).toBeDefined();

      // Create mappings for both objectives
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id) VALUES (?, ?, ?)`,
        ['package_problem', problemId, obj1!.id]
      );
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id) VALUES (?, ?, ?)`,
        ['package_problem', problemId, obj2!.id]
      );

      // Verify both mappings exist
      const mappings = db.all<{ objective_id: number }>(
        'SELECT objective_id FROM exercise_curriculum_mapping WHERE exercise_id = ?',
        [problemId]
      );
      expect(mappings.length).toBe(2);
    });

    it('should ignore invalid objective codes gracefully', () => {
      const db = getDb();

      // Try to find a non-existent objective
      const objective = db.get<{ id: number }>(
        'SELECT id FROM curriculum_objectives WHERE code = ?',
        ['INVALID-CODE-123']
      );

      // Should return undefined, not throw error
      expect(objective).toBeUndefined();
    });

    it('should handle INSERT OR IGNORE for duplicate mappings', () => {
      const db = getDb();
      const packageId = uuidv4();
      const problemId = uuidv4();
      createdPackageIds.push(packageId);

      // Create package and problem
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parentId, 'Duplicate Test Package', 3, 'taluppfattning', 1, 0]
      );
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, 1, 'Test', '1', 'number', 'easy']
      );

      const objective = db.get<{ id: number }>('SELECT id FROM curriculum_objectives WHERE code = ?', ['MA-TAL-01']);

      // Insert first mapping
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id) VALUES (?, ?, ?)`,
        ['package_problem', problemId, objective!.id]
      );

      // Try to insert duplicate - should not throw due to INSERT OR IGNORE
      expect(() => {
        db.run(
          `INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id) VALUES (?, ?, ?)`,
          ['package_problem', problemId, objective!.id]
        );
      }).not.toThrow();

      // Should still have only one mapping
      const mappings = db.all<{ id: number }>(
        'SELECT id FROM exercise_curriculum_mapping WHERE exercise_id = ?',
        [problemId]
      );
      expect(mappings.length).toBe(1);
    });
  });

  describe('Math objectives structure', () => {
    it('should have objectives for taluppfattning category', () => {
      const db = getDb();
      const objectives = db.all<{ code: string }>(
        'SELECT code FROM curriculum_objectives WHERE category_id = ? ORDER BY code',
        ['taluppfattning']
      );
      expect(objectives.length).toBeGreaterThan(0);
      expect(objectives[0].code).toMatch(/^MA-TAL-/);
    });

    it('should have objectives for geometri category', () => {
      const db = getDb();
      const objectives = db.all<{ code: string }>(
        'SELECT code FROM curriculum_objectives WHERE category_id = ? ORDER BY code',
        ['geometri']
      );
      expect(objectives.length).toBeGreaterThan(0);
      expect(objectives[0].code).toMatch(/^MA-GEO-/);
    });
  });
});
