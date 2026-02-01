'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assignments, collectibles } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { AdventureCreator } from '@/components/child/AdventureCreator';
import { SunsetHeader } from '@/components/child/SunsetHeader';
import { TaskCard } from '@/components/child/TaskCard';
import { CollectionPreview } from '@/components/child/CollectionPreview';
import { TreasureReveal } from '@/components/child/TreasureReveal';

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
  assignment_type: 'math' | 'reading' | 'english' | 'quiz';
  title: string;
  status: string;
}

interface AdventureQuota {
  maxActive: number;
  activeCount: number;
  remaining: number;
  canCreate: boolean;
}

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
  pronunciation?: string | null;
  owned: boolean;
}

export default function ChildDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [child, setChild] = useState<ChildData | null>(null);
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdventureCreator, setShowAdventureCreator] = useState(false);
  const [adventureQuota, setAdventureQuota] = useState<AdventureQuota | null>(null);

  // Collection preview state
  const [latestCollectibles, setLatestCollectibles] = useState<Collectible[]>([]);
  const [collectionCounts, setCollectionCounts] = useState({ total: 0, owned: 0 });

  // Treasure reveal state
  const [showTreasureReveal, setShowTreasureReveal] = useState(false);
  const [unlockedItem, setUnlockedItem] = useState<Collectible | null>(null);
  const [hasNewItem, setHasNewItem] = useState(false);

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
    loadCollectionPreview(token);

    // Check if new item was unlocked
    if (parsed.newItemUnlocked) {
      setHasNewItem(true);
      loadLatestUnlockedItem(token);
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
      const allAssignments = await assignments.list(token);
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

  const loadCollectionPreview = async (token: string) => {
    try {
      const response = await collectibles.list(token);
      const ownedItems = response.collectibles.filter(c => c.owned);
      setLatestCollectibles(ownedItems.slice(0, 3));
      setCollectionCounts({
        total: response.totalCount,
        owned: response.unlockedCount
      });
    } catch (err) {
      console.error('Failed to load collection preview:', err);
    }
  };

  const loadLatestUnlockedItem = async (token: string) => {
    try {
      const response = await collectibles.list(token);
      const ownedItems = response.collectibles.filter(c => c.owned);
      if (ownedItems.length > 0) {
        // Show the most recent unlocked item
        setUnlockedItem(ownedItems[0]);
      }
    } catch (err) {
      console.error('Failed to load latest unlocked item:', err);
    }
  };

  const handleShowTreasure = async () => {
    if (unlockedItem) {
      setShowTreasureReveal(true);
    }
  };

  const handleCloseTreasureReveal = async () => {
    setShowTreasureReveal(false);
    setHasNewItem(false);
    setUnlockedItem(null);

    // Update localStorage
    const stored = localStorage.getItem('childData');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.newItemUnlocked = false;
      localStorage.setItem('childData', JSON.stringify(parsed));
    }

    // Clear alert flag on server
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

  const handleAdventureSuccess = (adventureId: string, assignmentId: string) => {
    setShowAdventureCreator(false);
    const token = localStorage.getItem('childToken');
    if (token) {
      loadAssignments(token);
      loadAdventureQuota(token);
    }
    router.push(`/child/assignment/${assignmentId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('childToken');
    localStorage.removeItem('childData');
    router.push('/login');
  };

  if (loading || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sunset-cream">
        <div className="text-xl text-sunset-twilight font-display">{t('common.loading')}</div>
      </div>
    );
  }

  // Filter assignments by type
  const mathActive = assignmentList.filter((a) => a.assignment_type === 'math');
  const readingActive = assignmentList.filter((a) => a.assignment_type === 'reading');
  const englishActive = assignmentList.filter((a) => a.assignment_type === 'english');
  const quizActive = assignmentList.filter((a) => a.assignment_type === 'quiz');

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
      {/* Sunset Header */}
      <SunsetHeader
        childName={child.name}
        gradeLevel={child.grade_level}
        coins={child.coins}
        streak={child.streak}
        onLogout={handleLogout}
      />

      {/* Floating treasure notification */}
      {hasNewItem && unlockedItem && (
        <div className="fixed top-24 right-4 z-40">
          <button
            onClick={handleShowTreasure}
            className="flex items-center gap-3 bg-gradient-to-r from-sunset-gold to-sunset-amber text-sunset-twilight px-5 py-3 rounded-2xl shadow-sunset-glow treasure-bounce cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="text-3xl">🎁</span>
            <div className="text-left">
              <p className="font-display font-bold">{t('childDashboard.newItemAlert.title')}</p>
              <p className="text-sm opacity-80">{t('childDashboard.newItemAlert.message')}</p>
            </div>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Today's Tasks section */}
        <h2 className="text-2xl font-display font-bold text-sunset-twilight mb-6 flex items-center gap-2">
          <span className="animate-float">📅</span>
          {t('childDashboard.todaysTasks')}
        </h2>

        {/* Task cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <TaskCard type="math" assignments={mathActive} />
          <TaskCard type="reading" assignments={readingActive} />
          <TaskCard type="english" assignments={englishActive} />
          <TaskCard type="quiz" assignments={quizActive} />
        </div>

        {/* Create Your Own Adventure button */}
        {adventureQuota && (
          <div className="text-center mb-10">
            <button
              onClick={() => setShowAdventureCreator(true)}
              disabled={!adventureQuota.canCreate}
              className={`
                inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all transform hover:scale-105
                ${adventureQuota.canCreate
                  ? 'bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral text-white hover:from-sunset-amber hover:via-sunset-gold hover:to-sunset-tangerine shadow-card-warm'
                  : 'bg-sunset-cream text-sunset-twilight/40 cursor-not-allowed'
                }
              `}
            >
              <span className="text-2xl animate-sparkle">✨</span>
              <span>{t('childDashboard.createAdventure')}</span>
              <span className="text-sm opacity-75 bg-white/20 px-2 py-1 rounded-full">
                {adventureQuota.remaining}/{adventureQuota.maxActive}
              </span>
            </button>
            {!adventureQuota.canCreate && (
              <p className="text-sm text-sunset-twilight/60 mt-2">
                {t('childDashboard.adventureQuotaExceeded')}
              </p>
            )}
          </div>
        )}

        {/* Collection preview card */}
        <div className="mb-8">
          <CollectionPreview
            latestItems={latestCollectibles}
            totalCount={collectionCounts.total}
            ownedCount={collectionCounts.owned}
          />
        </div>

        {/* Compare with friends link */}
        <div className="text-center">
          <Link
            href="/child/compare"
            className="inline-flex items-center gap-3 px-6 py-3 bg-white text-sunset-twilight rounded-xl font-semibold hover:bg-sunset-peach/30 transition-colors shadow-card-warm"
          >
            <span className="text-xl">👥</span>
            <span>{t('childDashboard.compareWithFriends')}</span>
            <span className="text-sunset-tangerine">→</span>
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

      {/* Treasure Reveal Modal */}
      {showTreasureReveal && unlockedItem && (
        <TreasureReveal
          collectible={unlockedItem}
          onClose={handleCloseTreasureReveal}
        />
      )}
    </main>
  );
}
