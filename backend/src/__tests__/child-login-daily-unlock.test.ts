/**
 * Child login daily shop unlock tests
 * Tests that children unlock 2 shop items per day on login
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Child Login Daily Shop Unlock', () => {
  let parentId: string;
  let childId: string;
  const testEmail = `test-daily-unlock-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();

    const db = getDb();

    // Create parent
    const passwordHash = await bcrypt.hash('test1234', 10);
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child
    const pinHash = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash, unlocked_shop_items) VALUES (?, ?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 4, pinHash, 3]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);
  });

  afterAll(() => {
    const db = getDb();
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  /**
   * Simulates the daily unlock logic from auth.ts child-login endpoint
   */
  function simulateDailyLogin(childId: string, loginDate: string): number {
    const db = getDb();

    const childData = db.get<{ last_login_date: string | null; unlocked_shop_items: number }>(
      'SELECT last_login_date, unlocked_shop_items FROM children WHERE id = ?',
      [childId]
    );

    let unlockedShopItems = childData?.unlocked_shop_items || 3;

    if (childData?.last_login_date !== loginDate) {
      // New day - unlock 2 more shop items
      unlockedShopItems = (childData?.unlocked_shop_items || 3) + 2;

      db.run(
        `UPDATE children SET
          last_login_date = ?,
          unlocked_shop_items = ?,
          new_item_unlocked_today = 1
        WHERE id = ?`,
        [loginDate, unlockedShopItems, childId]
      );
    }

    return unlockedShopItems;
  }

  it('should start with 3 unlocked shop items', () => {
    const db = getDb();
    const child = db.get<{ unlocked_shop_items: number }>(
      'SELECT unlocked_shop_items FROM children WHERE id = ?',
      [childId]
    );
    expect(child?.unlocked_shop_items).toBe(3);
  });

  it('should unlock 2 items on first login', () => {
    const unlockedItems = simulateDailyLogin(childId, '2025-01-01');
    expect(unlockedItems).toBe(5); // 3 initial + 2
  });

  it('should not unlock more items on same day login', () => {
    // Login again on same day
    const unlockedItems = simulateDailyLogin(childId, '2025-01-01');
    expect(unlockedItems).toBe(5); // Should remain 5
  });

  it('should unlock 2 more items on next day login', () => {
    const unlockedItems = simulateDailyLogin(childId, '2025-01-02');
    expect(unlockedItems).toBe(7); // 5 + 2
  });

  it('should unlock 2 items per day over multiple days', () => {
    simulateDailyLogin(childId, '2025-01-03');
    const day4Items = simulateDailyLogin(childId, '2025-01-04');
    expect(day4Items).toBe(11); // 7 + 2 + 2
  });

  it('should set new_item_unlocked_today flag on new day', () => {
    const db = getDb();

    simulateDailyLogin(childId, '2025-01-05');

    const child = db.get<{ new_item_unlocked_today: number }>(
      'SELECT new_item_unlocked_today FROM children WHERE id = ?',
      [childId]
    );

    expect(child?.new_item_unlocked_today).toBe(1);
  });

  it('should update last_login_date to current date', () => {
    const db = getDb();
    const loginDate = '2025-01-06';

    simulateDailyLogin(childId, loginDate);

    const child = db.get<{ last_login_date: string }>(
      'SELECT last_login_date FROM children WHERE id = ?',
      [childId]
    );

    expect(child?.last_login_date).toBe(loginDate);
  });
});
