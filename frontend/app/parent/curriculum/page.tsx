'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import CoverageChart from '@/components/curriculum/CoverageChart';
import CustomPromptBuilder from '@/components/curriculum/CustomPromptBuilder';
import ExportButton from '@/components/curriculum/ExportButton';
import { ObjectiveData } from '@/types/curriculum';

interface ChildData {
  id: string;
  name: string;
  birthdate: string | null;
  grade_level: number;
  coins: number;
  hasPin: boolean;
  brainrotCount: number;
  brainrotValue: number;
}

interface ParentData {
  id: string;
  email: string;
  name: string;
}

export default function CurriculumDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [parent, setParent] = useState<ParentData | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // State for custom prompt builder
  const [selectedObjectives, setSelectedObjectives] = useState<Set<number>>(new Set());
  const [objectiveDetails, setObjectiveDetails] = useState<Map<number, ObjectiveData>>(new Map());

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
      const childrenData = await children.list(token);
      setChildrenList(childrenData);

      // Auto-select first child if available
      if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].id);
      }
    } catch (err) {
      // Error loading data - will show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentData');
    router.push('/parent/login');
  };

  // Handle objective selection for custom prompt builder
  const handleToggleObjective = (objectiveId: number, objective: ObjectiveData) => {
    // If removing an objective, allow it
    if (selectedObjectives.has(objectiveId)) {
      setSelectedObjectives(prev => {
        const next = new Set(prev);
        next.delete(objectiveId);
        return next;
      });

      setObjectiveDetails(prev => {
        const next = new Map(prev);
        next.delete(objectiveId);
        return next;
      });
      return;
    }

    // Adding a new objective - check if it would mix subjects
    const currentSubjects = Array.from(selectedObjectives)
      .map(id => objectiveDetails.get(id))
      .filter((obj): obj is ObjectiveData => obj !== undefined)
      .map(obj => obj.subject);

    const uniqueCurrentSubjects = new Set(currentSubjects);

    if (uniqueCurrentSubjects.size > 0 && !uniqueCurrentSubjects.has(objective.subject)) {
      // Would cause mixing - prevent addition
      console.warn('[handleToggleObjective] Cannot mix subjects. Ignoring click.');
      return;
    }

    // OK to add
    setSelectedObjectives(prev => {
      const next = new Set(prev);
      next.add(objectiveId);
      return next;
    });

    setObjectiveDetails(prev => {
      const next = new Map(prev);
      next.set(objectiveId, objective);
      return next;
    });
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId);

  if (loading || !parent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent" className="text-2xl hover:opacity-80 transition-opacity">
              ←
            </Link>
            <div>
              <h1 className="text-xl font-bold">LGR 22 Curriculum Coverage</h1>
              <p className="text-sm text-gray-600">{parent.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher showLabel={true} />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Child Selector */}
        <section className="mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Select Child</h2>
              {selectedChild && (
                <span className="text-sm text-gray-600">
                  Grade {selectedChild.grade_level}
                </span>
              )}
            </div>

            {childrenList.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👶</div>
                <p className="text-gray-600 mb-4">{t('parent.dashboard.noChildren')}</p>
                <Link
                  href="/parent/children/add"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                >
                  {t('parent.dashboard.addFirstChild')}
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {childrenList.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      selectedChildId === child.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <span>{child.name}</span>
                      <span className="text-xs opacity-75">
                        (Grade {child.grade_level})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Curriculum Coverage Section */}
        {selectedChildId && (
          <section className="mb-8">
            <CoverageChart
              childId={selectedChildId}
              childName={selectedChild?.name}
            />
          </section>
        )}

        {/* Custom Prompt Builder Section */}
        {selectedChildId && selectedChild && (
          <section className="mb-8">
            <CustomPromptBuilder
              childId={selectedChildId}
              childName={selectedChild.name}
              childGradeLevel={selectedChild.grade_level}
              selectedObjectives={selectedObjectives}
              objectiveDetails={objectiveDetails}
              onToggleObjective={handleToggleObjective}
            />
          </section>
        )}

        {/* Export Section */}
        {selectedChildId && selectedChild && (
          <section className="mb-8">
            <ExportButton
              childId={selectedChildId}
              childName={selectedChild.name}
            />
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold mb-4">{t('parent.dashboard.quickActions')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/parent"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🏠</div>
              <p className="font-medium">Back to Dashboard</p>
            </Link>
            <Link
              href="/parent/assignments/create"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📝</div>
              <p className="font-medium">{t('parent.dashboard.createAssignment')}</p>
            </Link>
            <Link
              href="/parent/packages"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📦</div>
              <p className="font-medium">Browse Packages</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
