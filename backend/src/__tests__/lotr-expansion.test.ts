/**
 * LOTR Italian Expansion Pack tests
 * Tests for svg_path, expansion_pack fields and filtering
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('LOTR Expansion Pack', () => {
  let parentId: string;
  let childId: string;
  let testCollectibleId: string;
  const testEmail = `test-lotr-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    testCollectibleId = 'test_lotr_' + Date.now();

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
      [childId, parentId, 'LOTR Test Child', 4, pinHash, 100]
    );
    db.run('INSERT INTO child_coins (child_id, balance) VALUES (?, ?)', [childId, 10000]);

    // Create test LOTR collectible with expansion_pack and svg_path
    db.run(
      `INSERT INTO collectibles (id, name, ascii_art, price, rarity, pronunciation, svg_path, expansion_pack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testCollectibleId,
        'Test Frodino',
        '  o\n /|\\\n / \\',
        500,
        'epic',
        'Test Frodino',
        '/portraits/lotr/test-frodo.svg',
        'lotr-italian'
      ]
    );
  });

  afterAll(() => {
    const db = getDb();
    // Clean up test data
    db.run('DELETE FROM child_collectibles WHERE child_id = ?', [childId]);
    db.run('DELETE FROM child_coins WHERE child_id = ?', [childId]);
    db.run('DELETE FROM children WHERE id = ?', [childId]);
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
    db.run('DELETE FROM collectibles WHERE id = ?', [testCollectibleId]);
  });

  describe('Database schema', () => {
    it('should have svg_path column in collectibles table', () => {
      const db = getDb();
      const collectible = db.get<{ svg_path: string | null }>(
        'SELECT svg_path FROM collectibles WHERE id = ?',
        [testCollectibleId]
      );
      expect(collectible).toBeDefined();
      expect(collectible?.svg_path).toBe('/portraits/lotr/test-frodo.svg');
    });

    it('should have expansion_pack column in collectibles table', () => {
      const db = getDb();
      const collectible = db.get<{ expansion_pack: string | null }>(
        'SELECT expansion_pack FROM collectibles WHERE id = ?',
        [testCollectibleId]
      );
      expect(collectible).toBeDefined();
      expect(collectible?.expansion_pack).toBe('lotr-italian');
    });

    it('should allow null svg_path for base collectibles', () => {
      const db = getDb();
      // Get a base collectible (no expansion pack)
      const collectible = db.get<{ id: string; svg_path: string | null }>(
        'SELECT id, svg_path FROM collectibles WHERE expansion_pack IS NULL LIMIT 1'
      );
      // Base collectibles should exist and svg_path should be null
      if (collectible) {
        expect(collectible.svg_path).toBeNull();
      }
    });

    it('should allow null expansion_pack for base collectibles', () => {
      const db = getDb();
      const count = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM collectibles WHERE expansion_pack IS NULL'
      );
      // There should be many base collectibles without expansion pack
      expect(count?.count).toBeGreaterThan(0);
    });
  });

  describe('Expansion pack filtering', () => {
    it('should be able to filter collectibles by expansion_pack', () => {
      const db = getDb();
      const lotrCollectibles = db.all<{ id: string; expansion_pack: string }>(
        "SELECT id, expansion_pack FROM collectibles WHERE expansion_pack = ?",
        ['lotr-italian']
      );

      // Should find our test collectible
      expect(lotrCollectibles.length).toBeGreaterThan(0);
      expect(lotrCollectibles.every(c => c.expansion_pack === 'lotr-italian')).toBe(true);
    });

    it('should be able to get collectibles without expansion pack (base set)', () => {
      const db = getDb();
      const baseCollectibles = db.all<{ id: string; expansion_pack: string | null }>(
        'SELECT id, expansion_pack FROM collectibles WHERE expansion_pack IS NULL LIMIT 10'
      );

      expect(baseCollectibles.length).toBeGreaterThan(0);
      expect(baseCollectibles.every(c => c.expansion_pack === null)).toBe(true);
    });

    it('should include both base and expansion collectibles when no filter', () => {
      const db = getDb();
      const allCollectibles = db.all<{ id: string; expansion_pack: string | null }>(
        'SELECT id, expansion_pack FROM collectibles'
      );

      const baseCount = allCollectibles.filter(c => c.expansion_pack === null).length;
      const lotrCount = allCollectibles.filter(c => c.expansion_pack === 'lotr-italian').length;

      // Should have both base collectibles and at least our test LOTR collectible
      expect(baseCount).toBeGreaterThan(0);
      expect(lotrCount).toBeGreaterThan(0);
    });
  });

  describe('LOTR collectible data', () => {
    it('should have proper pricing for LOTR collectibles', () => {
      const db = getDb();
      const lotrPrices = db.all<{ name: string; price: number; rarity: string }>(
        "SELECT name, price, rarity FROM collectibles WHERE expansion_pack = ?",
        ['lotr-italian']
      );

      for (const item of lotrPrices) {
        switch (item.rarity) {
          case 'common':
            expect(item.price).toBe(150);
            break;
          case 'rare':
            expect(item.price).toBe(300);
            break;
          case 'epic':
            expect(item.price).toBe(500);
            break;
          case 'legendary':
            expect(item.price).toBe(1500);
            break;
          case 'mythic':
            expect(item.price).toBe(3000);
            break;
        }
      }
    });

    it('should have svg_path for all LOTR collectibles', () => {
      const db = getDb();
      const collectiblesWithoutSvg = db.all<{ id: string; name: string }>(
        "SELECT id, name FROM collectibles WHERE expansion_pack = ? AND svg_path IS NULL",
        ['lotr-italian']
      );

      // All LOTR collectibles should have svg_path (except our test one might be in the list)
      // Filter out our test collectible
      const realCollectibles = collectiblesWithoutSvg.filter(c => !c.id.startsWith('test_lotr'));
      expect(realCollectibles.length).toBe(0);
    });

    it('should have pronunciation for all LOTR collectibles', () => {
      const db = getDb();
      const collectiblesWithoutPronunciation = db.all<{ id: string; name: string }>(
        "SELECT id, name FROM collectibles WHERE expansion_pack = ? AND pronunciation IS NULL",
        ['lotr-italian']
      );

      // All LOTR collectibles should have pronunciation
      // Filter out our test collectible
      const realCollectibles = collectiblesWithoutPronunciation.filter(c => !c.id.startsWith('test_lotr'));
      expect(realCollectibles.length).toBe(0);
    });
  });

  describe('Integration with existing shop system', () => {
    it('should be purchasable like regular collectibles', () => {
      const db = getDb();

      // Get initial balance
      const initialBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [childId]
      )?.balance || 0;

      // Purchase the test LOTR collectible
      const collectible = db.get<{ price: number }>(
        'SELECT price FROM collectibles WHERE id = ?',
        [testCollectibleId]
      );

      db.transaction(() => {
        db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [collectible!.price, childId]
        );
        db.run(
          'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
          [childId, testCollectibleId]
        );
      });

      // Verify purchase
      const newBalance = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [childId]
      )?.balance || 0;

      expect(newBalance).toBe(initialBalance - collectible!.price);

      // Verify ownership
      const owned = db.get<{ collectible_id: string }>(
        'SELECT collectible_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
        [childId, testCollectibleId]
      );
      expect(owned).toBeDefined();
    });

    it('should appear in owned collectibles list', () => {
      const db = getDb();

      const ownedCollectibles = db.all<{ id: string; name: string; expansion_pack: string | null }>(
        `SELECT c.id, c.name, c.expansion_pack
         FROM collectibles c
         JOIN child_collectibles cc ON c.id = cc.collectible_id
         WHERE cc.child_id = ?`,
        [childId]
      );

      const lotrOwned = ownedCollectibles.find(c => c.id === testCollectibleId);
      expect(lotrOwned).toBeDefined();
      expect(lotrOwned?.expansion_pack).toBe('lotr-italian');
    });
  });
});
