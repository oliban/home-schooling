'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assignments } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { AdventureCreator } from '@/components/child/AdventureCreator';

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
  coins: number;
  streak: number;
  newItemUnlocked?: boolean;
}

interface Assignment {
  id: string;
  assignment_type: 'math' | 'reading';
  title: string;
  status: string;
}

interface AdventureQuota {
  maxActive: number;
  activeCount: number;
  remaining: number;
  canCreate: boolean;
}

export default function ChildDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [child, setChild] = useState<ChildData | null>(null);
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItemAlert, setShowNewItemAlert] = useState(false);
  const [mathPendingExpanded, setMathPendingExpanded] = useState(false);
  const [readingPendingExpanded, setReadingPendingExpanded] = useState(false);
  const [showAdventureCreator, setShowAdventureCreator] = useState(false);
  const [adventureQuota, setAdventureQuota] = useState<AdventureQuota | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    const childData = localStorage.getItem('childData');

    if (!token || !childData) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(childData);
    setChild(parsed);
    loadAssignments(token);
    refreshCoins(token, parsed.id);
    loadAdventureQuota(token);

    // Check if new item was unlocked today
    if (parsed.newItemUnlocked) {
      setShowNewItemAlert(true);
    }
  }, [router]);

  const refreshCoins = async (token: string, childId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/children/${childId}/coins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChild(prev => prev ? { ...prev, coins: data.balance, streak: data.current_streak } : null);
        // Update localStorage too
        const stored = localStorage.getItem('childData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.coins = data.balance;
          parsed.streak = data.current_streak;
          localStorage.setItem('childData', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error('Failed to refresh coins:', err);
    }
  };

  const loadAssignments = async (token: string) => {
    try {
      // Load all assignments (backend sorts by display_order)
      const allAssignments = await assignments.list(token);

      // Filter to only active assignments (exclude completed)
      const activeAssignments = allAssignments.filter(
        a => a.status === 'pending' || a.status === 'in_progress'
      );

      setAssignmentList(activeAssignments);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdventureQuota = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/adventures/quota`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdventureQuota(data);
      }
    } catch (err) {
      console.error('Failed to load adventure quota:', err);
    }
  };

  const handleAdventureSuccess = (adventureId: string, assignmentId: string) => {
    setShowAdventureCreator(false);
    // Reload assignments and quota
    const token = localStorage.getItem('childToken');
    if (token) {
      loadAssignments(token);
      loadAdventureQuota(token);
    }
    // Navigate to the new assignment
    router.push(`/child/assignment/${assignmentId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('childToken');
    localStorage.removeItem('childData');
    router.push('/login');
  };

  const clearNewItemAlert = async () => {
    setShowNewItemAlert(false);
    // Update localStorage
    const stored = localStorage.getItem('childData');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.newItemUnlocked = false;
      localStorage.setItem('childData', JSON.stringify(parsed));
    }
    // Call API to clear alert flag
    const token = localStorage.getItem('childToken');
    if (token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/collectibles/clear-alert`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to clear alert:', err);
      }
    }
  };

  if (loading || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  // Filter assignments by type (already sorted by display_order from backend)
  const mathActive = assignmentList.filter((a) => a.assignment_type === 'math');
  const readingActive = assignmentList.filter((a) => a.assignment_type === 'reading');

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl">🎒</div>
            <div>
              <h1 className="text-xl font-bold">{t('childDashboard.greeting', { name: child.name })}</h1>
              <p className="text-sm text-gray-600">{t('childDashboard.gradeLevel', { grade: child.grade_level })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
              <span className="text-xl">💰</span>
              <span className="font-bold">{child.coins}</span>
            </div>
            {child.streak > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
                <span className="text-xl fire-glow">🔥</span>
                <span className="font-bold">{child.streak}</span>
              </div>
            )}
            <LanguageSwitcher showLabel={false} />
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* New item unlocked alert */}
      {showNewItemAlert && (
        <div className="max-w-4xl mx-auto px-8 pt-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg animate-pulse-slow">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎁</span>
              <div>
                <p className="font-bold text-lg">{t('childDashboard.newItemAlert.title')}</p>
                <p className="text-sm opacity-90">{t('childDashboard.newItemAlert.message')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/child/collection"
                onClick={clearNewItemAlert}
                className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:bg-purple-100 transition-colors"
              >
                {t('childDashboard.newItemAlert.viewButton')}
              </Link>
              <button
                onClick={clearNewItemAlert}
                className="text-white/80 hover:text-white p-2"
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">📅 {t('childDashboard.todaysTasks')}</h2>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Math card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📐</span>
              <h3 className="text-xl font-bold">{t('childDashboard.math')}</h3>
            </div>
            {mathActive.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {t('childDashboard.inProgress')}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{mathActive[0].title}</p>
                <Link
                  href={`/child/assignment/${mathActive[0].id}`}
                  className="block w-full py-3 bg-orange-500 text-white text-center rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  {t('childDashboard.continueButton')} →
                </Link>
                {mathActive.length > 1 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setMathPendingExpanded(!mathPendingExpanded)}
                      className="w-full text-gray-500 text-sm text-center hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <span className={`transform transition-transform ${mathPendingExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      + {mathActive.length - 1 > 1
                        ? t('childDashboard.tasksCountPlural', { count: mathActive.length - 1 })
                        : t('childDashboard.tasksCount', { count: mathActive.length - 1 })}
                    </button>
                    {mathPendingExpanded && (
                      <div className="mt-2 space-y-1">
                        {mathActive.slice(1).map((assignment, index) => (
                          <Link
                            key={assignment.id}
                            href={`/child/assignment/${assignment.id}`}
                            className="block text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                          >
                            {index + 2}. {assignment.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-green-600">✅ {t('childDashboard.doneForToday')}</p>
            )}
          </div>

          {/* Reading card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📖</span>
              <h3 className="text-xl font-bold">{t('childDashboard.reading')}</h3>
            </div>
            {readingActive.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {t('childDashboard.inProgress')}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{readingActive[0].title}</p>
                <Link
                  href={`/child/assignment/${readingActive[0].id}`}
                  className="block w-full py-3 bg-orange-500 text-white text-center rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  {t('childDashboard.continueButton')} →
                </Link>
                {readingActive.length > 1 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setReadingPendingExpanded(!readingPendingExpanded)}
                      className="w-full text-gray-500 text-sm text-center hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <span className={`transform transition-transform ${readingPendingExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      + {readingActive.length - 1 > 1
                        ? t('childDashboard.tasksCountPlural', { count: readingActive.length - 1 })
                        : t('childDashboard.tasksCount', { count: readingActive.length - 1 })}
                    </button>
                    {readingPendingExpanded && (
                      <div className="mt-2 space-y-1">
                        {readingActive.slice(1).map((assignment, index) => (
                          <Link
                            key={assignment.id}
                            href={`/child/assignment/${assignment.id}`}
                            className="block text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                          >
                            {index + 2}. {assignment.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-green-600">✅ {t('childDashboard.doneForToday')}</p>
            )}
          </div>
        </div>

        {/* Create Your Own Adventure button */}
        {adventureQuota && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowAdventureCreator(true)}
              disabled={!adventureQuota.canCreate}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105
                ${adventureQuota.canCreate
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <span className="text-xl">✨</span>
              <span>{t('childDashboard.createAdventure')}</span>
              <span className="text-sm opacity-75">
                ({adventureQuota.remaining}/{adventureQuota.maxActive})
              </span>
            </button>
            {!adventureQuota.canCreate && (
              <p className="text-sm text-gray-500 mt-2">
                {t('childDashboard.adventureQuotaExceeded')}
              </p>
            )}
          </div>
        )}

        {/* Collection link */}
        <div className="text-center">
          <Link
            href="/child/collection"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-xl font-semibold hover:bg-purple-200 transition-colors"
          >
            <span>🎁</span>
            <span>{t('childDashboard.myCollections')}</span>
          </Link>
        </div>
      </div>

      {/* Adventure Creator Modal */}
      {showAdventureCreator && adventureQuota && (
        <AdventureCreator
          quota={adventureQuota}
          onClose={() => setShowAdventureCreator(false)}
          onSuccess={handleAdventureSuccess}
        />
      )}

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
