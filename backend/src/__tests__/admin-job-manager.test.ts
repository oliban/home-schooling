/**
 * Admin job manager tests
 * Tests background job tracking for backup and sync operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminJobManager } from '../services/admin-job-manager.js';

describe('AdminJobManager', () => {
  let jobManager: AdminJobManager;

  beforeEach(() => {
    jobManager = new AdminJobManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startJob', () => {
    it('should start a backup job', () => {
      const job = jobManager.startJob('backup');

      expect(job).not.toBeNull();
      expect(job?.type).toBe('backup');
      expect(job?.status).toBe('running');
      expect(job?.id).toBeDefined();
      expect(job?.startedAt).toBeTypeOf('number');
      expect(job?.output).toBe('');
    });

    it('should start a sync job', () => {
      const job = jobManager.startJob('sync');

      expect(job).not.toBeNull();
      expect(job?.type).toBe('sync');
      expect(job?.status).toBe('running');
    });

    it('should return null when trying to start concurrent job', () => {
      const job1 = jobManager.startJob('backup');
      expect(job1).not.toBeNull();

      const job2 = jobManager.startJob('sync');
      expect(job2).toBeNull();
    });

    it('should allow starting a new job after previous one completes', () => {
      const job1 = jobManager.startJob('backup');
      expect(job1).not.toBeNull();

      jobManager.completeJob(job1!.id, true);

      const job2 = jobManager.startJob('sync');
      expect(job2).not.toBeNull();
      expect(job2?.type).toBe('sync');
    });
  });

  describe('getActiveJob', () => {
    it('should return null when no job is running', () => {
      const activeJob = jobManager.getActiveJob();
      expect(activeJob).toBeNull();
    });

    it('should return current job when running', () => {
      const job = jobManager.startJob('backup');
      const activeJob = jobManager.getActiveJob();

      expect(activeJob).not.toBeNull();
      expect(activeJob?.id).toBe(job?.id);
      expect(activeJob?.type).toBe('backup');
    });

    it('should return null after job completes', () => {
      const job = jobManager.startJob('backup');
      jobManager.completeJob(job!.id, true);

      const activeJob = jobManager.getActiveJob();
      expect(activeJob).toBeNull();
    });
  });

  describe('appendOutput', () => {
    it('should append output to job', () => {
      const job = jobManager.startJob('backup');
      
      jobManager.appendOutput(job!.id, 'Line 1\n');
      jobManager.appendOutput(job!.id, 'Line 2\n');

      const activeJob = jobManager.getActiveJob();
      expect(activeJob?.output).toBe('Line 1\nLine 2\n');
    });

    it('should limit output to last 100 lines', () => {
      const job = jobManager.startJob('backup');

      // Add 150 lines
      for (let i = 1; i <= 150; i++) {
        jobManager.appendOutput(job!.id, `Line ${i}\n`);
      }

      const activeJob = jobManager.getActiveJob();
      const lines = activeJob!.output.trim().split('\n');

      expect(lines.length).toBe(100);
      expect(lines[0]).toBe('Line 51');
      expect(lines[99]).toBe('Line 150');
    });

    it('should handle empty strings', () => {
      const job = jobManager.startJob('backup');
      
      jobManager.appendOutput(job!.id, '');
      jobManager.appendOutput(job!.id, 'Test\n');

      const activeJob = jobManager.getActiveJob();
      expect(activeJob?.output).toBe('Test\n');
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed successfully', () => {
      const job = jobManager.startJob('backup');
      
      jobManager.completeJob(job!.id, true);

      const activeJob = jobManager.getActiveJob();
      expect(activeJob).toBeNull();

      // Job should still exist but not be active
      const completedJob = jobManager['jobs'].get(job!.id);
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.completedAt).toBeTypeOf('number');
      expect(completedJob?.error).toBeUndefined();
    });

    it('should mark job as failed with error', () => {
      const job = jobManager.startJob('backup');
      
      jobManager.completeJob(job!.id, false, 'Script exited with code 1');

      const activeJob = jobManager.getActiveJob();
      expect(activeJob).toBeNull();

      const failedJob = jobManager['jobs'].get(job!.id);
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.error).toBe('Script exited with code 1');
      expect(failedJob?.completedAt).toBeTypeOf('number');
    });

    it('should not error when completing non-existent job', () => {
      expect(() => {
        jobManager.completeJob('non-existent-id', true);
      }).not.toThrow();
    });
  });

  describe('cleanupOldJobs', () => {
    it('should remove jobs older than 5 minutes', () => {
      const job1 = jobManager.startJob('backup');
      jobManager.completeJob(job1!.id, true);

      // Advance time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      const job2 = jobManager.startJob('sync');
      jobManager.completeJob(job2!.id, true);

      jobManager.cleanupOldJobs();

      // job1 should be cleaned up, job2 should remain
      expect(jobManager['jobs'].has(job1!.id)).toBe(false);
      expect(jobManager['jobs'].has(job2!.id)).toBe(true);
    });

    it('should keep jobs newer than 5 minutes', () => {
      const job = jobManager.startJob('backup');
      jobManager.completeJob(job!.id, true);

      // Advance time by 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);

      jobManager.cleanupOldJobs();

      // Job should still exist
      expect(jobManager['jobs'].has(job!.id)).toBe(true);
    });

    it('should not remove active jobs', () => {
      const job = jobManager.startJob('backup');

      // Advance time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      jobManager.cleanupOldJobs();

      // Active job should still exist
      expect(jobManager['jobs'].has(job!.id)).toBe(true);
      expect(jobManager.getActiveJob()).not.toBeNull();
    });
  });

  describe('job lifecycle', () => {
    it('should handle complete job lifecycle', () => {
      // Start job
      const job = jobManager.startJob('backup');
      expect(job?.status).toBe('running');
      expect(jobManager.getActiveJob()).not.toBeNull();

      // Add output
      jobManager.appendOutput(job!.id, 'Starting backup...\n');
      jobManager.appendOutput(job!.id, 'Downloading...\n');
      expect(jobManager.getActiveJob()?.output).toContain('Starting backup');

      // Complete job
      jobManager.completeJob(job!.id, true);
      expect(jobManager.getActiveJob()).toBeNull();

      // Verify completed job data
      const completedJob = jobManager['jobs'].get(job!.id);
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.output).toContain('Downloading');
    });
  });
});
