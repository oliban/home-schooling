/**
 * Script runner service tests
 * Tests for executing bash scripts in child processes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import path from 'path';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { runScript } from '../services/script-runner.js';
import { spawn } from 'child_process';

const mockSpawn = spawn as ReturnType<typeof vi.fn>;

describe('Script Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should successfully run script and capture output', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    // Simulate script output
    mockProcess.stdout.emit('data', Buffer.from('Starting backup...\n'));
    mockProcess.stdout.emit('data', Buffer.from('Download complete\n'));
    mockProcess.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Starting backup');
    expect(result.output).toContain('Download complete');
    expect(onOutput).toHaveBeenCalledTimes(2);
  });

  it('should capture both stdout and stderr', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    mockProcess.stdout.emit('data', Buffer.from('Normal output\n'));
    mockProcess.stderr.emit('data', Buffer.from('Warning: something\n'));
    mockProcess.emit('close', 0);

    const result = await promise;

    expect(result.output).toContain('Normal output');
    expect(result.output).toContain('Warning: something');
    expect(onOutput).toHaveBeenCalledTimes(2);
  });

  it('should return success=true when exit code 0', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    mockProcess.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('should return success=false when exit code non-zero', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    mockProcess.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Script exited with code 1');
  });

  it('should call onOutput callback with data chunks', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    mockProcess.stdout.emit('data', Buffer.from('chunk1\n'));
    mockProcess.stdout.emit('data', Buffer.from('chunk2\n'));
    mockProcess.emit('close', 0);

    await promise;

    expect(onOutput).toHaveBeenCalledWith('chunk1\n');
    expect(onOutput).toHaveBeenCalledWith('chunk2\n');
  });

  it('should handle script errors gracefully', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    mockProcess.emit('error', new Error('ENOENT'));

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('ENOENT');
    expect(result.exitCode).toBe(-1);
  });

  it('should timeout after 5 minutes', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    const promise = runScript('backup-prod.sh', onOutput);

    // Advance time by 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    const result = await promise;

    expect(mockProcess.kill).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Script timeout (5 minutes)');
    expect(result.exitCode).toBe(-1);
  });

  it('should spawn script with correct parameters', async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    mockSpawn.mockReturnValue(mockProcess);

    const onOutput = vi.fn();
    runScript('restore-local.sh', onOutput);

    // Script runs from project root (one level up from backend)
    const projectRoot = path.join(process.cwd(), '..');
    expect(mockSpawn).toHaveBeenCalledWith('bash', expect.arrayContaining([expect.stringContaining('restore-local.sh')]), {
      cwd: projectRoot,
      env: process.env,
    });

    mockProcess.emit('close', 0);
  });
});
