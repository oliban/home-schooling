'use client';

import { useState, useEffect } from 'react';
import { admin } from '@/lib/api';

export default function DevAdminPanel() {
  const [status, setStatus] = useState<{
    lastBackup: number | null;
    lastSync: number | null;
    backupFiles: number;
  } | null>(null);

  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  // Poll for active job
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'running') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('parentToken');
        if (!token) return;

        const { job } = await admin.getActiveJob(token);
        setActiveJob(job);

        if (job && job.status !== 'running') {
          // Job finished, reload status
          loadStatus();
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.status]);

  const loadStatus = async () => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      const data = await admin.getBackupStatus(token);
      setStatus(data);

      const { job } = await admin.getActiveJob(token);
      setActiveJob(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      const { jobId } = await admin.triggerBackup(token);
      setActiveJob({ id: jobId, type: 'backup', status: 'running', output: '', startedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start backup');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    // Show confirmation dialog
    const confirmed = confirm(
      'Sync to Dev will replace your local database with production data.\n\n' +
      'You will be logged out automatically.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      const { jobId } = await admin.triggerSync(token);
      setActiveJob({ id: jobId, type: 'sync', status: 'running', output: '', startedAt: Date.now() });

      // Auto-logout after starting sync
      setTimeout(() => {
        localStorage.removeItem('parentToken');
        localStorage.removeItem('parentData');
        window.location.href = '/parent/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    const now = Date.now();
    const diff = now - ts;

    // Less than 1 hour: "X minutes ago"
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return mins + ' minute' + (mins !== 1 ? 's' : '') + ' ago';
    }

    // Less than 24 hours: "X hours ago"
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
    }

    // Otherwise: full date
    return date.toLocaleString();
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔧</span>
        <h2 className="text-xl font-bold text-yellow-900">Developer Admin Panel</h2>
        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">
          DEV ONLY
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Status Display */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Last Production Backup</p>
          <p className="font-semibold text-gray-900">
            {formatTimestamp(status?.lastBackup || null)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Last Sync to Dev</p>
          <p className="font-semibold text-gray-900">
            {formatTimestamp(status?.lastSync || null)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Backup Files</p>
          <p className="font-semibold text-gray-900">
            {status?.backupFiles || 0}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleBackup}
          disabled={loading || activeJob?.status === 'running'}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {activeJob?.type === 'backup' && activeJob?.status === 'running'
            ? 'Backing up...'
            : 'Backup Production'}
        </button>
        <button
          onClick={handleSync}
          disabled={loading || activeJob?.status === 'running'}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {activeJob?.type === 'sync' && activeJob?.status === 'running'
            ? 'Syncing...'
            : 'Sync to Dev'}
        </button>
      </div>

      {/* Job Output */}
      {activeJob && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">
              {activeJob.type === 'backup' ? 'Backup' : 'Sync'} Operation
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              activeJob.status === 'running' ? 'bg-blue-600' :
              activeJob.status === 'completed' ? 'bg-green-600' :
              'bg-red-600'
            }`}>
              {activeJob.status}
            </span>
          </div>

          {/* Sync completion warning */}
          {activeJob.type === 'sync' && activeJob.status === 'completed' && (
            <div className="bg-yellow-900 text-yellow-100 p-3 rounded mb-2 text-sm">
              <div className="font-bold mb-1">⚠️ Sync Complete - Action Required:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Restart the backend server</li>
                <li>Log out and log back in (old session won&apos;t work)</li>
                <li>The database has been replaced with production data</li>
              </ol>
            </div>
          )}

          {activeJob.error && (
            <div className="text-red-400 mb-2">Error: {activeJob.error}</div>
          )}
          <pre className="whitespace-pre-wrap">
            {activeJob.output || 'Starting...'}
          </pre>
        </div>
      )}
    </div>
  );
}
