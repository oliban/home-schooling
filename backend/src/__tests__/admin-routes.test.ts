/**
 * Admin routes tests
 * Tests for backup/sync admin endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('../middleware/admin.js', () => ({
  requireDevelopment: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

vi.mock('../middleware/auth.js', () => ({
  authenticateParent: (req: any, res: any, next: any) => {
    req.user = { id: 'test-parent-id', email: 'test@example.com', type: 'parent' };
    next();
  },
}));

vi.mock('../utils/backup-timestamps.js', () => ({
  getLastBackupTimestamp: () => 1735369984000,
  getLastSyncTimestamp: () => 1735371784000,
  getBackupFileCount: () => 5,
}));

vi.mock('../services/admin-job-manager.js', () => {
  const mockJobManager = {
    startJob: vi.fn(),
    getActiveJob: vi.fn(),
    appendOutput: vi.fn(),
    completeJob: vi.fn(),
  };
  return {
    adminJobManager: mockJobManager,
  };
});

vi.mock('../services/script-runner.js', () => ({
  runScript: vi.fn(),
}));

import adminRoutes from '../routes/admin.js';
import { adminJobManager } from '../services/admin-job-manager.js';
import { runScript } from '../services/script-runner.js';

describe('Admin Routes', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  describe('GET /api/admin/backup-status', () => {
    it('should return backup status', async () => {
      const response = await request(app)
        .get('/api/admin/backup-status')
        .expect(200);

      expect(response.body).toEqual({
        lastBackup: 1735369984000,
        lastSync: 1735371784000,
        backupFiles: 5,
      });
    });
  });

  describe('POST /api/admin/backup', () => {
    it('should start a backup job', async () => {
      const mockJob = {
        id: 'test-job-id',
        type: 'backup',
        status: 'running',
        startedAt: Date.now(),
        output: '',
      };

      (adminJobManager.startJob as any).mockReturnValue(mockJob);
      (runScript as any).mockResolvedValue({ success: true, output: '', exitCode: 0 });

      const response = await request(app)
        .post('/api/admin/backup')
        .expect(200);

      expect(response.body).toEqual({
        jobId: 'test-job-id',
        status: 'running',
      });

      expect(adminJobManager.startJob).toHaveBeenCalledWith('backup');
    });

    it('should return 409 when job already running', async () => {
      (adminJobManager.startJob as any).mockReturnValue(null);

      const response = await request(app)
        .post('/api/admin/backup')
        .expect(409);

      expect(response.body).toEqual({
        error: 'Another operation is already in progress',
      });
    });
  });

  describe('POST /api/admin/sync', () => {
    it('should start a sync job', async () => {
      const mockJob = {
        id: 'test-sync-job-id',
        type: 'sync',
        status: 'running',
        startedAt: Date.now(),
        output: '',
      };

      (adminJobManager.startJob as any).mockReturnValue(mockJob);
      (runScript as any).mockResolvedValue({ success: true, output: '', exitCode: 0 });

      const response = await request(app)
        .post('/api/admin/sync')
        .expect(200);

      expect(response.body).toEqual({
        jobId: 'test-sync-job-id',
        status: 'running',
      });

      expect(adminJobManager.startJob).toHaveBeenCalledWith('sync');
    });

    it('should return 409 when job already running', async () => {
      (adminJobManager.startJob as any).mockReturnValue(null);

      const response = await request(app)
        .post('/api/admin/sync')
        .expect(409);

      expect(response.body).toEqual({
        error: 'Another operation is already in progress',
      });
    });
  });

  describe('GET /api/admin/active-job', () => {
    it('should return null when no active job', async () => {
      (adminJobManager.getActiveJob as any).mockReturnValue(null);

      const response = await request(app)
        .get('/api/admin/active-job')
        .expect(200);

      expect(response.body).toEqual({ job: null });
    });

    it('should return job when running', async () => {
      const mockJob = {
        id: 'test-job-id',
        type: 'backup',
        status: 'running',
        startedAt: Date.now(),
        output: 'Running...',
      };

      (adminJobManager.getActiveJob as any).mockReturnValue(mockJob);

      const response = await request(app)
        .get('/api/admin/active-job')
        .expect(200);

      expect(response.body.job).toMatchObject({
        id: 'test-job-id',
        type: 'backup',
        status: 'running',
      });
    });
  });
});
