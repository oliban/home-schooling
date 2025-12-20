'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { children } from '@/lib/api';

interface ChildDetail {
  id: string;
  name: string;
  grade_level: number;
  coins: number;
  totalEarned: number;
  currentStreak: number;
}

interface ChildProgress {
  childName: string;
  total_assignments: number;
  completed_assignments: number;
  math_correct: number;
  math_total: number;
  reading_correct: number;
  reading_total: number;
}

export default function ChildDetailPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildDetail | null>(null);
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState(1);
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadChild(token);
  }, [childId, router]);

  const loadChild = async (token: string) => {
    try {
      const [childData, progressData] = await Promise.all([
        children.get(token, childId),
        children.getProgress(token, childId),
      ]);
      setChild(childData);
      setProgress(progressData);
      setEditName(childData.name);
      setEditGrade(childData.grade_level);
    } catch (err) {
      console.error('Failed to load child:', err);
      setError('Failed to load child data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    if (newPin && newPin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await children.update(token, childId, {
        name: editName,
        grade_level: editGrade,
        ...(newPin ? { pin: newPin } : {}),
      });
      await loadChild(token);
      setEditing(false);
      setNewPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this child? This cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      await children.delete(token, childId);
      router.push('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Child not found</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/parent"
            className="text-2xl hover:scale-110 transition-transform"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold">{child.name}</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-yellow-600">{child.coins}</div>
            <div className="text-xs text-gray-600">Coins</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm text-center">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-blue-600">{child.totalEarned}</div>
            <div className="text-xs text-gray-600">Total Earned</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm text-center">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-600">{child.currentStreak}</div>
            <div className="text-xs text-gray-600">Streak</div>
          </div>
        </div>

        {/* Progress Section */}
        {progress && (
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
            <h2 className="font-bold text-lg mb-4">Progress</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Assignments Completed</span>
                  <span>{progress.completed_assignments}/{progress.total_assignments}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${progress.total_assignments > 0
                        ? (progress.completed_assignments / progress.total_assignments) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📐</span>
                    <span className="font-medium">Math</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {progress.math_correct}/{progress.math_total}
                  </div>
                  <div className="text-xs text-gray-600">correct answers</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📖</span>
                    <span className="font-medium">Reading</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {progress.reading_correct}/{progress.reading_total}
                  </div>
                  <div className="text-xs text-gray-600">correct answers</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Details</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(parseInt(e.target.value))}
                  className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                    <option key={grade} value={grade}>
                      Arskurs {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New PIN (leave empty to keep current)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none text-center text-xl tracking-[0.5em]"
                  placeholder="____"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditName(child.name);
                    setEditGrade(child.grade_level);
                    setNewPin('');
                  }}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="font-medium">{child.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grade Level</span>
                <span className="font-medium">Arskurs {child.grade_level}</span>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
          <h2 className="font-bold text-lg text-red-700 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-600 mb-4">
            Deleting a child will remove all their assignments, progress, and collectibles.
          </p>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            Delete Child
          </button>
        </div>
      </div>
    </main>
  );
}
