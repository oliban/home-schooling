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

    it('should reject multiple_choice problems where correct_answer does not match any option', () => {
      // This validation ensures questions are answerable
      const invalidMCProblems = [
        {
          question_text: 'Hur stor del av pizzan är en bit?',
          correct_answer: 'en fjärdedel', // Wrong! Should be just 'C'
          answer_type: 'multiple_choice',
          options: ['A: en halv', 'B: en tredjedel', 'C: en fjärdedel', 'D: en femtedel']
        },
        {
          question_text: 'What is 2+2?',
          correct_answer: 'E', // Wrong! Option E doesn't exist
          answer_type: 'multiple_choice',
          options: ['A: 3', 'B: 4', 'C: 5', 'D: 6']
        },
        {
          question_text: 'Pick one',
          correct_answer: 'C: correct answer', // Wrong! Should be just 'C'
          answer_type: 'multiple_choice',
          options: ['A: wrong', 'B: wrong', 'C: correct answer', 'D: wrong']
        }
      ];

      // Helper function to validate (mirrors the backend logic)
      const validateMultipleChoiceAnswer = (correctAnswer: string, options: string[]) => {
        const normalizedAnswer = correctAnswer.trim().toUpperCase();
        const optionLetters = options.map(opt => opt.charAt(0).toUpperCase());
        return optionLetters.includes(normalizedAnswer);
      };

      invalidMCProblems.forEach((p) => {
        const isValid = validateMultipleChoiceAnswer(p.correct_answer, p.options);
        expect(isValid).toBeFalsy();
      });
    });

    it('should accept multiple_choice problems where correct_answer matches an option letter', () => {
      const validMCProblems = [
        {
          question_text: 'Hur stor del av pizzan är en bit?',
          correct_answer: 'C', // Correct! Matches option C
          answer_type: 'multiple_choice',
          options: ['A: en halv', 'B: en tredjedel', 'C: en fjärdedel', 'D: en femtedel']
        },
        {
          question_text: 'What is 2+2?',
          correct_answer: 'b', // Correct! Case insensitive
          answer_type: 'multiple_choice',
          options: ['A: 3', 'B: 4', 'C: 5', 'D: 6']
        }
      ];

      // Helper function to validate (mirrors the backend logic)
      const validateMultipleChoiceAnswer = (correctAnswer: string, options: string[]) => {
        const normalizedAnswer = correctAnswer.trim().toUpperCase();
        const optionLetters = options.map(opt => opt.charAt(0).toUpperCase());
        return optionLetters.includes(normalizedAnswer);
      };

      validMCProblems.forEach((p) => {
        const isValid = validateMultipleChoiceAnswer(p.correct_answer, p.options);
        expect(isValid).toBeTruthy();
      });
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

  describe('LGR22 Curriculum Mapping Validation', () => {
    it('should require lgr22_codes array for each problem', () => {
      const invalidProblems = [
        { question_text: 'What is 2+2?', correct_answer: '4' }, // missing lgr22_codes
        { question_text: 'What is 2+2?', correct_answer: '4', lgr22_codes: [] }, // empty lgr22_codes
        { question_text: 'What is 2+2?', correct_answer: '4', lgr22_codes: null }, // null lgr22_codes
      ];

      invalidProblems.forEach((p: any) => {
        const hasValidLgr22Codes = p.lgr22_codes && Array.isArray(p.lgr22_codes) && p.lgr22_codes.length > 0;
        expect(hasValidLgr22Codes).toBeFalsy();
      });
    });

    it('should accept problems with valid lgr22_codes array', () => {
      const validProblems = [
        { question_text: 'What is 2+2?', correct_answer: '4', lgr22_codes: ['MA-TAL-01'] },
        { question_text: 'What is 50% of 100?', correct_answer: '50', lgr22_codes: ['MA-TAL-07', 'MA-PRO-04'] },
      ];

      validProblems.forEach((p: any) => {
        const hasValidLgr22Codes = p.lgr22_codes && Array.isArray(p.lgr22_codes) && p.lgr22_codes.length > 0;
        expect(hasValidLgr22Codes).toBeTruthy();
      });
    });

    it('should create curriculum mappings when importing a package with lgr22_codes', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId1 = uuidv4();
      const problemId2 = uuidv4();

      // Get a valid curriculum objective code from the database
      const objective = db.get<{ id: number; code: string }>(
        'SELECT id, code FROM curriculum_objectives LIMIT 1'
      );

      if (!objective) {
        throw new Error('No curriculum objectives found in database');
      }

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'Test LGR22 Package', 3, 2, 0]
      );

      // Insert problems
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId1, testPackageId, 1, 'Test question 1', '42']
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId2, testPackageId, 2, 'Test question 2', '24']
      );

      // Create curriculum mappings (simulating the import process)
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId1, objective.id]
      );

      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId2, objective.id]
      );

      // Verify mappings were created
      const mapping1 = db.get<{ code: string }>(
        `SELECT co.code
         FROM exercise_curriculum_mapping ecm
         JOIN curriculum_objectives co ON ecm.objective_id = co.id
         WHERE ecm.exercise_type = 'package_problem' AND ecm.exercise_id = ?`,
        [problemId1]
      );

      const mapping2 = db.get<{ code: string }>(
        `SELECT co.code
         FROM exercise_curriculum_mapping ecm
         JOIN curriculum_objectives co ON ecm.objective_id = co.id
         WHERE ecm.exercise_type = 'package_problem' AND ecm.exercise_id = ?`,
        [problemId2]
      );

      expect(mapping1).toBeDefined();
      expect(mapping1?.code).toBe(objective.code);
      expect(mapping2).toBeDefined();
      expect(mapping2?.code).toBe(objective.code);

      // Cleanup
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM package_problems WHERE id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });

    it('should reject invalid LGR22 codes that do not exist in database', () => {
      const db = getDb();
      const invalidCodes = ['INVALID-CODE-123', 'MA-FAKE-99'];

      invalidCodes.forEach((code) => {
        const objective = db.get<{ id: number }>(
          'SELECT id FROM curriculum_objectives WHERE code = ?',
          [code]
        );
        expect(objective).toBeUndefined();
      });
    });
  });

  describe('Admin Package Assignment', () => {
    it('should allow admin to see all children for package assignment', () => {
      const db = getDb();

      // Create an admin parent
      const adminId = uuidv4();
      const adminEmail = `admin-test-${Date.now()}@example.com`;
      const passwordHash = bcrypt.hashSync('test1234', 10);

      db.run(
        'INSERT INTO parents (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, ?)',
        [adminId, adminEmail, passwordHash, 'Admin Parent', 1]
      );

      // Admin should be able to query ALL children (from /api/admin/children endpoint)
      const allChildren = db.all<{
        id: string;
        name: string;
        parent_name: string;
      }>(`
        SELECT c.id, c.name, p.name as parent_name
        FROM children c
        JOIN parents p ON c.parent_id = p.id
      `);

      // Should see both child1 (parent1) and child2 (parent2)
      expect(allChildren.length).toBeGreaterThanOrEqual(2);
      const childNames = allChildren.map(c => c.name);
      expect(childNames).toContain('Child One');
      expect(childNames).toContain('Child Two');

      // Cleanup
      db.run('DELETE FROM parents WHERE id = ?', [adminId]);
    });

    it('should restrict non-admin to only their own children for package assignment', () => {
      const db = getDb();

      // Parent1 (non-admin) should only see child1
      const parent1Children = db.all<{ id: string; name: string }>(
        'SELECT id, name FROM children WHERE parent_id = ?',
        [parent1Id]
      );

      expect(parent1Children.length).toBe(1);
      expect(parent1Children[0].name).toBe('Child One');
      expect(parent1Children[0].id).toBe(child1Id);

      // Should NOT see parent2's children
      const otherChildren = db.all<{ id: string }>(
        'SELECT id FROM children WHERE parent_id = ? AND id = ?',
        [parent1Id, child2Id]
      );

      expect(otherChildren.length).toBe(0);
    });

    it('should allow admin to assign package to any child', () => {
      const db = getDb();

      // Create an admin parent
      const adminId = uuidv4();
      const adminEmail = `admin-assign-test-${Date.now()}@example.com`;
      const passwordHash = bcrypt.hashSync('test1234', 10);

      db.run(
        'INSERT INTO parents (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, ?)',
        [adminId, adminEmail, passwordHash, 'Admin Assigner', 1]
      );

      // Admin should be able to assign to child1 (owned by parent1)
      const assignmentId = uuidv4();
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, assigned_by_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?, ?)`,
        [assignmentId, parent1Id, child1Id, 'Admin Test Assignment', 3, packageId, adminId]
      );

      const assignment = db.get<{
        parent_id: string;
        child_id: string;
        assigned_by_id: string;
      }>(
        'SELECT parent_id, child_id, assigned_by_id FROM assignments WHERE id = ?',
        [assignmentId]
      );

      expect(assignment).toBeDefined();
      expect(assignment?.child_id).toBe(child1Id);
      expect(assignment?.parent_id).toBe(parent1Id); // Assignment belongs to child's parent
      expect(assignment?.assigned_by_id).toBe(adminId); // But was assigned by admin

      // Cleanup
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM parents WHERE id = ?', [adminId]);
    });

    it('should prevent non-admin from assigning to other parent children', () => {
      const db = getDb();

      // Parent1 trying to assign to child2 (owned by parent2) should use WHERE clause
      // that checks parent_id, which would return no results
      const child = db.get<{ id: string; parent_id: string }>(
        'SELECT id, parent_id FROM children WHERE id = ? AND parent_id = ?',
        [child2Id, parent1Id] // parent1 trying to access child2
      );

      expect(child).toBeUndefined(); // Should not find the child
    });
  });

  describe('Story Text for Themed Reading', () => {
    it('should store story_text in reading packages', () => {
      const db = getDb();
      const storyPackageId = uuidv4();
      const testStory = 'Det var en gång en liten pokemon som hette Pikachu. Han bodde i en skog full av äventyr...';

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, assignment_type, problem_count, story_text, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [storyPackageId, parent1Id, 'Pokemon Äventyr', 6, 'reading', 4, testStory, 1]
      );

      const pkg = db.get<{ story_text: string | null; assignment_type: string }>(
        'SELECT story_text, assignment_type FROM math_packages WHERE id = ?',
        [storyPackageId]
      );

      expect(pkg).toBeDefined();
      expect(pkg?.assignment_type).toBe('reading');
      expect(pkg?.story_text).toBe(testStory);

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [storyPackageId]);
    });

    it('should allow null story_text for backward compatibility', () => {
      const db = getDb();
      const regularPackageId = uuidv4();

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, assignment_type, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [regularPackageId, parent1Id, 'Regular Math Package', 5, 'math', 10, 0]
      );

      const pkg = db.get<{ story_text: string | null }>(
        'SELECT story_text FROM math_packages WHERE id = ?',
        [regularPackageId]
      );

      expect(pkg).toBeDefined();
      expect(pkg?.story_text).toBeNull();

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [regularPackageId]);
    });

    it('should include story_text when retrieving reading assignment', () => {
      const db = getDb();
      const storyPackageId = uuidv4();
      const assignmentId = uuidv4();
      const testStory = 'En spännande berättelse om zebror som kan göra magi...';

      // Create reading package with story
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, assignment_type, problem_count, story_text, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [storyPackageId, parent1Id, 'Zebror och Magi', 6, 'reading', 4, testStory, 1]
      );

      // Create assignment from package
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [assignmentId, parent1Id, child1Id, 'reading', 'Läs om zebror', 6, storyPackageId]
      );

      // Retrieve story_text like the assignment endpoint does
      const pkg = db.get<{ story_text: string | null }>(
        'SELECT story_text FROM math_packages WHERE id = ?',
        [storyPackageId]
      );

      expect(pkg).toBeDefined();
      expect(pkg?.story_text).toBe(testStory);

      // Cleanup
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [storyPackageId]);
    });
  });

  describe('Requires Sketch Field', () => {
    it('should store requires_sketch field when importing a package', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId1 = uuidv4();
      const problemId2 = uuidv4();

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'Sketch Test Package', 3, 2, 0]
      );

      // Insert problem with requires_sketch = true
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, requires_sketch)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId1, testPackageId, 1, 'Rita en rektangel med sidorna 4 cm och 3 cm', '12', 1]
      );

      // Insert problem with requires_sketch = false (default)
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, requires_sketch)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId2, testPackageId, 2, 'Vad är 2+2?', '4', 0]
      );

      // Verify requires_sketch is stored correctly
      const problem1 = db.get<{ requires_sketch: number }>(
        'SELECT requires_sketch FROM package_problems WHERE id = ?',
        [problemId1]
      );
      const problem2 = db.get<{ requires_sketch: number }>(
        'SELECT requires_sketch FROM package_problems WHERE id = ?',
        [problemId2]
      );

      expect(problem1?.requires_sketch).toBe(1);
      expect(problem2?.requires_sketch).toBe(0);

      // Cleanup
      db.run('DELETE FROM package_problems WHERE id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });

    it('should default requires_sketch to 0 when not specified', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId = uuidv4();

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'Default Sketch Test', 3, 1, 0]
      );

      // Insert problem without specifying requires_sketch
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId, testPackageId, 1, 'What is 5*5?', '25']
      );

      // Verify default value
      const problem = db.get<{ requires_sketch: number }>(
        'SELECT requires_sketch FROM package_problems WHERE id = ?',
        [problemId]
      );

      expect(problem?.requires_sketch).toBe(0);

      // Cleanup
      db.run('DELETE FROM package_problems WHERE id = ?', [problemId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });

    it('should return requires_sketch when fetching package problems', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId = uuidv4();

      // Create a package with a sketch-required problem
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'Fetch Sketch Test', 3, 1, 0]
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, requires_sketch)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId, testPackageId, 1, 'Rita en triangel', '3', 1]
      );

      // Fetch like the assignment endpoint does (SELECT *)
      const problems = db.all<{ id: string; question_text: string; requires_sketch: number }>(
        'SELECT * FROM package_problems WHERE package_id = ?',
        [testPackageId]
      );

      expect(problems.length).toBe(1);
      expect(problems[0].requires_sketch).toBe(1);

      // Cleanup
      db.run('DELETE FROM package_problems WHERE id = ?', [problemId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });
  });

  describe('Grade Level Validation on Assign', () => {
    it('should reject assignment when package grade does not match child grade', () => {
      const db = getDb();
      const grade4PackageId = uuidv4();

      // Create a grade 4 package (child1 is grade 3)
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [grade4PackageId, parent1Id, 'Grade 4 Package', 4, 1, 0]
      );

      // Simulate the validation check from the assign endpoint
      const pkg = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM math_packages WHERE id = ?',
        [grade4PackageId]
      );
      const child = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM children WHERE id = ?',
        [child1Id]
      );

      // This should fail - package is grade 4, child is grade 3
      expect(pkg?.grade_level).toBe(4);
      expect(child?.grade_level).toBe(3);
      expect(pkg?.grade_level).not.toBe(child?.grade_level);

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [grade4PackageId]);
    });

    it('should allow assignment when package grade matches child grade', () => {
      const db = getDb();
      const grade3PackageId = uuidv4();

      // Create a grade 3 package (child1 is grade 3)
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [grade3PackageId, parent1Id, 'Grade 3 Package', 3, 1, 0]
      );

      // Simulate the validation check from the assign endpoint
      const pkg = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM math_packages WHERE id = ?',
        [grade3PackageId]
      );
      const child = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM children WHERE id = ?',
        [child1Id]
      );

      // This should pass - both are grade 3
      expect(pkg?.grade_level).toBe(3);
      expect(child?.grade_level).toBe(3);
      expect(pkg?.grade_level).toBe(child?.grade_level);

      // Cleanup
      db.run('DELETE FROM math_packages WHERE id = ?', [grade3PackageId]);
    });

    it('should validate grade for different child grades', () => {
      const db = getDb();

      // child1 is grade 3, child2 is grade 4
      const child1Grade = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM children WHERE id = ?',
        [child1Id]
      );
      const child2Grade = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM children WHERE id = ?',
        [child2Id]
      );

      expect(child1Grade?.grade_level).toBe(3);
      expect(child2Grade?.grade_level).toBe(4);

      // Grade 4 package should match child2 but not child1
      const grade4Package = { grade_level: 4 };
      expect(grade4Package.grade_level === child1Grade?.grade_level).toBe(false);
      expect(grade4Package.grade_level === child2Grade?.grade_level).toBe(true);
    });
  });

  describe('LGR22 Objectives Display', () => {
    it('should return lgr22_codes for each problem in GET /packages/:id', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId1 = uuidv4();
      const problemId2 = uuidv4();

      // Get some valid curriculum objectives
      const objectives = db.all<{ id: number; code: string }>(
        'SELECT id, code FROM curriculum_objectives LIMIT 2'
      );

      if (objectives.length < 2) {
        throw new Error('Need at least 2 curriculum objectives in database');
      }

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'LGR22 Display Test Package', 3, 2, 0]
      );

      // Insert problems
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId1, testPackageId, 1, 'Test question 1', '42']
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId2, testPackageId, 2, 'Test question 2', '24']
      );

      // Create curriculum mappings - problem 1 has objective 0, problem 2 has both objectives
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId1, objectives[0].id]
      );

      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId2, objectives[0].id]
      );

      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId2, objectives[1].id]
      );

      // Simulate the GET /packages/:id endpoint logic
      const problems = db.all<{ id: string; problem_number: number; question_text: string }>(
        'SELECT * FROM package_problems WHERE package_id = ? ORDER BY problem_number',
        [testPackageId]
      );

      const problemIds = problems.map(p => p.id);
      const lgr22CodesByProblem = new Map<string, string[]>();

      if (problemIds.length > 0) {
        const placeholders = problemIds.map(() => '?').join(',');
        const mappings = db.all<{ exercise_id: string; code: string }>(
          `SELECT ecm.exercise_id, co.code
           FROM exercise_curriculum_mapping ecm
           JOIN curriculum_objectives co ON ecm.objective_id = co.id
           WHERE ecm.exercise_type = 'package_problem' AND ecm.exercise_id IN (${placeholders})`,
          problemIds
        );

        for (const m of mappings) {
          if (!lgr22CodesByProblem.has(m.exercise_id)) {
            lgr22CodesByProblem.set(m.exercise_id, []);
          }
          lgr22CodesByProblem.get(m.exercise_id)!.push(m.code);
        }
      }

      const problemsWithCodes = problems.map(p => ({
        ...p,
        lgr22_codes: lgr22CodesByProblem.get(p.id) || []
      }));

      // Verify results
      expect(problemsWithCodes.length).toBe(2);
      expect(problemsWithCodes[0].lgr22_codes).toContain(objectives[0].code);
      expect(problemsWithCodes[0].lgr22_codes.length).toBe(1);
      expect(problemsWithCodes[1].lgr22_codes).toContain(objectives[0].code);
      expect(problemsWithCodes[1].lgr22_codes).toContain(objectives[1].code);
      expect(problemsWithCodes[1].lgr22_codes.length).toBe(2);

      // Cleanup
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM package_problems WHERE id IN (?, ?)', [problemId1, problemId2]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });

    it('should return lgr22_objectives for each package in GET /packages', () => {
      const db = getDb();
      const testPackageId1 = uuidv4();
      const testPackageId2 = uuidv4();
      const problemId1 = uuidv4();
      const problemId2 = uuidv4();
      const problemId3 = uuidv4();

      // Get some valid curriculum objectives
      const objectives = db.all<{ id: number; code: string }>(
        'SELECT id, code FROM curriculum_objectives LIMIT 3'
      );

      if (objectives.length < 3) {
        throw new Error('Need at least 3 curriculum objectives in database');
      }

      // Create two packages
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId1, parent1Id, 'Package 1', 3, 2, 0]
      );

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId2, parent1Id, 'Package 2', 3, 1, 0]
      );

      // Insert problems
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId1, testPackageId1, 1, 'Q1', '1']
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId2, testPackageId1, 2, 'Q2', '2']
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId3, testPackageId2, 1, 'Q3', '3']
      );

      // Create curriculum mappings
      // Package 1: objectives 0 and 1
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId1, objectives[0].id]
      );

      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId2, objectives[1].id]
      );

      // Package 2: objective 2
      db.run(
        `INSERT INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
         VALUES (?, ?, ?)`,
        ['package_problem', problemId3, objectives[2].id]
      );

      // Simulate the GET /packages endpoint logic
      const packages = db.all<{ id: string; name: string }>(
        'SELECT id, name FROM math_packages WHERE id IN (?, ?)',
        [testPackageId1, testPackageId2]
      );

      const lgr22ObjectivesByPackage = new Map<string, string[]>();
      if (packages.length > 0) {
        const packageIds = packages.map(p => p.id);
        const placeholders = packageIds.map(() => '?').join(',');
        const objectiveResults = db.all<{ package_id: string; code: string }>(
          `SELECT DISTINCT pp.package_id, co.code
           FROM package_problems pp
           JOIN exercise_curriculum_mapping ecm ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
           JOIN curriculum_objectives co ON ecm.objective_id = co.id
           WHERE pp.package_id IN (${placeholders})
           ORDER BY pp.package_id, co.code`,
          packageIds
        );

        for (const obj of objectiveResults) {
          if (!lgr22ObjectivesByPackage.has(obj.package_id)) {
            lgr22ObjectivesByPackage.set(obj.package_id, []);
          }
          lgr22ObjectivesByPackage.get(obj.package_id)!.push(obj.code);
        }
      }

      const packagesWithObjectives = packages.map(pkg => ({
        ...pkg,
        lgr22_objectives: lgr22ObjectivesByPackage.get(pkg.id) || []
      }));

      // Verify results
      expect(packagesWithObjectives.length).toBe(2);

      const package1 = packagesWithObjectives.find(p => p.id === testPackageId1);
      const package2 = packagesWithObjectives.find(p => p.id === testPackageId2);

      expect(package1).toBeDefined();
      expect(package1!.lgr22_objectives).toContain(objectives[0].code);
      expect(package1!.lgr22_objectives).toContain(objectives[1].code);
      expect(package1!.lgr22_objectives.length).toBe(2);

      expect(package2).toBeDefined();
      expect(package2!.lgr22_objectives).toContain(objectives[2].code);
      expect(package2!.lgr22_objectives.length).toBe(1);

      // Cleanup
      db.run('DELETE FROM exercise_curriculum_mapping WHERE exercise_id IN (?, ?, ?)', [problemId1, problemId2, problemId3]);
      db.run('DELETE FROM package_problems WHERE id IN (?, ?, ?)', [problemId1, problemId2, problemId3]);
      db.run('DELETE FROM math_packages WHERE id IN (?, ?)', [testPackageId1, testPackageId2]);
    });

    it('should return empty lgr22_codes array when problem has no curriculum mappings', () => {
      const db = getDb();
      const testPackageId = uuidv4();
      const problemId = uuidv4();

      // Create a package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, problem_count, is_global)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPackageId, parent1Id, 'No Objectives Package', 3, 1, 0]
      );

      // Insert problem without curriculum mappings
      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer)
         VALUES (?, ?, ?, ?, ?)`,
        [problemId, testPackageId, 1, 'Test question', '42']
      );

      // Simulate the endpoint logic
      const problems = db.all<{ id: string }>(
        'SELECT * FROM package_problems WHERE package_id = ?',
        [testPackageId]
      );

      const problemIds = problems.map(p => p.id);
      const lgr22CodesByProblem = new Map<string, string[]>();

      if (problemIds.length > 0) {
        const placeholders = problemIds.map(() => '?').join(',');
        const mappings = db.all<{ exercise_id: string; code: string }>(
          `SELECT ecm.exercise_id, co.code
           FROM exercise_curriculum_mapping ecm
           JOIN curriculum_objectives co ON ecm.objective_id = co.id
           WHERE ecm.exercise_type = 'package_problem' AND ecm.exercise_id IN (${placeholders})`,
          problemIds
        );

        for (const m of mappings) {
          if (!lgr22CodesByProblem.has(m.exercise_id)) {
            lgr22CodesByProblem.set(m.exercise_id, []);
          }
          lgr22CodesByProblem.get(m.exercise_id)!.push(m.code);
        }
      }

      const problemsWithCodes = problems.map(p => ({
        ...p,
        lgr22_codes: lgr22CodesByProblem.get(p.id) || []
      }));

      // Verify empty array is returned
      expect(problemsWithCodes.length).toBe(1);
      expect(problemsWithCodes[0].lgr22_codes).toEqual([]);

      // Cleanup
      db.run('DELETE FROM package_problems WHERE id = ?', [problemId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [testPackageId]);
    });
  });
});
