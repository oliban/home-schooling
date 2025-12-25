/**
 * Assignment reordering with status updates tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Assignment Reordering with Status Updates', () => {
  let parentId: string;
  let childId: string;
  let assignment1Id: string;
  let assignment2Id: string;
  let assignment3Id: string;
  const testEmail = `test-reorder-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    assignment1Id = uuidv4();
    assignment2Id = uuidv4();
    assignment3Id = uuidv4();

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

    // Create three assignments
    // Assignment 1: in_progress (started, 3/10 questions answered)
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-3 days'))`,
      [assignment1Id, parentId, childId, 'math', 'Math Assignment 1', 3, 'in_progress', 0]
    );

    // Assignment 2: pending (not started, created after assignment 1)
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))`,
      [assignment2Id, parentId, childId, 'math', 'Math Assignment 2', 3, 'pending', 1]
    );

    // Assignment 3: pending (not started, created most recently)
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))`,
      [assignment3Id, parentId, childId, 'math', 'Math Assignment 3', 3, 'pending', 2]
    );
  });

  afterAll(() => {
    const db = getDb();
    db.run('DELETE FROM assignments WHERE parent_id = ?', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE id = ?', [childId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  it('should reorder assignments without status updates', () => {
    const db = getDb();

    // Reorder: assignment3, assignment1, assignment2 (no status changes)
    const newOrder = [assignment3Id, assignment1Id, assignment2Id];

    db.transaction(() => {
      for (let i = 0; i < newOrder.length; i++) {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [i, newOrder[i], parentId]
        );
      }
    });

    // Verify display_order updated
    const a1 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment1Id]
    );
    const a2 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment2Id]
    );
    const a3 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment3Id]
    );

    expect(a1?.display_order).toBe(1);
    expect(a2?.display_order).toBe(2);
    expect(a3?.display_order).toBe(0);

    // Verify statuses unchanged
    expect(a1?.status).toBe('in_progress');
    expect(a2?.status).toBe('pending');
    expect(a3?.status).toBe('pending');
  });

  it('should reorder assignments with status updates', () => {
    const db = getDb();

    // Reorder: assignment2, assignment3, assignment1
    // AND set assignment2 to in_progress (was pending)
    const newOrder = [assignment2Id, assignment3Id, assignment1Id];
    const statusUpdates = {
      [assignment2Id]: 'in_progress'
    };

    db.transaction(() => {
      // Update display_order
      for (let i = 0; i < newOrder.length; i++) {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [i, newOrder[i], parentId]
        );
      }

      // Apply status updates
      for (const [assignmentId, newStatus] of Object.entries(statusUpdates)) {
        db.run(
          'UPDATE assignments SET status = ? WHERE id = ? AND parent_id = ?',
          [newStatus, assignmentId, parentId]
        );
      }
    });

    // Verify both display_order and status updated
    const a1 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment1Id]
    );
    const a2 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment2Id]
    );
    const a3 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment3Id]
    );

    expect(a1?.display_order).toBe(2);
    expect(a2?.display_order).toBe(0);
    expect(a3?.display_order).toBe(1);

    // Verify assignment2 status changed to in_progress
    expect(a1?.status).toBe('in_progress');
    expect(a2?.status).toBe('in_progress'); // Changed from pending
    expect(a3?.status).toBe('pending'); // Unchanged
  });

  it('should order assignments by display_order regardless of status', () => {
    const db = getDb();

    // Query assignments as child would (ordered by display_order)
    const assignments = db.all<{ id: string; title: string; status: string; display_order: number }>(
      `SELECT id, title, status, display_order
       FROM assignments
       WHERE child_id = ? AND status IN ('pending', 'in_progress')
       ORDER BY COALESCE(display_order, 999999) ASC, created_at DESC`,
      [childId]
    );

    expect(assignments.length).toBe(3);

    // Verify order: assignment2 (display_order=0), assignment3 (display_order=1), assignment1 (display_order=2)
    expect(assignments[0].id).toBe(assignment2Id);
    expect(assignments[0].status).toBe('in_progress');
    expect(assignments[1].id).toBe(assignment3Id);
    expect(assignments[1].status).toBe('pending');
    expect(assignments[2].id).toBe(assignment1Id);
    expect(assignments[2].status).toBe('in_progress');
  });

  it('should handle promoting pending assignment when dragged to top', () => {
    const db = getDb();

    // Scenario: User drags assignment3 (pending) to top position
    // This should set it to in_progress
    const newOrder = [assignment3Id, assignment2Id, assignment1Id];
    const statusUpdates = {
      [assignment3Id]: 'in_progress'
    };

    db.transaction(() => {
      for (let i = 0; i < newOrder.length; i++) {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [i, newOrder[i], parentId]
        );
      }

      for (const [assignmentId, newStatus] of Object.entries(statusUpdates)) {
        db.run(
          'UPDATE assignments SET status = ? WHERE id = ? AND parent_id = ?',
          [newStatus, assignmentId, parentId]
        );
      }
    });

    const a3 = db.get<{ display_order: number; status: string }>(
      'SELECT display_order, status FROM assignments WHERE id = ?',
      [assignment3Id]
    );

    expect(a3?.display_order).toBe(0); // Moved to top
    expect(a3?.status).toBe('in_progress'); // Promoted from pending
  });

  it('should only allow parent to reorder their own assignments', () => {
    const db = getDb();
    const otherParentId = uuidv4();

    // Try to reorder as different parent (should not affect assignments)
    const newOrder = [assignment1Id, assignment2Id, assignment3Id];

    db.transaction(() => {
      for (let i = 0; i < newOrder.length; i++) {
        const result = db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [i + 100, newOrder[i], otherParentId] // Using different parent_id
        );
        // Should not update any rows
        expect(result.changes).toBe(0);
      }
    });

    // Verify assignments still have previous display_order values
    const a1 = db.get<{ display_order: number }>(
      'SELECT display_order FROM assignments WHERE id = ?',
      [assignment1Id]
    );
    const a2 = db.get<{ display_order: number }>(
      'SELECT display_order FROM assignments WHERE id = ?',
      [assignment2Id]
    );
    const a3 = db.get<{ display_order: number }>(
      'SELECT display_order FROM assignments WHERE id = ?',
      [assignment3Id]
    );

    // Should still have the values from the previous test (assignment3, assignment2, assignment1)
    expect(a3?.display_order).toBe(0);
    expect(a2?.display_order).toBe(1);
    expect(a1?.display_order).toBe(2);
  });
});
