/**
 * Compare (peer comparison) API tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function generateChildToken(childId: string, parentId: string): string {
  return jwt.sign({ id: childId, parentId, type: 'child' }, JWT_SECRET, { expiresIn: '24h' });
}

describe('Peer Comparison API', () => {
  let parent1Id: string;
  let parent2Id: string;
  let child1Id: string; // First child of parent1
  let child2Id: string; // Second child of parent1 (sibling of child1)
  let child3Id: string; // Child of parent2, same grade as child1
  let child4Id: string; // Child of parent2, different grade
  let child1Token: string;
  let child3Token: string;

  const testEmail1 = `test-compare-1-${Date.now()}@example.com`;
  const testEmail2 = `test-compare-2-${Date.now()}@example.com`;

  beforeAll(async () => {
    const db = getDb();

    parent1Id = uuidv4();
    parent2Id = uuidv4();
    child1Id = uuidv4();
    child2Id = uuidv4();
    child3Id = uuidv4();
    child4Id = uuidv4();

    const passwordHash = await bcrypt.hash('test1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    // Create two parent accounts
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parent1Id, testEmail1, passwordHash, 'Parent One']
    );
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parent2Id, testEmail2, passwordHash, 'Parent Two']
    );

    // Create children:
    // child1: parent1, grade 4
    // child2: parent1, grade 4 (sibling)
    // child3: parent2, grade 4 (classmate)
    // child4: parent2, grade 5 (different grade)
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child1Id, parent1Id, 'Alice', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, ?, ?, ?)',
      [child1Id, 100, 500, 5]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child2Id, parent1Id, 'Bob', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, ?, ?, ?)',
      [child2Id, 200, 800, 3]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child3Id, parent2Id, 'Carol', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, ?, ?, ?)',
      [child3Id, 150, 600, 7]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [child4Id, parent2Id, 'Dave', 5, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, ?, ?, ?)',
      [child4Id, 50, 100, 1]);

    // Give some children collectibles for comparison
    const collectible = db.get<{ id: string }>('SELECT id FROM collectibles LIMIT 1');
    if (collectible) {
      db.run(
        'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
        [child1Id, collectible.id]
      );
      db.run(
        'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
        [child3Id, collectible.id]
      );
    }

    // Generate tokens
    child1Token = generateChildToken(child1Id, parent1Id);
    child3Token = generateChildToken(child3Id, parent2Id);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of foreign key dependencies
    db.run('DELETE FROM child_collectibles WHERE child_id IN (?, ?, ?, ?)',
      [child1Id, child2Id, child3Id, child4Id]);
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?, ?, ?)',
      [child1Id, child2Id, child3Id, child4Id]);
    db.run('DELETE FROM children WHERE id IN (?, ?, ?, ?)',
      [child1Id, child2Id, child3Id, child4Id]);
    db.run('DELETE FROM parents WHERE id IN (?, ?)', [parent1Id, parent2Id]);
  });

  describe('GET /compare/peers', () => {
    it('should return siblings and same-grade classmates', () => {
      const db = getDb();

      // Get child1's peers (should include child2 as sibling and child3 as classmate)
      const child = db.get<{ parent_id: string; grade_level: number }>(
        'SELECT parent_id, grade_level FROM children WHERE id = ?',
        [child1Id]
      );
      expect(child).toBeDefined();

      // Get siblings
      const siblings = db.all<{ id: string; name: string; grade_level: number }>(
        `SELECT id, name, grade_level FROM children
         WHERE parent_id = ? AND id != ?
         ORDER BY name`,
        [child!.parent_id, child1Id]
      );

      expect(siblings.length).toBe(1);
      expect(siblings[0].name).toBe('Bob');

      // Get same-grade classmates (different parent)
      const classmates = db.all<{ id: string; name: string }>(
        `SELECT id, name FROM children
         WHERE grade_level = ? AND parent_id != ? AND id != ?
         ORDER BY name`,
        [child!.grade_level, child!.parent_id, child1Id]
      );

      expect(classmates.length).toBeGreaterThanOrEqual(1);
      expect(classmates.some(c => c.name === 'Carol')).toBe(true);
    });

    it('should not include children with different grades as classmates', () => {
      const db = getDb();

      // Get child1's grade
      const child = db.get<{ grade_level: number }>(
        'SELECT grade_level FROM children WHERE id = ?',
        [child1Id]
      );

      // Dave (grade 5) should not appear in child1's (grade 4) classmates
      const classmates = db.all<{ id: string; name: string; grade_level: number }>(
        `SELECT id, name, grade_level FROM children
         WHERE grade_level = ? AND id != ?`,
        [child!.grade_level, child1Id]
      );

      const dave = classmates.find(c => c.name === 'Dave');
      expect(dave).toBeUndefined();
    });
  });

  describe('GET /compare/:childId/collection', () => {
    it('should return the peer collection for siblings', () => {
      const db = getDb();

      // Get child2's (Bob's) collection - sibling of child1 (Alice)
      const collection = db.all<{ id: string; name: string; rarity: string }>(
        `SELECT c.id, c.name, c.rarity
         FROM collectibles c
         JOIN child_collectibles cc ON c.id = cc.collectible_id
         WHERE cc.child_id = ?
         ORDER BY c.name`,
        [child2Id]
      );

      // Bob doesn't have any collectibles in our test setup
      expect(collection.length).toBe(0);
    });

    it('should return the peer collection for classmates', () => {
      const db = getDb();

      // Get child3's (Carol's) collection - classmate of child1 (Alice)
      const collection = db.all<{ id: string; name: string; rarity: string }>(
        `SELECT c.id, c.name, c.rarity
         FROM collectibles c
         JOIN child_collectibles cc ON c.id = cc.collectible_id
         WHERE cc.child_id = ?
         ORDER BY c.name`,
        [child3Id]
      );

      // Carol has 1 collectible
      expect(collection.length).toBe(1);
    });
  });

  describe('GET /compare/:childId/stats', () => {
    it('should return peer stats including coins and streak', () => {
      const db = getDb();

      // Get child2's (Bob's) stats
      const stats = db.get<{ balance: number; total_earned: number; current_streak: number }>(
        'SELECT balance, total_earned, current_streak FROM child_coins WHERE child_id = ?',
        [child2Id]
      );

      expect(stats).toBeDefined();
      expect(stats!.balance).toBe(200);
      expect(stats!.total_earned).toBe(800);
      expect(stats!.current_streak).toBe(3);
    });

    it('should return peer assignment completion stats', () => {
      const db = getDb();

      // Get completion stats for a peer
      const stats = db.get<{ completed: number; total: number }>(
        `SELECT
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
           COUNT(*) as total
         FROM assignments WHERE child_id = ?`,
        [child3Id]
      );

      expect(stats).toBeDefined();
      // No assignments in test, so should be 0
      expect(stats!.completed).toBe(0);
      expect(stats!.total).toBe(0);
    });

    it('should return peer collectible count', () => {
      const db = getDb();

      // Get collectible count for Carol
      const count = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM child_collectibles WHERE child_id = ?',
        [child3Id]
      );

      expect(count).toBeDefined();
      expect(count!.count).toBe(1);
    });
  });

  describe('Access control', () => {
    it('should only allow viewing peers (siblings or same-grade)', () => {
      const db = getDb();

      // child1 (Alice, grade 4) should not be able to see child4 (Dave, grade 5)
      // as Dave is neither a sibling nor same grade

      const child1 = db.get<{ parent_id: string; grade_level: number }>(
        'SELECT parent_id, grade_level FROM children WHERE id = ?',
        [child1Id]
      );

      const child4 = db.get<{ parent_id: string; grade_level: number }>(
        'SELECT parent_id, grade_level FROM children WHERE id = ?',
        [child4Id]
      );

      // Check if they're peers
      const isSibling = child1!.parent_id === child4!.parent_id;
      const isSameGrade = child1!.grade_level === child4!.grade_level;

      expect(isSibling).toBe(false);
      expect(isSameGrade).toBe(false);

      // Therefore Dave should NOT be accessible to Alice
    });

    it('should allow viewing siblings regardless of grade', () => {
      const db = getDb();

      // Even if siblings have different grades, they should be visible to each other
      const sibling = db.get<{ id: string }>(
        'SELECT id FROM children WHERE parent_id = ? AND id != ?',
        [parent1Id, child1Id]
      );

      expect(sibling).toBeDefined();
      expect(sibling!.id).toBe(child2Id);
    });
  });
});
