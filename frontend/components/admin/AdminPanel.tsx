'use client';

import { useState, useEffect } from 'react';
import { admin } from '@/lib/api';

interface AdminPanelProps {
  token: string;
}

interface Parent {
  id: string;
  email: string;
  name: string;
  family_code: string;
  is_admin: number;
  created_at: string;
}

interface Child {
  id: string;
  parent_id: string;
  parent_name: string;
  parent_email: string;
  name: string;
  grade_level: number;
  birthdate: string | null;
  created_at: string;
  active_assignments: number;
  completed_assignments: number;
  coins: number;
  collectibles_count: number;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expanded) {
      loadData();
    }
  }, [expanded]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [parentsData, childrenData] = await Promise.all([
        admin.listParents(token),
        admin.listChildren(token),
      ]);
      setParents(parentsData);
      setChildren(childrenData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 border-t-4 border-purple-600 pt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xl font-bold text-purple-600 mb-4 hover:text-purple-700 transition-colors"
      >
        <span className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        🔐 Admin Panel (System-wide Access)
      </button>

      {expanded && (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : (
            <>
              {/* All Parents Section */}
              <div className="bg-purple-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">All Parents ({parents.length})</h3>
                <div className="space-y-2">
                  {parents.map((parent) => (
                    <div
                      key={parent.id}
                      className="bg-white p-4 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{parent.name}</p>
                        <p className="text-sm text-gray-600">{parent.email}</p>
                        <p className="text-xs text-gray-500">Family Code: {parent.family_code}</p>
                      </div>
                      {parent.is_admin === 1 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* All Children Section */}
              <div className="bg-blue-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">All Children ({children.length})</h3>
                <div className="space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="bg-white p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-gray-600">
                            Parent: {child.parent_name} ({child.parent_email})
                          </p>
                          <p className="text-sm text-gray-600">Grade {child.grade_level}</p>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Active</p>
                            <p className="text-lg font-bold text-orange-600">{child.active_assignments}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Completed</p>
                            <p className="text-lg font-bold text-green-600">{child.completed_assignments}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Coins</p>
                            <p className="text-lg font-bold text-yellow-600">{child.coins}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Brainrot</p>
                            <p className="text-lg font-bold text-purple-600">{child.collectibles_count}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
