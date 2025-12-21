import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { authenticateParent, authenticateChild } from '../middleware/auth.js';
import type { Child, ChildCoins, CreateChildRequest } from '../types/index.js';

const router = Router();

// List children for logged-in parent
router.get('/', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const children = db.all<Child & { coins: number }>(
      `SELECT c.*, COALESCE(cc.balance, 0) as coins
       FROM children c
       LEFT JOIN child_coins cc ON c.id = cc.child_id
       WHERE c.parent_id = ?
       ORDER BY c.name`,
      [req.user!.id]
    );

    res.json(children.map(c => ({
      id: c.id,
      name: c.name,
      birthdate: c.birthdate,
      grade_level: c.grade_level,
      coins: c.coins,
      hasPin: !!c.pin_hash
    })));
  } catch (error) {
    console.error('List children error:', error);
    res.status(500).json({ error: 'Failed to list children' });
  }
});

// Create child
router.post('/', authenticateParent, async (req, res) => {
  try {
    const { name, birthdate, grade_level, pin } = req.body as CreateChildRequest;

    if (!name || !grade_level) {
      return res.status(400).json({ error: 'Name and grade level are required' });
    }

    if (grade_level < 1 || grade_level > 9) {
      return res.status(400).json({ error: 'Grade level must be between 1 and 9' });
    }

    const db = getDb();
    const id = uuidv4();
    let pinHash = null;

    if (pin) {
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be 4 digits' });
      }
      pinHash = await bcrypt.hash(pin, 10);
    }

    db.transaction(() => {
      db.run(
        `INSERT INTO children (id, parent_id, name, birthdate, grade_level, pin_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, req.user!.id, name, birthdate || null, grade_level, pinHash]
      );

      // Initialize coins for child
      db.run(
        'INSERT INTO child_coins (child_id, balance, total_earned, current_streak) VALUES (?, 0, 0, 0)',
        [id]
      );
    });

    res.status(201).json({
      id,
      name,
      birthdate,
      grade_level,
      coins: 0,
      hasPin: !!pin
    });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// Get daily stats for all children (for progress chart with bars per child/date/subject)
// IMPORTANT: This route must be defined BEFORE /:id routes
router.get('/stats-by-date', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const period = req.query.period as string || '7d';

    // Build date filter based on period
    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND answered_at >= datetime('now', '-7 days')";
    } else if (period === '30d') {
      dateFilter = "AND answered_at >= datetime('now', '-30 days')";
    }

    // Get all children for this parent
    const childrenList = db.all<{ id: string; name: string }>(
      `SELECT id, name FROM children WHERE parent_id = ? ORDER BY name`,
      [req.user!.id]
    );

    // Get stats grouped by date for each child
    const result: Array<{
      date: string;
      childId: string;
      childName: string;
      subject: 'math' | 'reading';
      correct: number;
      incorrect: number;
    }> = [];

    for (const child of childrenList) {
      // Math stats from package-based assignments by date
      const mathPackageByDate = db.all<{ date: string; correct: number; incorrect: number }>(`
        SELECT
          date(aa.answered_at) as date,
          SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct,
          SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM assignments a
        JOIN assignment_answers aa ON a.id = aa.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'math'
          AND a.package_id IS NOT NULL
          AND aa.answered_at IS NOT NULL
          ${dateFilter.replace('answered_at', 'aa.answered_at')}
        GROUP BY date(aa.answered_at)
      `, [child.id]);

      // Math stats from legacy embedded problems by date
      const mathLegacyByDate = db.all<{ date: string; correct: number; incorrect: number }>(`
        SELECT
          date(mp.answered_at) as date,
          SUM(CASE WHEN mp.is_correct = 1 THEN 1 ELSE 0 END) as correct,
          SUM(CASE WHEN mp.is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM assignments a
        JOIN math_problems mp ON a.id = mp.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'math'
          AND a.package_id IS NULL
          AND mp.answered_at IS NOT NULL
          ${dateFilter.replace('answered_at', 'mp.answered_at')}
        GROUP BY date(mp.answered_at)
      `, [child.id]);

      // Reading stats from package-based assignments by date
      const readingPackageByDate = db.all<{ date: string; correct: number; incorrect: number }>(`
        SELECT
          date(aa.answered_at) as date,
          SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct,
          SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM assignments a
        JOIN assignment_answers aa ON a.id = aa.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'reading'
          AND a.package_id IS NOT NULL
          AND aa.answered_at IS NOT NULL
          ${dateFilter.replace('answered_at', 'aa.answered_at')}
        GROUP BY date(aa.answered_at)
      `, [child.id]);

      // Reading stats from legacy embedded questions by date
      const readingLegacyByDate = db.all<{ date: string; correct: number; incorrect: number }>(`
        SELECT
          date(rq.answered_at) as date,
          SUM(CASE WHEN rq.is_correct = 1 THEN 1 ELSE 0 END) as correct,
          SUM(CASE WHEN rq.is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM assignments a
        JOIN reading_questions rq ON a.id = rq.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'reading'
          AND a.package_id IS NULL
          AND rq.answered_at IS NOT NULL
          ${dateFilter.replace('answered_at', 'rq.answered_at')}
        GROUP BY date(rq.answered_at)
      `, [child.id]);

      // Merge math stats by date
      const mathByDate = new Map<string, { correct: number; incorrect: number }>();
      for (const row of mathPackageByDate) {
        mathByDate.set(row.date, { correct: row.correct, incorrect: row.incorrect });
      }
      for (const row of mathLegacyByDate) {
        const existing = mathByDate.get(row.date) || { correct: 0, incorrect: 0 };
        mathByDate.set(row.date, {
          correct: existing.correct + row.correct,
          incorrect: existing.incorrect + row.incorrect
        });
      }

      // Merge reading stats by date
      const readingByDate = new Map<string, { correct: number; incorrect: number }>();
      for (const row of readingPackageByDate) {
        readingByDate.set(row.date, { correct: row.correct, incorrect: row.incorrect });
      }
      for (const row of readingLegacyByDate) {
        const existing = readingByDate.get(row.date) || { correct: 0, incorrect: 0 };
        readingByDate.set(row.date, {
          correct: existing.correct + row.correct,
          incorrect: existing.incorrect + row.incorrect
        });
      }

      // Add math entries
      for (const [date, stats] of mathByDate) {
        result.push({
          date,
          childId: child.id,
          childName: child.name,
          subject: 'math',
          correct: stats.correct,
          incorrect: stats.incorrect
        });
      }

      // Add reading entries
      for (const [date, stats] of readingByDate) {
        result.push({
          date,
          childId: child.id,
          childName: child.name,
          subject: 'reading',
          correct: stats.correct,
          incorrect: stats.incorrect
        });
      }
    }

    // Sort by date descending, then by child name, then by subject
    result.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const nameCompare = a.childName.localeCompare(b.childName);
      if (nameCompare !== 0) return nameCompare;
      return a.subject.localeCompare(b.subject);
    });

    res.json(result);
  } catch (error) {
    console.error('Get children stats by date error:', error);
    res.status(500).json({ error: 'Failed to get children stats by date' });
  }
});

// Get aggregated stats for all children (for progress chart)
// IMPORTANT: This route must be defined BEFORE /:id routes
router.get('/stats', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const period = req.query.period as string || 'all';

    // Build date filter based on period
    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND answered_at >= datetime('now', '-7 days')";
    } else if (period === '30d') {
      dateFilter = "AND answered_at >= datetime('now', '-30 days')";
    }

    // Get all children for this parent with their stats
    const childrenList = db.all<{ id: string; name: string }>(
      `SELECT id, name FROM children WHERE parent_id = ? ORDER BY name`,
      [req.user!.id]
    );

    const stats = childrenList.map(child => {
      // Math stats - package-based assignments
      const mathPackage = db.get<{ correct: number; incorrect: number }>(`
        SELECT
          COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct,
          COALESCE(SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END), 0) as incorrect
        FROM assignments a
        JOIN assignment_answers aa ON a.id = aa.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'math'
          AND a.package_id IS NOT NULL
          ${dateFilter.replace('answered_at', 'aa.answered_at')}
      `, [child.id]) || { correct: 0, incorrect: 0 };

      // Math stats - legacy embedded problems
      const mathLegacy = db.get<{ correct: number; incorrect: number }>(`
        SELECT
          COALESCE(SUM(CASE WHEN mp.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct,
          COALESCE(SUM(CASE WHEN mp.is_correct = 0 THEN 1 ELSE 0 END), 0) as incorrect
        FROM assignments a
        JOIN math_problems mp ON a.id = mp.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'math'
          AND a.package_id IS NULL
          ${dateFilter.replace('answered_at', 'mp.answered_at')}
      `, [child.id]) || { correct: 0, incorrect: 0 };

      // Reading stats - package-based assignments
      const readingPackage = db.get<{ correct: number; incorrect: number }>(`
        SELECT
          COALESCE(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct,
          COALESCE(SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END), 0) as incorrect
        FROM assignments a
        JOIN assignment_answers aa ON a.id = aa.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'reading'
          AND a.package_id IS NOT NULL
          ${dateFilter.replace('answered_at', 'aa.answered_at')}
      `, [child.id]) || { correct: 0, incorrect: 0 };

      // Reading stats - legacy embedded questions
      const readingLegacy = db.get<{ correct: number; incorrect: number }>(`
        SELECT
          COALESCE(SUM(CASE WHEN rq.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct,
          COALESCE(SUM(CASE WHEN rq.is_correct = 0 THEN 1 ELSE 0 END), 0) as incorrect
        FROM assignments a
        JOIN reading_questions rq ON a.id = rq.assignment_id
        WHERE a.child_id = ?
          AND a.assignment_type = 'reading'
          AND a.package_id IS NULL
          ${dateFilter.replace('answered_at', 'rq.answered_at')}
      `, [child.id]) || { correct: 0, incorrect: 0 };

      return {
        childId: child.id,
        childName: child.name,
        math: {
          correct: mathPackage.correct + mathLegacy.correct,
          incorrect: mathPackage.incorrect + mathLegacy.incorrect
        },
        reading: {
          correct: readingPackage.correct + readingLegacy.correct,
          incorrect: readingPackage.incorrect + readingLegacy.incorrect
        }
      };
    });

    res.json(stats);
  } catch (error) {
    console.error('Get children stats error:', error);
    res.status(500).json({ error: 'Failed to get children stats' });
  }
});

// Get child details
router.get('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const child = db.get<Child & ChildCoins>(
      `SELECT c.*, cc.balance, cc.total_earned, cc.current_streak
       FROM children c
       LEFT JOIN child_coins cc ON c.id = cc.child_id
       WHERE c.id = ? AND c.parent_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({
      id: child.id,
      name: child.name,
      birthdate: child.birthdate,
      grade_level: child.grade_level,
      hasPin: !!child.pin_hash,
      coins: child.balance || 0,
      totalEarned: child.total_earned || 0,
      currentStreak: child.current_streak || 0
    });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({ error: 'Failed to get child' });
  }
});

// Update child
router.put('/:id', authenticateParent, async (req, res) => {
  try {
    const { name, birthdate, grade_level, pin } = req.body;
    const db = getDb();

    // Verify child belongs to parent
    const existing = db.get<Child>(
      'SELECT id FROM children WHERE id = ? AND parent_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (birthdate !== undefined) {
      updates.push('birthdate = ?');
      values.push(birthdate || null);
    }

    if (grade_level) {
      if (grade_level < 1 || grade_level > 9) {
        return res.status(400).json({ error: 'Grade level must be between 1 and 9' });
      }
      updates.push('grade_level = ?');
      values.push(grade_level);
    }

    if (pin !== undefined) {
      if (pin === null || pin === '') {
        updates.push('pin_hash = NULL');
      } else {
        if (pin.length !== 4 || !/^\d+$/.test(pin)) {
          return res.status(400).json({ error: 'PIN must be 4 digits' });
        }
        const pinHash = await bcrypt.hash(pin, 10);
        updates.push('pin_hash = ?');
        values.push(pinHash);
      }
    }

    if (updates.length > 0) {
      values.push(req.params.id);
      db.run(
        `UPDATE children SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// Delete child
router.delete('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();

    const result = db.run(
      'DELETE FROM children WHERE id = ? AND parent_id = ?',
      [req.params.id, req.user!.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({ error: 'Failed to delete child' });
  }
});

// Get child progress stats
router.get('/:id/progress', authenticateParent, (req, res) => {
  try {
    const db = getDb();

    // Verify ownership
    const child = db.get<Child>(
      'SELECT id, name FROM children WHERE id = ? AND parent_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const stats = db.get<{
      total_assignments: number;
      completed_assignments: number;
      math_correct: number;
      math_total: number;
      reading_correct: number;
      reading_total: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM assignments WHERE child_id = ?) as total_assignments,
        (SELECT COUNT(*) FROM assignments WHERE child_id = ? AND status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM math_problems mp JOIN assignments a ON mp.assignment_id = a.id WHERE a.child_id = ? AND mp.is_correct = 1) as math_correct,
        (SELECT COUNT(*) FROM math_problems mp JOIN assignments a ON mp.assignment_id = a.id WHERE a.child_id = ? AND mp.child_answer IS NOT NULL) as math_total,
        (SELECT COUNT(*) FROM reading_questions rq JOIN assignments a ON rq.assignment_id = a.id WHERE a.child_id = ? AND rq.is_correct = 1) as reading_correct,
        (SELECT COUNT(*) FROM reading_questions rq JOIN assignments a ON rq.assignment_id = a.id WHERE a.child_id = ? AND rq.child_answer IS NOT NULL) as reading_total
    `, [req.params.id, req.params.id, req.params.id, req.params.id, req.params.id, req.params.id]);

    res.json({
      childName: child.name,
      ...stats
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get child's coins (for child dashboard refresh)
router.get('/:id/coins', authenticateChild, (req, res) => {
  try {
    const db = getDb();

    // Verify child is requesting their own coins
    if (req.child!.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const coins = db.get<{ balance: number; current_streak: number; total_earned: number }>(
      'SELECT balance, current_streak, total_earned FROM child_coins WHERE child_id = ?',
      [req.params.id]
    );

    res.json({
      balance: coins?.balance || 0,
      current_streak: coins?.current_streak || 0,
      total_earned: coins?.total_earned || 0
    });
  } catch (error) {
    console.error('Get coins error:', error);
    res.status(500).json({ error: 'Failed to get coins' });
  }
});

export default router;
