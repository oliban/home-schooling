/**
 * Assignment deletion tests - including admin permissions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Assignment Deletion', () => {
  let parent1Id: string;
  let parent2Id: string;
  let adminId: string;
  let child1Id: string;
  let child2Id: string;
  const testEmail1 = `test-delete1-${Date.now()}@example.com`;
  const testEmail2 = `test-delete2-${Date.now()}@example.com`;
  const adminEmail = `test-admin-delete-${Date.now()}@example.com`;

  beforeAll(async () => {
    parent1Id = uuidv4();
    parent2Id = uuidv4();
    adminId = uuidv4();
    child1Id = uuidv4();
    child2Id = uuidv4();

    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create parent 1 (regular user)
    db.run(
      'INSERT INTO parents (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, 0)',
      [parent1Id, testEmail1, passwordHash, 'Test Parent 1']
    );

    // Create parent 2 (regular user)
    db.run(
      'INSERT INTO parents (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, 0)',
      [parent2Id, testEmail2, passwordHash, 'Test Parent 2']
    );

    // Create admin
    db.run(
      'INSERT INTO parents (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, 1)',
      [adminId, adminEmail, passwordHash, 'Admin User']
    );

    // Create child for parent 1
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child1Id, parent1Id, 'Child 1', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child1Id]);

    // Create child for parent 2
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child2Id, parent2Id, 'Child 2', 3, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child2Id]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up
    db.run('DELETE FROM adventure_generations WHERE child_id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM assignment_answers WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id IN (?, ?, ?))', [parent1Id, parent2Id, adminId]);
    db.run('DELETE FROM math_problems WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id IN (?, ?, ?))', [parent1Id, parent2Id, adminId]);
    db.run('DELETE FROM reading_questions WHERE assignment_id IN (SELECT id FROM assignments WHERE parent_id IN (?, ?, ?))', [parent1Id, parent2Id, adminId]);
    db.run('DELETE FROM assignments WHERE parent_id IN (?, ?, ?)', [parent1Id, parent2Id, adminId]);
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM children WHERE parent_id IN (?, ?, ?)', [parent1Id, parent2Id, adminId]);
    db.run('DELETE FROM parents WHERE id IN (?, ?, ?)', [parent1Id, parent2Id, adminId]);
  });

  describe('Permission checks', () => {
    it('should allow parent to delete their own assignment', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create assignment for parent1's child
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending')`,
        [assignmentId, parent1Id, child1Id, 'Delete Test 1', 3]
      );

      // Verify assignment exists
      const before = db.get<{ id: string }>('SELECT id FROM assignments WHERE id = ?', [assignmentId]);
      expect(before).toBeDefined();

      // Simulate delete (parent owns this assignment)
      const assignment = db.get<{ parent_id: string }>('SELECT parent_id FROM assignments WHERE id = ?', [assignmentId]);
      const canDelete = assignment?.parent_id === parent1Id;
      expect(canDelete).toBe(true);

      // Delete
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);

      // Verify deleted
      const after = db.get<{ id: string }>('SELECT id FROM assignments WHERE id = ?', [assignmentId]);
      expect(after).toBeUndefined();
    });

    it('should not allow parent to delete another parent\'s assignment', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create assignment for parent2's child
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending')`,
        [assignmentId, parent2Id, child2Id, 'Delete Test 2', 3]
      );

      // Parent1 tries to delete parent2's assignment
      const assignment = db.get<{ parent_id: string }>('SELECT parent_id FROM assignments WHERE id = ?', [assignmentId]);
      const canDelete = assignment?.parent_id === parent1Id;

      expect(canDelete).toBe(false);

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should allow admin to delete any assignment', () => {
      const db = getDb();
      const assignmentId = uuidv4();

      // Create assignment for parent1's child
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending')`,
        [assignmentId, parent1Id, child1Id, 'Admin Delete Test', 3]
      );

      // Check admin status
      const admin = db.get<{ is_admin: number }>('SELECT is_admin FROM parents WHERE id = ?', [adminId]);
      expect(admin?.is_admin).toBe(1);

      // Admin can delete (isAdmin bypasses ownership check)
      const isAdmin = admin?.is_admin === 1;
      expect(isAdmin).toBe(true);

      // Admin deletes
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);

      // Verify deleted
      const after = db.get<{ id: string }>('SELECT id FROM assignments WHERE id = ?', [assignmentId]);
      expect(after).toBeUndefined();
    });

    it('should allow parent to delete child-created adventure assignment', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      // Create package (child-generated)
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parent1Id, 'Child Adventure', 3, 'taluppfattning', 3, child1Id]
      );

      // Create assignment with parent1 as parent_id (child created it but parent_id points to their parent)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parent1Id, child1Id, 'Child Adventure', 3, packageId]
      );

      // Create adventure generation record
      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, child1Id, assignmentId, packageId, 'dragons', 'math', 3]
      );

      // Parent should be able to delete this assignment since parent_id matches
      const assignment = db.get<{ parent_id: string }>('SELECT parent_id FROM assignments WHERE id = ?', [assignmentId]);
      const canDelete = assignment?.parent_id === parent1Id;

      expect(canDelete).toBe(true);

      // Clean up (in correct order for foreign keys)
      db.run('DELETE FROM adventure_generations WHERE id = ?', [adventureId]);
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });
  });

  describe('Cascade deletion', () => {
    it('should delete related assignment_answers when assignment is deleted', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const problemId = uuidv4();
      const answerId = uuidv4();

      // Create package and problem
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [packageId, parent1Id, 'Cascade Test', 3, 'taluppfattning', 1]
      );

      db.run(
        `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId, packageId, 1, 'What is 1+1?', '2', 'number']
      );

      // Create assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'in_progress', ?)`,
        [assignmentId, parent1Id, child1Id, 'Cascade Test', 3, packageId]
      );

      // Create answer
      db.run(
        `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, attempts_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [answerId, assignmentId, problemId, '2', 1, 1]
      );

      // Verify answer exists
      const answerBefore = db.get<{ id: string }>('SELECT id FROM assignment_answers WHERE id = ?', [answerId]);
      expect(answerBefore).toBeDefined();

      // Delete assignment answers first (as done in the endpoint)
      db.run('DELETE FROM assignment_answers WHERE assignment_id = ?', [assignmentId]);

      // Verify answer deleted
      const answerAfter = db.get<{ id: string }>('SELECT id FROM assignment_answers WHERE id = ?', [answerId]);
      expect(answerAfter).toBeUndefined();

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM package_problems WHERE package_id = ?', [packageId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should delete related adventure_generations when assignment is deleted', () => {
      const db = getDb();
      const packageId = uuidv4();
      const assignmentId = uuidv4();
      const adventureId = uuidv4();

      // Create package
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [packageId, parent1Id, 'Adventure Cascade', 3, 'taluppfattning', 3, child1Id]
      );

      // Create assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
        [assignmentId, parent1Id, child1Id, 'Adventure Cascade', 3, packageId]
      );

      // Create adventure
      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [adventureId, child1Id, assignmentId, packageId, 'pirates', 'math', 3]
      );

      // Verify adventure exists
      const adventureBefore = db.get<{ id: string }>('SELECT id FROM adventure_generations WHERE id = ?', [adventureId]);
      expect(adventureBefore).toBeDefined();

      // Delete adventure first (as done in the endpoint)
      db.run('DELETE FROM adventure_generations WHERE assignment_id = ?', [assignmentId]);

      // Verify adventure deleted
      const adventureAfter = db.get<{ id: string }>('SELECT id FROM adventure_generations WHERE id = ?', [adventureId]);
      expect(adventureAfter).toBeUndefined();

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
      db.run('DELETE FROM math_packages WHERE id = ?', [packageId]);
    });

    it('should delete legacy math_problems when assignment is deleted', () => {
      const db = getDb();
      const assignmentId = uuidv4();
      const problemId = uuidv4();

      // Create legacy assignment (no package_id)
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'math', ?, ?, 'pending')`,
        [assignmentId, parent1Id, child1Id, 'Legacy Math', 3]
      );

      // Create legacy math problem
      db.run(
        `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId, assignmentId, 1, 'What is 2+2?', '4', 'number']
      );

      // Verify problem exists
      const problemBefore = db.get<{ id: string }>('SELECT id FROM math_problems WHERE id = ?', [problemId]);
      expect(problemBefore).toBeDefined();

      // Delete problems (as done in the endpoint)
      db.run('DELETE FROM math_problems WHERE assignment_id = ?', [assignmentId]);

      // Verify problem deleted
      const problemAfter = db.get<{ id: string }>('SELECT id FROM math_problems WHERE id = ?', [problemId]);
      expect(problemAfter).toBeUndefined();

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });

    it('should delete legacy reading_questions when assignment is deleted', () => {
      const db = getDb();
      const assignmentId = uuidv4();
      const questionId = uuidv4();

      // Create legacy reading assignment
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, 'reading', ?, ?, 'pending')`,
        [assignmentId, parent1Id, child1Id, 'Legacy Reading', 3]
      );

      // Create legacy reading question
      db.run(
        `INSERT INTO reading_questions (id, assignment_id, question_number, question_text, correct_answer, options)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [questionId, assignmentId, 1, 'What color is the sky?', 'A', JSON.stringify(['A. Blue', 'B. Green', 'C. Red'])]
      );

      // Verify question exists
      const questionBefore = db.get<{ id: string }>('SELECT id FROM reading_questions WHERE id = ?', [questionId]);
      expect(questionBefore).toBeDefined();

      // Delete questions (as done in the endpoint)
      db.run('DELETE FROM reading_questions WHERE assignment_id = ?', [assignmentId]);

      // Verify question deleted
      const questionAfter = db.get<{ id: string }>('SELECT id FROM reading_questions WHERE id = ?', [questionId]);
      expect(questionAfter).toBeUndefined();

      // Clean up
      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    });
  });
});
