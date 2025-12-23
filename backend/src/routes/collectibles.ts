import { Router } from 'express';
import { getDb } from '../data/database.js';
import { authenticateChild } from '../middleware/auth.js';
import type { Collectible, ChildCollectible } from '../types/index.js';

const router = Router();

// Get all collectibles with ownership status (limited by unlocked count for shop)
router.get('/', authenticateChild, (req, res) => {
  try {
    const db = getDb();

    // Get child's unlocked shop items count and rowid for seeded ordering
    const childData = db.get<{ unlocked_shop_items: number; child_rowid: number }>(
      'SELECT unlocked_shop_items, rowid as child_rowid FROM children WHERE id = ?',
      [req.child!.id]
    );
    const unlockedCount = childData?.unlocked_shop_items || 3;
    const childRowid = childData?.child_rowid || 1;

    // Get all collectibles with ownership status
    // Uses seeded pseudo-random ordering so each child sees a unique shop order
    // Formula mixes child rowid with collectible rowid using multiplication for true shuffling
    const collectibles = db.all<Collectible & { owned: number; row_num: number }>(`
      SELECT c.*,
        CASE WHEN cc.child_id IS NOT NULL THEN 1 ELSE 0 END as owned,
        ROW_NUMBER() OVER (
          ORDER BY (((${childRowid} + 1) * (c.rowid * 2654435761)) % 2147483647)
        ) as row_num
      FROM collectibles c
      LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
      ORDER BY (((${childRowid} + 1) * (c.rowid * 2654435761)) % 2147483647)
    `, [req.child!.id]);

    // Show items based on their position in the random order (row_num)
    // This ensures buying an item doesn't cause new items to appear
    // Items are visible if:
    // 1. They were unlocked (row_num <= unlockedCount), OR
    // 2. They are owned (bought before they were naturally unlocked, or still owned)
    const filteredCollectibles = collectibles.filter(c => {
      return c.row_num <= unlockedCount || c.owned === 1;
    });

    res.json({
      collectibles: filteredCollectibles.map(c => ({
        id: c.id,
        name: c.name,
        ascii_art: c.ascii_art,
        price: c.price,
        rarity: c.rarity,
        owned: c.owned === 1
      })),
      unlockedCount,
      totalCount: collectibles.length
    });
  } catch (error) {
    console.error('List collectibles error:', error);
    res.status(500).json({ error: 'Failed to list collectibles' });
  }
});

// Get child's owned collectibles
router.get('/owned', authenticateChild, (req, res) => {
  try {
    const db = getDb();

    const owned = db.all<Collectible & { acquired_at: string }>(`
      SELECT c.*, cc.acquired_at
      FROM collectibles c
      JOIN child_collectibles cc ON c.id = cc.collectible_id
      WHERE cc.child_id = ?
      ORDER BY cc.acquired_at DESC
    `, [req.child!.id]);

    res.json(owned);
  } catch (error) {
    console.error('List owned collectibles error:', error);
    res.status(500).json({ error: 'Failed to list owned collectibles' });
  }
});

// Purchase collectible
router.post('/:id/buy', authenticateChild, (req, res) => {
  try {
    const db = getDb();

    const collectible = db.get<Collectible>(
      'SELECT * FROM collectibles WHERE id = ?',
      [req.params.id]
    );

    if (!collectible) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    // Check if already owned
    const alreadyOwned = db.get<ChildCollectible>(
      'SELECT * FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
      [req.child!.id, req.params.id]
    );

    if (alreadyOwned) {
      return res.status(400).json({ error: 'You already own this collectible' });
    }

    // Check balance
    const coins = db.get<{ balance: number }>(
      'SELECT balance FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    if (!coins || coins.balance < collectible.price) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    // Purchase transaction with validation
    // CRITICAL FIX: Validate that INSERT succeeded
    // Background: Harry's purchase of "Brainiac Thinkertino" failed silently because
    // we didn't check db.run().changes. The PRIMARY KEY (child_id, collectible_id)
    // constraint can cause INSERT to fail if duplicate purchase attempted.
    // We must verify changes === 1 to ensure ownership record was created.
    const purchaseResult = db.transaction(() => {
      // 1. Deduct coins
      const updateResult = db.run(
        'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
        [collectible.price, req.child!.id]
      );

      // Verify UPDATE affected exactly 1 row
      if (updateResult.changes !== 1) {
        throw new Error('Failed to deduct coins');
      }

      // 2. Create ownership record
      const insertResult = db.run(
        'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
        [req.child!.id, req.params.id]
      );

      // CRITICAL: Verify INSERT succeeded (changes === 1)
      if (insertResult.changes !== 1) {
        throw new Error('Failed to create ownership record');
      }

      return insertResult;
    });

    // 3. Verify ownership record exists in database (belt-and-suspenders check)
    const verifyOwnership = db.get<{ child_id: string }>(
      'SELECT child_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
      [req.child!.id, req.params.id]
    );

    if (!verifyOwnership) {
      // This should never happen if transaction worked, but fail-safe
      console.error('CRITICAL: Ownership record missing after successful transaction', {
        childId: req.child!.id,
        collectibleId: req.params.id
      });
      return res.status(500).json({
        error: 'Purchase failed - ownership record not created. Please contact support.'
      });
    }

    const newBalance = db.get<{ balance: number }>(
      'SELECT balance FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    res.json({
      success: true,
      collectible,
      newBalance: newBalance?.balance || 0
    });
  } catch (error) {
    console.error('Purchase collectible error:', error);

    // Better error messages for specific failures
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint') ||
          error.message.includes('ownership record')) {
        return res.status(400).json({
          error: 'You already own this collectible'
        });
      }
      if (error.message.includes('deduct coins')) {
        return res.status(500).json({
          error: 'Failed to process payment'
        });
      }
    }

    res.status(500).json({ error: 'Failed to purchase collectible' });
  }
});

// Clear new item alert flag
router.post('/clear-alert', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    db.run(
      'UPDATE children SET new_item_unlocked_today = 0 WHERE id = ?',
      [req.child!.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Clear alert error:', error);
    res.status(500).json({ error: 'Failed to clear alert' });
  }
});

export default router;
