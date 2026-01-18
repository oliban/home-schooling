'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { compare, collectibles } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { StatsBattle } from '@/components/child/StatsBattle';
import { CollectionComparison } from '@/components/child/CollectionComparison';

interface Stats {
  coins: number;
  totalEarned: number;
  streak: number;
  collectibleCount: number;
  completedAssignments: number;
  totalAssignments: number;
}

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  rarity: string;
  pronunciation?: string | null;
}

export default function CompareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const peerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // My data
  const [myName, setMyName] = useState('');
  const [myStats, setMyStats] = useState<Stats | null>(null);
  const [myCollection, setMyCollection] = useState<Collectible[]>([]);

  // Peer data
  const [peerName, setPeerName] = useState('');
  const [peerStats, setPeerStats] = useState<Stats | null>(null);
  const [peerCollection, setPeerCollection] = useState<Collectible[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'stats' | 'collection'>('stats');

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    const childData = localStorage.getItem('childData');

    if (!token || !childData) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(childData);
    setMyName(parsed.name);

    loadData(token, parsed);
  }, [router, peerId]);

  const loadData = async (token: string, childData: { id: string; coins: number; streak: number }) => {
    try {
      // Load peer stats
      const peerStatsData = await compare.getPeerStats(token, peerId);
      setPeerName(peerStatsData.childName);
      setPeerStats(peerStatsData.stats);

      // Load peer collection
      const peerCollectionData = await compare.getPeerCollection(token, peerId);
      setPeerCollection(peerCollectionData.collection);

      // Load my collection
      const myCollectionData = await collectibles.list(token);
      const ownedItems = myCollectionData.collectibles.filter(c => c.owned);
      setMyCollection(ownedItems);

      // Build my stats from local data + collectibles count
      // We need to fetch our own coins/streak from the API for accurate data
      const coinsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/children/${childData.id}/coins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let myCoinsData = { balance: childData.coins, total_earned: 0, current_streak: childData.streak };
      if (coinsRes.ok) {
        myCoinsData = await coinsRes.json();
      }

      setMyStats({
        coins: myCoinsData.balance || 0,
        totalEarned: myCoinsData.total_earned || 0,
        streak: myCoinsData.current_streak || 0,
        collectibleCount: ownedItems.length,
        completedAssignments: 0, // We don't track this on the child side
        totalAssignments: 0,
      });

    } catch (err) {
      console.error('Failed to load comparison data:', err);
      if (err instanceof Error && err.message.includes('Access denied')) {
        setError(t('compare.accessDenied'));
      } else {
        setError(t('compare.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sunset-cream">
        <div className="text-xl text-sunset-twilight font-display">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
        <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Link href="/child/compare" className="text-2xl text-white hover:scale-110 transition-transform">
              ←
            </Link>
            <h1 className="text-xl font-display font-bold text-white">{t('compare.title')}</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <span className="text-5xl mb-4 block">🚫</span>
          <p className="text-sunset-twilight/70">{error}</p>
          <Link
            href="/child/compare"
            className="mt-6 inline-block px-6 py-3 bg-sunset-tangerine text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            {t('compare.backToPeers')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/child/compare" className="text-2xl text-white hover:scale-110 transition-transform">
            ←
          </Link>
          <div className="text-white">
            <h1 className="text-xl font-display font-bold">
              {t('compare.vsTitle', { name: peerName })}
            </h1>
            <p className="text-sm text-white/80">{t('compare.compareSubtitle')}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-6 font-display font-bold transition-all ${
              activeTab === 'stats'
                ? 'text-sunset-tangerine border-b-4 border-sunset-tangerine'
                : 'text-sunset-twilight/50 hover:text-sunset-twilight'
            }`}
          >
            ⚔️ {t('compare.statsTab')}
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`pb-3 px-6 font-display font-bold transition-all ${
              activeTab === 'collection'
                ? 'text-sunset-tangerine border-b-4 border-sunset-tangerine'
                : 'text-sunset-twilight/50 hover:text-sunset-twilight'
            }`}
          >
            🎁 {t('compare.collectionTab')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'stats' && myStats && peerStats && (
          <StatsBattle
            myName={myName}
            myStats={myStats}
            peerName={peerName}
            peerStats={peerStats}
          />
        )}

        {activeTab === 'collection' && (
          <CollectionComparison
            myName={myName}
            myCollection={myCollection}
            peerName={peerName}
            peerCollection={peerCollection}
          />
        )}
      </div>
    </main>
  );
}
