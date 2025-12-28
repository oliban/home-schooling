import express from 'express';
import { requireDevelopment } from '../middleware/admin.js';
import { authenticateParent } from '../middleware/auth.js';
import { adminJobManager } from '../services/admin-job-manager.js';
import { runScript } from '../services/script-runner.js';
import { resetDb } from '../data/database.js';
import {
  getLastBackupTimestamp,
  getLastSyncTimestamp,
  getBackupFileCount,
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

export default router;
