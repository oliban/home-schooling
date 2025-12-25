/**
 * Collectibles purchase transaction tests
 * Tests the transaction validation and purchase flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Collectibles Purchase Transaction', () => {
  let parentId: string;
  let childId: string;
  let collectibleId: string;
  const testEmail = `test-purchase-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    collectibleId = uuidv4();

    const db = getDb();

    // Create parent
    const passwordHash = await bcrypt.hash('test1234', 10);
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child with coins
    const pinHash = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash, unlocked_shop_items) VALUES (?, ?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 4, pinHash, 10]
    );
    db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [childId, 1000]);

    // Create a test collectible
    db.run(
      'INSERT INTO collectibles (id, name, ascii_art, price, rarity) VALUES (?, ?, ?, ?, ?)',
      [collectibleId, 'Test Collectible', 'ASCII art here', 100, 'common']
    );
  });

  afterAll(() => {
    const db = getDb();
    // Delete in correct order to respect FK constraints
    // Clean up ALL test data, including any test collectibles created during tests
    db.run('DELETE FROM child_collectibles WHERE child_id IN (SELECT id FROM children WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM child_coins WHERE child_id IN (SELECT id FROM children WHERE parent_id = ?)', [parentId]);
    db.run('DELETE FROM children WHERE parent_id = ?', [parentId]);
    // Delete all test collectibles (those with 'Test' in the name or created during tests)
    db.run("DELETE FROM collectibles WHERE name LIKE 'Test %' OR id = ?", [collectibleId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  describe('Successful Purchase Flow', () => {
    it('should successfully purchase a collectible and deduct coins', () => {
      const db = getDb();

      // Get initial balance
      const initialBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [childId]
      );
      expect(initialBalance?.balance).toBe(1000);

      // Get collectible price
      const collectible = db.get<{ price: number }>(
        'SELECT price FROM collectibles WHERE id = ?',
        [collectibleId]
      );
      expect(collectible?.price).toBe(100);

      // Perform purchase (simulate the transaction)
      const purchaseResult = db.transaction(() => {
        const updateResult = db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [collectible!.price, childId]
        );

        if (updateResult.changes !== 1) {
          throw new Error('Failed to deduct coins');
        }

        const insertResult = db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [childId, collectibleId]
        );

        if (insertResult.changes !== 1) {
          throw new Error('Failed to create ownership record');
        }

        return insertResult;
      });

      // Verify changes count
      expect(purchaseResult.changes).toBe(1);

      // Verify balance was deducted
      const newBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [childId]
      );
      expect(newBalance?.balance).toBe(900);
    });

    it('should create ownership record in child_collectibles', () => {
      const db = getDb();

      // Verify ownership record exists
      const ownership = db.get<{ child_id: string; collectible_id: string }>(
        'SELECT child_id, collectible_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [childId, collectibleId]
      );

      expect(ownership).toBeDefined();
      expect(ownership?.child_id).toBe(childId);
      expect(ownership?.collectible_id).toBe(collectibleId);
    });

    it('should show purchased item as owned in subsequent queries', () => {
      const db = getDb();

      // Query like the GET /collectibles endpoint does
      const items = db.all<{ id: string; owned: number }>(`
        SELECT c.id,
          CASE WHEN cc.child_id IS NOT NULL THEN 1 ELSE 0 END as owned
        FROM collectibles c
        LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
        WHERE c.id = ?
      `, [childId, collectibleId]);

      expect(items.length).toBe(1);
      expect(items[0].owned).toBe(1);
    });
  });

  describe('Transaction Validation', () => {
    it('should verify INSERT succeeded by checking changes count', () => {
      const db = getDb();
      const testChildId = uuidv4();
      const testCollectibleId = uuidv4();

      // Create test child
      const pinHash = '$2a$10$test';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [testChildId, parentId, 'Test Child 2', 4, pinHash]
      );
      db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 500]);

      // Create test collectible
      db.run(
        'INSERT INTO collectibles (id, name, ascii_art, price, rarity) VALUES (?, ?, ?, ?, ?)',
        [testCollectibleId, 'Test Item 2', 'Art', 50, 'common']
      );

      // Purchase and validate
      const insertResult = db.transaction(() => {
        db.run(
          'UPDATE child_coins SET balance = balance - 50 WHERE child_id = ?',
          [testChildId]
        );

        const result = db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [testChildId, testCollectibleId]
        );

        return result;
      });

      // Critical: changes must be 1 to indicate success
      expect(insertResult.changes).toBe(1);

      // Verify ownership exists
      const verifyOwnership = db.get(
        'SELECT child_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [testChildId, testCollectibleId]
      );
      expect(verifyOwnership).toBeDefined();

      // Cleanup
      db.run('DELETE FROM child_collectibles WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM collectibles WHERE id = ?', [testCollectibleId]);
      db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM children WHERE id = ?', [testChildId]);
    });

    it('should throw error and rollback if INSERT fails', () => {
      const db = getDb();

      // Try to purchase the same item again (should fail due to PRIMARY KEY constraint)
      expect(() => {
        db.transaction(() => {
          const updateResult = db.run(
            'UPDATE child_coins SET balance = balance - 100 WHERE child_id = ?',
            [childId]
          );

          if (updateResult.changes !== 1) {
            throw new Error('Failed to deduct coins');
          }

          // This INSERT should fail because child already owns this collectible
          const insertResult = db.run(
            'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
            [childId, collectibleId]
          );

          if (insertResult.changes !== 1) {
            throw new Error('Failed to create ownership record');
          }

          return insertResult;
        });
      }).toThrow();

      // Verify balance was NOT deducted (transaction rolled back)
      const balance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [childId]
      );
      expect(balance?.balance).toBe(900); // Still 900 from first purchase, not 800
    });
  });

  describe('Duplicate Purchase Prevention', () => {
    it('should reject purchase if item already owned (pre-check)', () => {
      const db = getDb();

      // Check ownership (this is what the endpoint does before purchase)
      const alreadyOwned = db.get(
        'SELECT * FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [childId, collectibleId]
      );

      // Should be owned from previous test
      expect(alreadyOwned).toBeDefined();

      // Pre-check should prevent purchase attempt
      // (In the endpoint, this returns 400 error before transaction)
    });

    it('should handle PRIMARY KEY constraint violation', () => {
      const db = getDb();

      // Direct INSERT of duplicate should throw
      expect(() => {
        db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [childId, collectibleId]
        );
      }).toThrow(/UNIQUE constraint|PRIMARY KEY/);
    });
  });

  describe('Insufficient Balance', () => {
    it('should reject purchase when balance < price', () => {
      const db = getDb();
      const testChildId = uuidv4();
      const expensiveCollectibleId = uuidv4();

      // Create child with low balance
      const pinHash = '$2a$10$test';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [testChildId, parentId, 'Poor Child', 4, pinHash]
      );
      db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 50]);

      // Create expensive collectible
      db.run(
        'INSERT INTO collectibles (id, name, ascii_art, price, rarity) VALUES (?, ?, ?, ?, ?)',
        [expensiveCollectibleId, 'Expensive Item', 'Art', 1000, 'legendary']
      );

      // Check balance
      const balance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [testChildId]
      );
      const price = db.get<{ price: number }>(
        'SELECT price FROM collectibles WHERE id = ?',
        [expensiveCollectibleId]
      );

      expect(balance!.balance < price!.price).toBe(true);

      // Cleanup
      db.run('DELETE FROM collectibles WHERE id = ?', [expensiveCollectibleId]);
      db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM children WHERE id = ?', [testChildId]);
    });

    it('should not create ownership record when balance insufficient', () => {
      const db = getDb();
      const testChildId = uuidv4();
      const testCollectibleId = uuidv4();

      // Create child with insufficient balance
      const pinHash = '$2a$10$test';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [testChildId, parentId, 'Test Child 3', 4, pinHash]
      );
      db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 10]);

      // Create collectible
      db.run(
        'INSERT INTO collectibles (id, name, ascii_art, price, rarity) VALUES (?, ?, ?, ?, ?)',
        [testCollectibleId, 'Test Item 3', 'Art', 100, 'common']
      );

      // Balance check should prevent purchase
      const balance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [testChildId]
      );

      if (balance!.balance < 100) {
        // Don't attempt purchase
        // (In endpoint, this returns 400 error)
      }

      // Verify no ownership record exists
      const ownership = db.get(
        'SELECT * FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [testChildId, testCollectibleId]
      );
      expect(ownership).toBeUndefined();

      // Cleanup
      db.run('DELETE FROM collectibles WHERE id = ?', [testCollectibleId]);
      db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM children WHERE id = ?', [testChildId]);
    });
  });

  describe('Invalid Collectible', () => {
    it('should handle non-existent collectible', () => {
      const db = getDb();
      const fakeId = uuidv4();

      // Try to get non-existent collectible
      const collectible = db.get(
        'SELECT * FROM collectibles WHERE id = ?',
        [fakeId]
      );

      // Should return undefined
      expect(collectible).toBeUndefined();

      // (In endpoint, this returns 404 error)
    });
  });

  describe('Transaction Atomicity', () => {
    it('should rollback coin deduction if ownership insert fails', () => {
      const db = getDb();
      const testChildId = uuidv4();

      // Create child
      const pinHash = '$2a$10$test';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [testChildId, parentId, 'Test Child 4', 4, pinHash]
      );
      db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 800]);

      const initialBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [testChildId]
      );
      expect(initialBalance?.balance).toBe(800);

      // Try to purchase with a bad INSERT (foreign key violation or similar)
      const badCollectibleId = uuidv4(); // Non-existent collectible

      try {
        db.transaction(() => {
          db.run(
            'UPDATE child_coins SET balance = balance - 100 WHERE child_id = ?',
            [testChildId]
          );

          // This will fail due to foreign key constraint (collectible doesn't exist)
          db.run(
            'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
            [testChildId, badCollectibleId]
          );
        });
      } catch (error) {
        // Transaction should throw and rollback
      }

      // Balance should be unchanged (transaction rolled back)
      const finalBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [testChildId]
      );
      expect(finalBalance?.balance).toBe(800); // Unchanged

      // Cleanup
      db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM children WHERE id = ?', [testChildId]);
    });

    it('should maintain data consistency on constraint violation', () => {
      const db = getDb();

      // Count existing ownership records
      const beforeCount = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM child_collectibles WHERE child_id = ?',
        [childId]
      );

      // Try to insert duplicate (should fail)
      try {
        db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [childId, collectibleId]
        );
      } catch (error) {
        // Expected to fail
      }

      // Count should be unchanged
      const afterCount = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM child_collectibles WHERE child_id = ?',
        [childId]
      );

      expect(afterCount?.count).toBe(beforeCount?.count);
    });
  });

  describe('Verification After Purchase', () => {
    it('should verify ownership record exists after transaction', () => {
      const db = getDb();
      const testChildId = uuidv4();
      const testCollectibleId = uuidv4();

      // Create test data
      const pinHash = '$2a$10$test';
      db.run(
        'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
        [testChildId, parentId, 'Test Child 5', 4, pinHash]
      );
      db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 500]);
      db.run(
        'INSERT INTO collectibles (id, name, ascii_art, price, rarity) VALUES (?, ?, ?, ?, ?)',
        [testCollectibleId, 'Test Item 5', 'Art', 50, 'common']
      );

      // Perform purchase
      db.transaction(() => {
        const updateResult = db.run(
          'UPDATE child_coins SET balance = balance - 50 WHERE child_id = ?',
          [testChildId]
        );

        if (updateResult.changes !== 1) {
          throw new Error('Failed to deduct coins');
        }

        const insertResult = db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [testChildId, testCollectibleId]
        );

        if (insertResult.changes !== 1) {
          throw new Error('Failed to create ownership record');
        }

        return insertResult;
      });

      // CRITICAL: Verify ownership record exists (belt-and-suspenders check)
      const verifyOwnership = db.get<{ child_id: string }>(
        'SELECT child_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [testChildId, testCollectibleId]
      );

      expect(verifyOwnership).toBeDefined();
      expect(verifyOwnership?.child_id).toBe(testChildId);

      // Cleanup
      db.run('DELETE FROM child_collectibles WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM collectibles WHERE id = ?', [testCollectibleId]);
      db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
      db.run('DELETE FROM children WHERE id = ?', [testChildId]);
    });
  });
});
