'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children, assignments } from '@/lib/api';

interface ChildData {
  id: string;
  name: string;
  birthdate: string | null;
  grade_level: number;
  coins: number;
  hasPin: boolean;
}

interface AssignmentData {
  id: string;
  child_id: string;
  child_name: string;
  assignment_type: 'math' | 'reading';
  title: string;
  status: string;
  created_at: string;
}

interface ParentData {
  id: string;
  email: string;
  name: string;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [parent, setParent] = useState<ParentData | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    const parentData = localStorage.getItem('parentData');

    if (!token || !parentData) {
      router.push('/parent/login');
      return;
    }

    setParent(JSON.parse(parentData));
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const [childrenData, assignmentsData] = await Promise.all([
        children.list(token),
        assignments.list(token),
      ]);
      setChildrenList(childrenData);
      setAssignmentsList(assignmentsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentData');
    router.push('/parent/login');
  };

  if (loading || !parent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const pendingAssignments = assignmentsList.filter(a => a.status === 'pending');
  const completedAssignments = assignmentsList.filter(a => a.status === 'completed');

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl">👨‍👩‍👧‍👦</div>
            <div>
              <h1 className="text-xl font-bold">Parent Dashboard</h1>
              <p className="text-sm text-gray-600">{parent.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Family Code Banner */}
      <div className="bg-blue-50 border-b border-blue-100 py-3">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-700 font-medium">Familjekod:</span>
            <code className="bg-white px-4 py-2 rounded border text-2xl font-bold tracking-widest">{(parent as ParentData & { familyCode?: string }).familyCode || '----'}</code>
          </div>
          <button
            onClick={() => {
              const code = (parent as ParentData & { familyCode?: string }).familyCode;
              if (code) {
                navigator.clipboard.writeText(code);
                alert('Familjekod kopierad!');
              }
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Kopiera
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Children Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Children</h2>
            <Link
              href="/parent/children/add"
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              + Add Child
            </Link>
          </div>

          {childrenList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">👶</div>
              <p className="text-gray-600 mb-4">No children added yet</p>
              <Link
                href="/parent/children/add"
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                Add Your First Child
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childrenList.map((child) => (
                <Link
                  key={child.id}
                  href={`/parent/children/${child.id}`}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-3xl">👤</div>
                    <div>
                      <h3 className="font-bold text-lg">{child.name}</h3>
                      <p className="text-sm text-gray-600">Grade {child.grade_level}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <span>💰</span>
                      <span>{child.coins} coins</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      child.hasPin ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {child.hasPin ? 'PIN set' : 'No PIN'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Assignments Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Assignments</h2>
            <Link
              href="/parent/assignments/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Create Assignment
            </Link>
          </div>

          {assignmentsList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">No assignments created yet</p>
              {childrenList.length > 0 ? (
                <Link
                  href="/parent/assignments/create"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Create First Assignment
                </Link>
              ) : (
                <p className="text-sm text-gray-500">Add a child first to create assignments</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending */}
              {pendingAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Pending ({pendingAssignments.length})</h3>
                  <div className="space-y-2">
                    {pendingAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {assignment.assignment_type === 'math' ? '📐' : '📖'}
                          </span>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-gray-600">
                              {assignment.child_name} • Created {new Date(assignment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Completed ({completedAssignments.length})</h3>
                  <div className="space-y-2">
                    {completedAssignments.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between opacity-75"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {assignment.assignment_type === 'math' ? '📐' : '📖'}
                          </span>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-gray-600">{assignment.child_name}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/parent/children/add"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">👶</div>
              <p className="font-medium">Add Child</p>
            </Link>
            <Link
              href="/parent/assignments/create"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📝</div>
              <p className="font-medium">Create Assignment</p>
            </Link>
            <Link
              href="/login"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🎮</div>
              <p className="font-medium">Child Login</p>
            </Link>
            <button
              onClick={() => {
                const parentData = localStorage.getItem('parentData');
                if (parentData) {
                  const p = JSON.parse(parentData);
                  localStorage.setItem('parentId', p.id);
                  alert(`Parent ID saved: ${p.id}\n\nChildren can now log in at /login`);
                }
              }}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🔑</div>
              <p className="font-medium">Setup Child Login</p>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
