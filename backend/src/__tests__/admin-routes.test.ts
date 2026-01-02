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

vi.mock('../data/database.js', () => ({
  getDb: vi.fn(),
  resetDb: vi.fn(),
}));

import adminRoutes from '../routes/admin.js';
import { adminJobManager } from '../services/admin-job-manager.js';
import { runScript } from '../services/script-runner.js';
import { getDb } from '../data/database.js';

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

  describe('GET /api/admin/parents', () => {
    it('should return list of all parents', async () => {
      const mockParents = [
        {
          id: 'parent-1',
          email: 'parent1@example.com',
          name: 'Parent One',
          family_code: 'FAM001',
          is_admin: 0,
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'parent-2',
          email: 'parent2@example.com',
          name: 'Parent Two',
          family_code: 'FAM002',
          is_admin: 1,
          created_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      (getDb as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockParents),
      });

      const response = await request(app)
        .get('/api/admin/parents')
        .expect(200);

      expect(response.body).toEqual(mockParents);
    });

    it('should return 500 on database error', async () => {
      (getDb as any).mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      });

      const response = await request(app)
        .get('/api/admin/parents')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch parents' });
    });
  });

  describe('GET /api/admin/children', () => {
    it('should return list of all children with coins and collectibles count', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          parent_id: 'parent-1',
          parent_name: 'Parent One',
          parent_email: 'parent1@example.com',
          name: 'Child One',
          grade_level: 4,
          birthdate: '2015-06-15',
          created_at: '2024-01-01T00:00:00.000Z',
          active_assignments: 2,
          completed_assignments: 10,
          coins: 150,
          collectibles_count: 3,
        },
        {
          id: 'child-2',
          parent_id: 'parent-2',
          parent_name: 'Parent Two',
          parent_email: 'parent2@example.com',
          name: 'Child Two',
          grade_level: 6,
          birthdate: '2013-03-20',
          created_at: '2024-01-02T00:00:00.000Z',
          active_assignments: 1,
          completed_assignments: 25,
          coins: 0,
          collectibles_count: 0,
        },
      ];

      (getDb as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockChildren),
      });

      const response = await request(app)
        .get('/api/admin/children')
        .expect(200);

      expect(response.body).toEqual(mockChildren);
      expect(response.body[0]).toHaveProperty('coins', 150);
      expect(response.body[0]).toHaveProperty('collectibles_count', 3);
      expect(response.body[1]).toHaveProperty('coins', 0);
      expect(response.body[1]).toHaveProperty('collectibles_count', 0);
    });

    it('should return 500 on database error', async () => {
      (getDb as any).mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      });

      const response = await request(app)
        .get('/api/admin/children')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch children' });
    });
  });
});
