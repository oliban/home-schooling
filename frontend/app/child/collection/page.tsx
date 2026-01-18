'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collectibles } from '@/lib/api';
import { fireConfetti } from '@/components/ui/Confetti';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { TreasureReveal } from '@/components/child/TreasureReveal';
import { Sparkles } from '@/components/child/MagicParticles';

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
  owned: boolean;
  pronunciation?: string | null;
}

// Text-to-speech function for Italian pronunciation
function speakItalian(text: string) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }
}

// Sunset theme rarity styles
const rarityCardStyles = {
  common: 'border-gray-300 bg-gradient-to-br from-gray-50 to-white rarity-common',
  rare: 'border-blue-400 bg-gradient-to-br from-blue-50 to-white rarity-rare',
  epic: 'border-purple-400 bg-gradient-to-br from-purple-50 to-white rarity-epic',
  legendary: 'border-sunset-gold bg-gradient-to-br from-amber-50 via-yellow-50 to-white rarity-legendary',
  mythic: 'border-pink-400 bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 rarity-mythic',
  secret: 'border-amber-500 bg-gradient-to-br from-amber-50 via-orange-50 to-white rarity-secret',
};

const rarityBadgeStyles = {
  common: 'bg-gray-200 text-gray-700',
  rare: 'bg-blue-200 text-blue-700',
  epic: 'bg-purple-200 text-purple-700',
  legendary: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-900',
  mythic: 'bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 text-white mythic-sparkle',
  secret: 'bg-gradient-to-r from-amber-300 to-orange-400 text-orange-900',
};

