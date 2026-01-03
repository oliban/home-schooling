import express from 'express';
import { requireDevelopment, requireAdmin } from '../middleware/admin.js';
import { authenticateParent } from '../middleware/auth.js';
import { adminJobManager } from '../services/admin-job-manager.js';
import { runScript } from '../services/script-runner.js';
import { resetDb, getDb } from '../data/database.js';
import {
  getLastBackupTimestamp,
  getLastSyncTimestamp,
  getBackupFileCount,
  getSyncInfo,
} from '../utils/backup-timestamps.js';

const router = express.Router();

/**
 * GET /api/admin/backup-status
 * Returns timestamps and counts for backup operations
 */
router.get('/backup-status', requireDevelopment, authenticateParent, (req, res) => {
  const lastBackup = getLastBackupTimestamp();
  const lastSync = getLastSyncTimestamp();
  const backupFiles = getBackupFileCount();

  res.json({ lastBackup, lastSync, backupFiles });
});

/**
 * GET /api/admin/sync-info
 * Returns detailed sync info from the last restore operation
 */
router.get('/sync-info', requireDevelopment, (req, res) => {
  const syncInfo = getSyncInfo();
  res.json(syncInfo);
});

/**
 * POST /api/admin/backup
 * Triggers a production database backup
 */
router.post('/backup', requireDevelopment, authenticateParent, async (req, res) => {
  const job = adminJobManager.startJob('backup');

  if (!job) {
    return res.status(409).json({ error: 'Another operation is already in progress' });
  }

  // Run script in background
  runScript('backup-prod.sh', (data) => {
    adminJobManager.appendOutput(job.id, data);
  }).then((result) => {
    adminJobManager.completeJob(job.id, result.success, result.error);
  });

  res.json({ jobId: job.id, status: 'running' });
});

/**
 * POST /api/admin/sync
 * Syncs production backup to local development database
 */
router.post('/sync', requireDevelopment, authenticateParent, async (req, res) => {
  const job = adminJobManager.startJob('sync');

  if (!job) {
    return res.status(409).json({ error: 'Another operation is already in progress' });
  }

  // Run script in background
  runScript('restore-local.sh', (data) => {
    adminJobManager.appendOutput(job.id, data);
  }).then((result) => {
    // If sync successful, reset database connection to use new file
    if (result.success) {
      resetDb();
    }
    adminJobManager.completeJob(job.id, result.success, result.error);
  });

  res.json({ jobId: job.id, status: 'running' });
});

/**
 * GET /api/admin/active-job
 * Returns the currently running job or null
 */
router.get('/active-job', requireDevelopment, authenticateParent, (req, res) => {
  const job = adminJobManager.getActiveJob();
  res.json({ job });
});

/**
 * GET /api/admin/job/:id
 * Returns a specific job by ID (for fetching final status after completion)
 */
router.get('/job/:id', requireDevelopment, authenticateParent, (req, res) => {
  const job = adminJobManager.getJob(req.params.id);
  res.json({ job });
});

/**
 * GET /api/admin/parents
 * Returns list of all parents in the system (admin only)
 */
router.get('/parents', authenticateParent, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const parents = db.all(
      'SELECT id, email, name, family_code, is_admin, created_at FROM parents ORDER BY name'
    );
    res.json(parents);
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
});

/**
 * GET /api/admin/children
 * Returns list of all children with parent info and assignment counts (admin only)
 */
router.get('/children', authenticateParent, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const children = db.all(`
      SELECT
        c.id,
        c.parent_id,
        c.name,
        c.grade_level,
        c.birthdate,
        c.created_at,
        p.name as parent_name,
        p.email as parent_email,
        (SELECT COUNT(*) FROM assignments a WHERE a.child_id = c.id AND a.status IN ('pending', 'in_progress')) as active_assignments,
        (SELECT COUNT(*) FROM assignments a WHERE a.child_id = c.id AND a.status = 'completed') as completed_assignments,
        COALESCE(cc.balance, 0) as coins,
        (SELECT COUNT(*) FROM child_collectibles chc WHERE chc.child_id = c.id) as collectibles_count
      FROM children c
      JOIN parents p ON c.parent_id = p.id
      LEFT JOIN child_coins cc ON c.id = cc.child_id
      ORDER BY c.name
    `);
    res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

export default router;
