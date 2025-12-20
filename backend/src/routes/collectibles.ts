import { Router } from 'express';
import { getDb } from '../data/database.js';
import { authenticateChild } from '../middleware/auth.js';
import type { Collectible, ChildCollectible } from '../types/index.js';

const router = Router();

// Get all collectibles with ownership status (limited by unlocked count for shop)
router.get('/', authenticateChild, (req, res) => {
  try {
    const db = getDb();

    // Get child's unlocked shop items count
    const childData = db.get<{ unlocked_shop_items: number }>(
      'SELECT unlocked_shop_items FROM children WHERE id = ?',
      [req.child!.id]
    );
    const unlockedCount = childData?.unlocked_shop_items || 3;

    // Get all collectibles with ownership status
    const collectibles = db.all<Collectible & { owned: number; row_num: number }>(`
      SELECT c.*,
        CASE WHEN cc.child_id IS NOT NULL THEN 1 ELSE 0 END as owned,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE c.rarity
              WHEN 'common' THEN 1
              WHEN 'rare' THEN 2
              WHEN 'epic' THEN 3
              WHEN 'legendary' THEN 4
            END,
            c.price
        ) as row_num
      FROM collectibles c
      LEFT JOIN child_collectibles cc ON c.id = cc.collectible_id AND cc.child_id = ?
      ORDER BY
        CASE c.rarity
          WHEN 'common' THEN 1
          WHEN 'rare' THEN 2
          WHEN 'epic' THEN 3
          WHEN 'legendary' THEN 4
        END,
        c.price
    `, [req.child!.id]);

    // For shop items (not owned), only show up to unlockedCount
    // Owned items are always visible
    let shopItemsShown = 0;
    const filteredCollectibles = collectibles.filter(c => {
      if (c.owned === 1) {
        return true; // Always show owned items
      }
      // For shop items, limit to unlockedCount
      if (shopItemsShown < unlockedCount) {
        shopItemsShown++;
        return true;
      }
      return false;
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

    // Purchase
    db.transaction(() => {
      db.run(
        'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
        [collectible.price, req.child!.id]
      );

      db.run(
        'INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)',
        [req.child!.id, req.params.id]
      );
    });

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
