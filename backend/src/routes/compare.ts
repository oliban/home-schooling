import { Router } from 'express';
import { getDb } from '../data/database.js';
import { authenticateChild } from '../middleware/auth.js';

const router = Router();

interface Peer {
  id: string;
  name: string;
  grade_level: number;
}

interface PeerCollection {
  id: string;
  name: string;
  ascii_art: string;
  rarity: string;
  pronunciation: string | null;
}

interface PeerStats {
  coins: number;
  totalEarned: number;
  streak: number;
  collectibleCount: number;
  completedAssignments: number;
  totalAssignments: number;
}

/**
 * Check if a target child is a valid peer for the requesting child
 * (either a sibling or same-grade classmate)
 */
function isPeer(db: ReturnType<typeof getDb>, requestingChildId: string, targetChildId: string): boolean {
  const requesting = db.get<{ parent_id: string; grade_level: number }>(
    'SELECT parent_id, grade_level FROM children WHERE id = ?',
    [requestingChildId]
  );

  const target = db.get<{ parent_id: string; grade_level: number }>(
    'SELECT parent_id, grade_level FROM children WHERE id = ?',
    [targetChildId]
  );

  if (!requesting || !target) return false;

  // Siblings (same parent)
  if (requesting.parent_id === target.parent_id) return true;

  // Same grade classmates (different parent but same grade)
  if (requesting.grade_level === target.grade_level) return true;

  return false;
}

/**
 * GET /compare/peers
 * List all peers (siblings + same-grade classmates) for the logged-in child
 */
router.get('/peers', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    const childId = req.child!.id;

    // Get the requesting child's info
    const child = db.get<{ parent_id: string; grade_level: number }>(
      'SELECT parent_id, grade_level FROM children WHERE id = ?',
      [childId]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get siblings (same parent, excluding self)
    const siblings = db.all<Peer>(
      `SELECT id, name, grade_level FROM children
       WHERE parent_id = ? AND id != ?
       ORDER BY name`,
      [child.parent_id, childId]
    );

    // Get same-grade classmates (different parent, same grade, excluding self)
    const classmates = db.all<Peer>(
      `SELECT id, name, grade_level FROM children
       WHERE grade_level = ? AND parent_id != ? AND id != ?
       ORDER BY name`,
      [child.grade_level, child.parent_id, childId]
    );

    res.json({
      siblings,
      classmates,
    });
  } catch (error) {
    console.error('Get peers error:', error);
    res.status(500).json({ error: 'Failed to get peers' });
  }
});

/**
 * GET /compare/:childId/collection
 * Get a peer's collectible collection
 */
router.get('/:childId/collection', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    const requestingChildId = req.child!.id;
    const targetChildId = req.params.childId;

    // Check if target is a valid peer
    if (!isPeer(db, requestingChildId, targetChildId)) {
      return res.status(403).json({ error: 'Access denied - not a peer' });
    }

    // Get the target child's collection
    const collection = db.all<PeerCollection>(
      `SELECT c.id, c.name, c.ascii_art, c.rarity, c.pronunciation
       FROM collectibles c
       JOIN child_collectibles cc ON c.id = cc.collectible_id
       WHERE cc.child_id = ?
       ORDER BY c.rarity DESC, c.name`,
      [targetChildId]
    );

    // Get target child's name
    const targetChild = db.get<{ name: string }>(
      'SELECT name FROM children WHERE id = ?',
      [targetChildId]
    );

    res.json({
      childName: targetChild?.name || 'Unknown',
      collection,
      totalCount: collection.length,
    });
  } catch (error) {
    console.error('Get peer collection error:', error);
    res.status(500).json({ error: 'Failed to get peer collection' });
  }
});

/**
 * GET /compare/:childId/stats
 * Get a peer's stats for comparison
 */
router.get('/:childId/stats', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    const requestingChildId = req.child!.id;
    const targetChildId = req.params.childId;

    // Check if target is a valid peer
    if (!isPeer(db, requestingChildId, targetChildId)) {
      return res.status(403).json({ error: 'Access denied - not a peer' });
    }

    // Get target child's info
    const targetChild = db.get<{ name: string; grade_level: number }>(
      'SELECT name, grade_level FROM children WHERE id = ?',
      [targetChildId]
    );

    if (!targetChild) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get coins and streak
    const coins = db.get<{ balance: number; total_earned: number; current_streak: number }>(
      'SELECT balance, total_earned, current_streak FROM child_coins WHERE child_id = ?',
      [targetChildId]
    );

    // Get collectible count
    const collectibleCount = db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM child_collectibles WHERE child_id = ?',
      [targetChildId]
    );

    // Get assignment stats
    const assignmentStats = db.get<{ completed: number; total: number }>(
      `SELECT
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         COUNT(*) as total
       FROM assignments WHERE child_id = ?`,
      [targetChildId]
    );

    const stats: PeerStats = {
      coins: coins?.balance || 0,
      totalEarned: coins?.total_earned || 0,
      streak: coins?.current_streak || 0,
      collectibleCount: collectibleCount?.count || 0,
      completedAssignments: assignmentStats?.completed || 0,
      totalAssignments: assignmentStats?.total || 0,
    };

    res.json({
      childName: targetChild.name,
      gradeLevel: targetChild.grade_level,
      stats,
    });
  } catch (error) {
    console.error('Get peer stats error:', error);
    res.status(500).json({ error: 'Failed to get peer stats' });
  }
});

export default router;