export default function CollectionPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(0);
  const [childName, setChildName] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [showTreasureReveal, setShowTreasureReveal] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<Collectible | null>(null);
  const [activeTab, setActiveTab] = useState<'owned' | 'shop'>('owned');
  const [totalCount, setTotalCount] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    const childData = localStorage.getItem('childData');

    if (!token || !childData) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(childData);
    setCoins(parsed.coins);
    setChildName(parsed.name);

    loadCollectibles(token);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('childToken');
    localStorage.removeItem('childData');
    router.push('/login');
  };

  const loadCollectibles = async (token: string) => {
    try {
      const response = await collectibles.list(token);
      setItems(response.collectibles);
      setTotalCount(response.totalCount);
      setUnlockedCount(response.unlockedCount);
    } catch (err) {
      console.error('Failed to load collectibles:', err);
      if (err instanceof Error && (err.message.includes('Invalid token') || err.message.includes('Unauthorized'))) {
        setSessionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: Collectible) => {
    if (item.owned || coins < item.price) return;

    const token = localStorage.getItem('childToken');
    if (!token) return;

    setBuying(item.id);
    try {
      const result = await collectibles.buy(token, item.id);

      setCoins(result.newBalance);

      const childData = JSON.parse(localStorage.getItem('childData') || '{}');
      childData.coins = result.newBalance;
      localStorage.setItem('childData', JSON.stringify(childData));

      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, owned: true } : i
      ));

      // Fire confetti and show treasure reveal
      fireConfetti('fireworks');
      setPurchasedItem({ ...item, owned: true });
      setShowTreasureReveal(true);

    } catch (err) {
      console.error('Failed to buy:', err);
      if (err instanceof Error && (err.message.includes('Invalid token') || err.message.includes('Unauthorized'))) {
        setSessionError(true);
      } else {
        alert(t('collection.errors.purchaseFailed'));
      }
    } finally {
      setBuying(null);
    }
  };

  const handleCloseTreasureReveal = () => {
    setShowTreasureReveal(false);
    setPurchasedItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sunset-cream">
        <div className="text-xl text-sunset-twilight font-display">{t('common.loading')}</div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-coral/20 to-white">
        <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-display font-bold text-sunset-twilight mb-2">{t('collection.sessionExpired.title')}</h2>
          <p className="text-sunset-twilight/70 mb-6">
            {t('collection.sessionExpired.message')}
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-gradient-to-r from-sunset-tangerine to-sunset-coral text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            {t('collection.sessionExpired.button')}
          </button>
        </div>
      </div>
    );
  }

  const ownedItems = items.filter(i => i.owned);
  const shopItems = items.filter(i => !i.owned);
  const displayItems = activeTab === 'shop' ? shopItems : ownedItems;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/child" className="text-2xl text-white hover:scale-110 transition-transform">
              🏠
            </Link>
            <div className="text-white">
              <h1 className="text-xl font-display font-bold">{t('collection.title')}</h1>
              <p className="text-sm text-white/80">{childName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="coin-pouch flex items-center gap-2 px-4 py-2 rounded-full">
                <span className="text-xl">💰</span>
                <span className="font-bold text-sunset-twilight">{coins}</span>
              </div>
              <Sparkles count={3} size="sm" />
            </div>
            <LanguageSwitcher showLabel={false} />
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl p-4 shadow-card-warm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display font-bold text-sunset-twilight">
              {t('collection.progress')}
            </span>
            <span className="text-sunset-twilight/70 font-medium">
              {unlockedCount}/{totalCount}
            </span>
          </div>
          <div className="h-3 bg-sunset-peach/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sunset-gold to-sunset-tangerine rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('owned')}
            className={`pb-3 px-6 font-display font-bold transition-all ${
              activeTab === 'owned'
                ? 'text-sunset-tangerine border-b-4 border-sunset-tangerine'
                : 'text-sunset-twilight/50 hover:text-sunset-twilight'
            }`}
          >
            ✨ {t('collection.myCollection')} ({ownedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`pb-3 px-6 font-display font-bold transition-all ${
              activeTab === 'shop'
                ? 'text-sunset-tangerine border-b-4 border-sunset-tangerine'
                : 'text-sunset-twilight/50 hover:text-sunset-twilight'
            }`}
          >
            🛒 {t('collection.shop')} ({shopItems.length})
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-4xl mx-auto p-6">
        {displayItems.length === 0 ? (
          <div className="text-center py-12 text-sunset-twilight/60">
            <span className="text-5xl mb-4 block">{activeTab === 'shop' ? '🎉' : '✨'}</span>
            <p className="font-display text-lg">
              {activeTab === 'shop'
                ? t('collection.allOwned')
                : t('collection.noItems')}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item, index) => (
              <div
                key={item.id}
                className={`rounded-2xl border-3 p-4 transition-all hover:scale-105 hover:-translate-y-1 ${
                  rarityCardStyles[item.rarity]
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Rarity badge */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${rarityBadgeStyles[item.rarity]}`}>
                    {t(`collection.rarity.${item.rarity}`)}
                  </span>
                  {item.owned && (
                    <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                      ✓ {t('collection.owned')}
                    </span>
                  )}
                </div>

                {/* ASCII Art - Click to hear pronunciation */}
                <button
                  onClick={() => speakItalian(item.pronunciation || item.name)}
                  className="w-full bg-white/80 backdrop-blur rounded-xl p-3 mb-3 overflow-hidden hover:bg-white transition-colors cursor-pointer group relative"
                  title={t('collection.clickToHear')}
                >
                  <pre className="text-[10px] sm:text-xs leading-tight font-mono text-center whitespace-pre text-sunset-twilight">
                    {item.ascii_art}
                  </pre>
                  <div className="text-xs text-sunset-twilight/40 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    🔊 {t('collection.clickToHear')}
                  </div>
                  {(item.rarity === 'legendary' || item.rarity === 'mythic') && (
                    <Sparkles count={3} size="sm" />
                  )}
                </button>

                {/* Name */}
                <button
                  onClick={() => speakItalian(item.pronunciation || item.name)}
                  className="w-full font-display font-bold text-center mb-3 text-sunset-twilight hover:text-sunset-tangerine transition-colors cursor-pointer"
                >
                  {item.name}
                </button>

                {/* Buy button */}
                {activeTab === 'shop' && (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={coins < item.price || buying === item.id}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      coins >= item.price
                        ? 'bg-gradient-to-r from-sunset-tangerine to-sunset-coral text-white hover:opacity-90 shadow-md hover:shadow-lg'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {buying === item.id ? (
                      <span className="animate-pulse">{t('collection.buying')}</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        💰 {item.price}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Treasure Reveal Modal */}
      {showTreasureReveal && purchasedItem && (
        <TreasureReveal
          collectible={purchasedItem}
          onClose={handleCloseTreasureReveal}
        />
      )}
    </main>
  );
}
