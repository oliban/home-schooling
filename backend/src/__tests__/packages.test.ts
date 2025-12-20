/**
 * Math packages system tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Math Package System', () => {
  let parent1Id: string;
  let parent2Id: string;
  let child1Id: string;
  let child2Id: string;
  let packageId: string;
  const testEmail1 = `test-packages-1-${Date.now()}@example.com`;
  const testEmail2 = `test-packages-2-${Date.now()}@example.com`;

  beforeAll(async () => {
    parent1Id = uuidv4();
    parent2Id = uuidv4();
    child1Id = uuidv4();
    child2Id = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create two parents
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parent1Id, testEmail1, passwordHash, 'Parent One']
    );
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parent2Id, testEmail2, passwordHash, 'Parent Two']
    );

    // Create children - child1 for parent1 (grade 3), child2 for parent2 (grade 4)
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child1Id, parent1Id, 'Child One', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child1Id]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child2Id, parent2Id, 'Child Two', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child2Id]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of dependencies
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id IN (?, ?))', [parent1Id, parent2Id]);
    db.run('DELETE FROM assignments WHERE parent_id IN (?, ?)', [parent1Id, parent2Id]);
    db.run('DELETE FROM package_problems WHERE package_id IN (SELECT id FROM math_packages WHERE parent_id IN (?, ?))', [parent1Id, parent2Id]);
    db.run('DELETE FROM math_packages WHERE parent_id IN (?, ?)', [parent1Id, parent2Id]);
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM children WHERE parent_id IN (?, ?)', [parent1Id, parent2Id]);
    db.run('DELETE FROM parents WHERE id IN (?, ?)', [parent1Id, parent2Id]);
  });

  describe('Package Import', () => {
    it('should import a package with problems', () => {
      const db = getDb();
      packageId = uuidv4();

      // Insert package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, description, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [packageId, parent1Id, 'Test Package', 3, 'taluppfattning', 3, '{"easy":1,"medium":1,"hard":1}', 'Test description', 1]
      );

      // Insert problems
      const problems = [
        { text: 'What is 2+2?', answer: '4', difficulty: 'easy' },
        { text: 'What is 5*5?', answer: '25', difficulty: 'medium' },
        { text: 'What is 12*12?', answer: '144', difficulty: 'hard' }
      ];

      problems.forEach((p, i) => {
        db.run(
          `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), packageId, i + 1, p.text, p.answer, 'number', p.difficulty]
        );
      });

      // Verify package was created
      const pkg = db.get<{ name: string; problem_count: number }>(
        'SELECT name, problem_count FROM math_packages WHERE id = ?',
        [packageId]
      );
      expect(pkg).toBeDefined();
      expect(pkg?.name).toBe('Test Package');
      expect(pkg?.problem_count).toBe(3);

      // Verify problems were created
      const problemCount = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?',
        [packageId]
      );
      expect(problemCount?.count).toBe(3);
    });

    it('should calculate difficulty summary correctly', () => {
      const db = getDb();

      const pkg = db.get<{ difficulty_summary: string }>(
        'SELECT difficulty_summary FROM math_packages WHERE id = ?',
        [packageId]
      );

      const summary = JSON.parse(pkg!.difficulty_summary);
      expect(summary.easy).toBe(1);
      expect(summary.medium).toBe(1);
      expect(summary.hard).toBe(1);
    });
  });

  describe('Package Visibility', () => {
    it('should allow owner to see their own package', () => {
      const db = getDb();

      const pkg = db.get<{ id: string }>(
        `SELECT id FROM math_packages WHERE id = ? AND parent_id = ?`,
        [packageId, parent1Id]
      );

      expect(pkg).toBeDefined();
    });

    it('should allow other parents to see global packages matching their child grade', () => {
      const db = getDb();

      // Parent2 has child in grade 4, package is grade 3, so should NOT see it
      const childGrades = db.all<{ grade_level: number }>(
        'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
        [parent2Id]
      );
      const grades = childGrades.map(c => c.grade_level);

      const pkg = db.get<{ id: string }>(
        `SELECT id FROM math_packages
         WHERE id = ? AND is_global = 1 AND grade_level IN (${grades.map(() => '?').join(',')})`,
        [packageId, ...grades]
      );

      // Grade 4 child should not see grade 3 package
      expect(pkg).toBeUndefined();

      // Add a grade 3 child to parent2
      const child3Id = uuidv4();
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level) VALUES (?, ?, ?, ?)',
        [child3Id, parent2Id, 'Child Three', 3]
      );

      // Now parent2 should see the grade 3 global package
      const updatedGrades = db.all<{ grade_level: number }>(
        'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
        [parent2Id]
      );
      const newGrades = updatedGrades.map(c => c.grade_level);

      const visiblePkg = db.get<{ id: string }>(
        `SELECT id FROM math_packages
         WHERE id = ? AND is_global = 1 AND grade_level IN (${newGrades.map(() => '?').join(',')})`,
        [packageId, ...newGrades]
      );

      expect(visiblePkg).toBeDefined();

      // Cleanup
      db.run('DELETE FROM children WHERE id = ?', [child3Id]);
    });

    it('should not show private packages to other parents', () => {
      const db = getDb();

      // Create a private package
      const privatePackageId = uuidv4();
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [privatePackageId, parent1Id, 'Private Package', 3, 1, 0]
      );

      // Parent2 should not see this package even with a grade 3 child
      const child3Id = uuidv4();
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level) VALUES (?, ?, ?, ?)',
        [child3Id, parent2Id, 'Child Three', 3]
      );

      const childGrades = db.all<{ grade_level: number }>(
        'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
        [parent2Id]
      );
      const grades = childGrades.map(c => c.grade_level);

      const pkg = db.get<{ id: string }>(
        `SELECT id FROM math_packages
         WHERE id = ? AND (parent_id = ? OR (is_global = 1 AND grade_level IN (${grades.map(() => '?').join(',')})))`,
        [privatePackageId, parent2Id, ...grades]
      );

      expect(pkg).toBeUndefined();

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [privatePackageId]);
      db.run('DELETE FROM children WHERE id = ?', [child3Id]);
    });
  });

  describe('Package Assignment', () => {
    it('should create an assignment from a package', () => {
      const db = getDb();

      const assignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parent1Id, child1Id, 'Test Assignment', 3, packageId]
      );

      const assignment = db.get<{ package_id: string; status: string }>(
        'SELECT package_id, status FROM assignments WHERE id = ?',
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.package_id).toBe(packageId);
      expect(assignment?.status).toBe('pending');
    });

    it('should load problems from package for assignment', () => {
      const db = getDb();

      // Get problems for the package-based assignment
      const problems = db.all<{ question_text: string; correct_answer: string }>(
        `SELECT pp.question_text, pp.correct_answer
         FROM assignments a
         JOIN package_problems pp ON pp.package_id = a.package_id
         WHERE a.package_id = ?
         ORDER BY pp.problem_number`,
        [packageId]
      );

      expect(problems.length).toBe(3);
      expect(problems[0].question_text).toBe('What is 2+2?');
      expect(problems[0].correct_answer).toBe('4');
    });
  });

  describe('Package Assignment Type', () => {
    it('should store assignment_type for reading packages', () => {
      const db = getDb();
      const readingPackageId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, assignment_type, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [readingPackageId, parent1Id, 'Robin Hood - Kapitel 1', 3, null, 'reading', 5, 1]
      );

      const pkg = db.get<{ assignment_type: string }>(
        'SELECT assignment_type FROM math_packages WHERE id = ?',
        [readingPackageId]
      );

      expect(pkg?.assignment_type).toBe('reading');

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [readingPackageId]);
    });

    it('should default assignment_type to math when not specified', () => {
      const db = getDb();
      const mathPackageId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count)
         VALUES (?, ?, ?, ?, ?)`,
        [mathPackageId, parent1Id, 'Math Test', 3, 5]
      );

      const pkg = db.get<{ assignment_type: string }>(
        'SELECT assignment_type FROM math_packages WHERE id = ?',
        [mathPackageId]
      );

      expect(pkg?.assignment_type).toBe('math');

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [mathPackageId]);
    });

    it('should create assignment with correct type from reading package', () => {
      const db = getDb();
      const readingPackageId = uuidv4();
      const assignmentId = uuidv4();

      // Create reading package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, assignment_type, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [readingPackageId, parent1Id, 'Läsförståelse Test', 3, 'reading', 5, 1]
      );

      // Get package assignment_type
      const pkg = db.get<{ assignment_type: string }>(
        'SELECT assignment_type FROM math_packages WHERE id = ?',
        [readingPackageId]
      );

      // Create assignment using package's assignment_type
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [assignmentId, parent1Id, child1Id, pkg?.assignment_type || 'math', 'Reading Assignment', 3, readingPackageId]
      );

      const assignment = db.get<{ assignment_type: string }>(
        'SELECT assignment_type FROM assignments WHERE id = ?',
        [assignmentId]
      );

      expect(assignment?.assignment_type).toBe('reading');

      // Cleanup
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [readingPackageId]);
    });
  });

  describe('Package Import Validation', () => {
    it('should require question_text for each problem', () => {
      // This tests the validation logic - problems without question_text should be rejected
      const invalidProblems = [
        { question_text: '', correct_answer: '4' },
        { correct_answer: '4' }, // missing question_text
      ];

      invalidProblems.forEach((p) => {
        const hasValidQuestionText = p.question_text && typeof p.question_text === 'string' && p.question_text.trim();
        expect(hasValidQuestionText).toBeFalsy();
      });
    });

    it('should require correct_answer for each problem', () => {
      const invalidProblems = [
        { question_text: 'What is 2+2?', correct_answer: '' },
        { question_text: 'What is 2+2?' }, // missing correct_answer
      ];

      invalidProblems.forEach((p) => {
        const hasValidAnswer = p.correct_answer && typeof p.correct_answer === 'string' && p.correct_answer.trim();
        expect(hasValidAnswer).toBeFalsy();
      });
    });

    it('should require options array for multiple_choice problems', () => {
      const invalidMCProblems = [
        { question_text: 'Pick one', correct_answer: 'A', answer_type: 'multiple_choice' }, // missing options
        { question_text: 'Pick one', correct_answer: 'A', answer_type: 'multiple_choice', options: [] }, // empty options
        { question_text: 'Pick one', correct_answer: 'A', answer_type: 'multiple_choice', options: ['A'] }, // only 1 option
      ];

      invalidMCProblems.forEach((p) => {
        const hasValidOptions = p.options && Array.isArray(p.options) && p.options.length >= 2;
        expect(hasValidOptions).toBeFalsy();
      });
    });

    it('should accept valid multiple_choice problems', () => {
      const validMCProblem = {
        question_text: 'What is 2+2?',
        correct_answer: 'B',
        answer_type: 'multiple_choice',
        options: ['A: 3', 'B: 4', 'C: 5', 'D: 6']
      };

      const hasValidQuestionText = validMCProblem.question_text && typeof validMCProblem.question_text === 'string' && validMCProblem.question_text.trim();
      const hasValidAnswer = validMCProblem.correct_answer && typeof validMCProblem.correct_answer === 'string' && validMCProblem.correct_answer.trim();
      const hasValidOptions = validMCProblem.options && Array.isArray(validMCProblem.options) && validMCProblem.options.length >= 2;

      expect(hasValidQuestionText).toBeTruthy();
      expect(hasValidAnswer).toBeTruthy();
      expect(hasValidOptions).toBeTruthy();
    });
  });

  describe('Package Soft Delete', () => {
    it('should soft delete a package', () => {
      const db = getDb();

      // Create a package to delete
      const deletePackageId = uuidv4();
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [deletePackageId, parent1Id, 'To Delete', 3, 1, 1]
      );

      // Soft delete
      db.run('UPDATE math_packages SET is_active = 0 WHERE id = ?', [deletePackageId]);

      // Should not appear in active packages
      const pkg = db.get<{ id: string }>(
        'SELECT id FROM math_packages WHERE id = ? AND is_active = 1',
        [deletePackageId]
      );

      expect(pkg).toBeUndefined();

      // But should still exist
      const deletedPkg = db.get<{ is_active: number }>(
        'SELECT is_active FROM math_packages WHERE id = ?',
        [deletePackageId]
      );

      expect(deletedPkg).toBeDefined();
      expect(deletedPkg?.is_active).toBe(0);
    });

    it('should cascade delete assignments when package is deleted', () => {
      const db = getDb();

      // Create a package
      const cascadePackageId = uuidv4();
      const problemId = uuidv4();
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cascadePackageId, parent1Id, 'Cascade Test', 3, 1, 1]
      );

      // Add a problem to the package
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId, cascadePackageId, 1, 'Test question?', '42']
      );

      // Create an assignment from this package
      const assignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parent1Id, child1Id, 'Test Assignment', 3, cascadePackageId]
      );

      // Add an answer to the assignment
      const answerId = uuidv4();
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct)
         VALUES (?, ?, ?, ?, ?)`,
        [answerId, assignmentId, problemId, '42', 1]
      );

      // Verify assignment and answer exist
      expect(db.get('SELECT id FROM assignments WHERE id = ?', [assignmentId])).toBeDefined();
      expect(db.get('SELECT id FROM assignment_answers WHERE id = ?', [answerId])).toBeDefined();

      // Simulate cascade delete (as the API does)
      db.transaction(() => {
        db.run(
          `DELETE FROM assignment_answers
           WHERE assignment_id IN (SELECT id FROM assignments WHERE package_id = ?)`,
          [cascadePackageId]
        );
        db.run('DELETE FROM assignments WHERE package_id = ?', [cascadePackageId]);
        db.run('UPDATE math_packages SET is_active = 0 WHERE id = ?', [cascadePackageId]);
      });

      // Verify assignment and answer are deleted
      expect(db.get('SELECT id FROM assignments WHERE id = ?', [assignmentId])).toBeUndefined();
      expect(db.get('SELECT id FROM assignment_answers WHERE id = ?', [answerId])).toBeUndefined();

      // Package should still exist (soft deleted)
      const deletedPkg = db.get<{ is_active: number }>(
        'SELECT is_active FROM math_packages WHERE id = ?',
        [cascadePackageId]
      );
      expect(deletedPkg?.is_active).toBe(0);
    });
  });
});
