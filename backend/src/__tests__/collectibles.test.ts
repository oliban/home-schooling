/**
 * Collectibles shop tests - Per-child unique ordering
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Per-Child Shop Ordering', () => {
  let parentId: string;
  let child1Id: string;
  let child2Id: string;
  const testEmail = `test-shop-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    child1Id = uuidv4();
    child2Id = uuidv4();

    const db = getDb();

    // Create parent
    const passwordHash = await bcrypt.hash('test1234', 10);
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create two children with different IDs
    const pinHash = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash, unlocked_shop_items) VALUES (?, ?, ?, ?, ?, ?)',
      [child1Id, parentId, 'Child One', 4, pinHash, 10]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child1Id]);

    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash, unlocked_shop_items) VALUES (?, ?, ?, ?, ?, ?)',
      [child2Id, parentId, 'Child Two', 4, pinHash, 10]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [child2Id]);
  });

  afterAll(() => {
    const db = getDb();
    // Clean up in reverse order of foreign key dependencies
    db.run('DELETE FROM child_collectibles WHERE child_id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM child_coins WHERE child_id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM children WHERE id IN (?, ?)', [child1Id, child2Id]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  /**
   * Helper to get shop items for a child using the seeded ordering
   * This simulates what the GET /collectibles endpoint should return
   */
  function getShopItemsForChild(childId: string, limit: number = 10): string[] {
    const db = getDb();

    // Get child's rowid for seeded ordering
    const childData = db.get<{ child_rowid: number }>(
      'SELECT rowid as child_rowid FROM children WHERE id = ?',
      [childId]
    );
    const childRowid = childData?.child_rowid || 1;

    // Use seeded pseudo-random ordering matching the collectibles route
    // Formula mixes child rowid with collectible rowid using multiplication for true shuffling
    const collectibles = db.all<{ id: string }>(`
      SELECT c.id
      FROM collectibles c
      LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
      WHERE cc.child_id IS NULL
      ORDER BY (((${childRowid} + 1) * (c.rowid * 2654435761)) % 2147483647)
      LIMIT ?
    `, [childId, limit]);

    return collectibles.map(c => c.id);
  }

  it('should show different item orders for different children', () => {
    const child1Items = getShopItemsForChild(child1Id);
    const child2Items = getShopItemsForChild(child2Id);

    // Both should have items
    expect(child1Items.length).toBeGreaterThan(0);
    expect(child2Items.length).toBeGreaterThan(0);

    // The order should be different for different children
    const orderIsDifferent = child1Items.some((item, index) => item !== child2Items[index]);
    expect(orderIsDifferent).toBe(true);
  });

  it('should show consistent order for the same child across requests', () => {
    const firstRequest = getShopItemsForChild(child1Id);
    const secondRequest = getShopItemsForChild(child1Id);

    // Same child should see same order
    expect(firstRequest).toEqual(secondRequest);
  });

  it('should still show owned items regardless of order', () => {
    const db = getDb();

    // Give child1 a collectible
    const collectible = db.get<{ id: string }>('SELECT id FROM collectibles LIMIT 1');
    expect(collectible).toBeDefined();

    // Check if already owned, if not, add it
    const alreadyOwned = db.get(
      'SELECT 1 FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
      [child1Id, collectible!.id]
    );

    if (!alreadyOwned) {
      db.run(
        'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
        [child1Id, collectible!.id]
      );
    }

    // Get all collectibles including owned
    const allItems = db.all<{ id: string; owned: number }>(`
      SELECT c.id,
        CASE WHEN cc.child_id IS NOT NULL THEN 1 ELSE 0 END as owned
      FROM collectibles c
      LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
    `, [child1Id]);

    // The owned item should be in the list
    const ownedItem = allItems.find(item => item.id === collectible!.id);
    expect(ownedItem).toBeDefined();
    expect(ownedItem?.owned).toBe(1);
  });

  it('should not show new items when an existing item is purchased', () => {
    const db = getDb();

    // Create a fresh child for this test
    const testChildId = uuidv4();
    const pinHash = '$2a$10$test'; // dummy hash
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash, unlocked_shop_items) VALUES (?, ?, ?, ?, ?, ?)',
      [testChildId, parentId, 'Test Child', 4, pinHash, 3]
    );
    db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [testChildId, 1000]);

    // Get child's rowid
    const childData = db.get<{ child_rowid: number }>(
      'SELECT rowid as child_rowid FROM children WHERE id = ?',
      [testChildId]
    );
    const childRowid = childData?.child_rowid || 1;

    // Get all items with row_num to simulate API behavior
    const getVisibleItems = () => {
      const unlockedCount = db.get<{ unlocked_shop_items: number }>(
        'SELECT unlocked_shop_items FROM children WHERE id = ?',
        [testChildId]
      )?.unlocked_shop_items || 3;

      const items = db.all<{ id: string; owned: number; row_num: number }>(`
        SELECT c.id,
          CASE WHEN cc.child_id IS NOT NULL THEN 1 ELSE 0 END as owned,
          ROW_NUMBER() OVER (
            ORDER BY (((${childRowid} + 1) * (c.rowid * 2654435761)) % 2147483647)
          ) as row_num
        FROM collectibles c
        LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
        ORDER BY (((${childRowid} + 1) * (c.rowid * 2654435761)) % 2147483647)
      `, [testChildId]);

      // Filter using the fixed logic: row_num <= unlockedCount OR owned
      return items.filter(c => c.row_num <= unlockedCount || c.owned === 1);
    };

    // Get initial visible items (should be 3 items at positions 1, 2, 3)
    const beforePurchase = getVisibleItems();
    expect(beforePurchase.length).toBe(3);
    const initialItemIds = beforePurchase.map(i => i.id);

    // Purchase the second item
    const itemToBuy = beforePurchase[1];
    db.run(
      'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
      [testChildId, itemToBuy.id]
    );

    // Get visible items after purchase
    const afterPurchase = getVisibleItems();

    // Should still show exactly the same 3 items (no new item 4 should appear)
    expect(afterPurchase.length).toBe(3);
    const afterItemIds = afterPurchase.map(i => i.id);
    expect(afterItemIds.sort()).toEqual(initialItemIds.sort());

    // The purchased item should now be marked as owned
    const purchasedItem = afterPurchase.find(i => i.id === itemToBuy.id);
    expect(purchasedItem?.owned).toBe(1);

    // Cleanup
    db.run('DELETE FROM child_collectibles WHERE child_id = ?', [testChildId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [testChildId]);
    db.run('DELETE FROM children WHERE id = ?', [testChildId]);
  });
});
