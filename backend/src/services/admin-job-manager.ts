import { randomUUID } from 'crypto';

export interface AdminJob {
  id: string;
  type: 'backup' | 'sync';
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  error?: string;
  output: string;
}

/**
 * Manages background jobs for admin operations (backup, sync).
 * Ensures only one job runs at a time and handles cleanup.
 */
export class AdminJobManager {
  private jobs = new Map<string, AdminJob>();
  private activeJobId: string | null = null;

  /**
   * Starts a new job if no job is currently running.
   * Returns null if a job is already active.
   */
  startJob(type: 'backup' | 'sync'): AdminJob | null {
    if (this.activeJobId !== null) {
      return null;
    }

    const job: AdminJob = {
      id: randomUUID(),
      type,
      status: 'running',
      startedAt: Date.now(),
      output: '',
    };

    this.jobs.set(job.id, job);
    this.activeJobId = job.id;

    return job;
  }

  /**
   * Returns the currently active job, or null if no job is running.
   */
  getActiveJob(): AdminJob | null {
    if (this.activeJobId === null) {
      return null;
    }

    return this.jobs.get(this.activeJobId) || null;
  }

  /**
   * Appends output to a job, limiting to last 100 lines.
   */
  appendOutput(jobId: string, data: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.output += data;

    // Limit to last 100 lines (filter empty to count actual lines)
    const lines = job.output.split('\n');
    const nonEmptyLines = lines.filter(line => line.length > 0);

    if (nonEmptyLines.length > 100) {
      const limitedLines = nonEmptyLines.slice(-100);
      job.output = limitedLines.join('\n') + '\n';
    }
  }

  /**
   * Marks a job as completed or failed and clears the active job.
   */
  completeJob(jobId: string, success: boolean, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = success ? 'completed' : 'failed';
    job.completedAt = Date.now();
    
    if (error) {
      job.error = error;
    }

    // Clear active job
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
    }

    // Schedule cleanup
    setTimeout(() => this.cleanupOldJobs(), 1000);
  }

  /**
   * Removes completed jobs older than 5 minutes.
   */
  cleanupOldJobs(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    for (const [id, job] of this.jobs.entries()) {
      // Don't clean up active jobs
      if (id === this.activeJobId) continue;

      // Don't clean up running jobs
      if (job.status === 'running') continue;

      // Clean up old completed/failed jobs
      if (job.completedAt && job.completedAt < fiveMinutesAgo) {
        this.jobs.delete(id);
      }
    }
  }
}

// Singleton instance
export const adminJobManager = new AdminJobManager();
