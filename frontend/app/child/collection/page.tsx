'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collectibles } from '@/lib/api';
import { fireConfetti } from '@/components/ui/Confetti';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  owned: boolean;
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

const rarityColors = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-400 bg-blue-50',
  epic: 'border-purple-400 bg-purple-50',
  legendary: 'border-yellow-400 bg-yellow-50',
  mythic: 'border-pink-400 bg-gradient-to-br from-pink-50 to-purple-50',
};

const rarityBadgeColors = {
  common: 'bg-gray-200 text-gray-700',
  rare: 'bg-blue-200 text-blue-700',
  epic: 'bg-purple-200 text-purple-700',
  legendary: 'bg-yellow-200 text-yellow-700',
  mythic: 'bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 text-white mythic-sparkle',
};

export default function CollectionPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(0);
  const [childName, setChildName] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [showPurchased, setShowPurchased] = useState<Collectible | null>(null);
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
      // Check if it's a session/token error
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

      // Update coins
      setCoins(result.newBalance);

      // Update local storage
      const childData = JSON.parse(localStorage.getItem('childData') || '{}');
      childData.coins = result.newBalance;
      localStorage.setItem('childData', JSON.stringify(childData));

      // Update items list
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, owned: true } : i
      ));

      // Show celebration
      fireConfetti('fireworks');
      setShowPurchased(item);

    } catch (err) {
      console.error('Failed to buy:', err);
      // Check if it's a session/token error
      if (err instanceof Error && (err.message.includes('Invalid token') || err.message.includes('Unauthorized'))) {
        setSessionError(true);
      } else {
        alert(t('collection.errors.purchaseFailed'));
      }
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  // Show session error with logout option
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('collection.sessionExpired.title')}</h2>
          <p className="text-gray-600 mb-6">
            {t('collection.sessionExpired.message')}
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
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
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/child" className="text-2xl hover:scale-110 transition-transform">
              🏠
            </Link>
            <div>
              <h1 className="text-xl font-bold">{t('collection.title')}</h1>
              <p className="text-sm text-gray-600">{childName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
              <span className="text-xl">💰</span>
              <span className="font-bold">{coins}</span>
            </div>
            <LanguageSwitcher showLabel={false} />
          </div>
        </div>
      </header>

      {/* Tabs - Collection first, Shop second */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('owned')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'owned'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✨ {t('collection.myCollection')} ({ownedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'shop'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🛒 {t('collection.shop')} ({shopItems.length})
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-4xl mx-auto p-6">
        {displayItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {activeTab === 'shop'
              ? t('collection.allOwned')
              : t('collection.noItems')}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-4 transition-all hover:scale-105 ${
                  rarityColors[item.rarity]
                }`}
              >
                {/* Rarity badge */}
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${rarityBadgeColors[item.rarity]}`}>
                    {t(`collection.rarity.${item.rarity}`)}
                  </span>
                  {item.owned && (
                    <span className="text-green-600 text-sm font-semibold">{t('collection.owned')}</span>
                  )}
                </div>

                {/* ASCII Art - Click to hear Italian pronunciation */}
                <button
                  onClick={() => speakItalian(item.name)}
                  className="w-full bg-white rounded-lg p-3 mb-3 overflow-hidden hover:bg-gray-100 transition-colors cursor-pointer group"
                  title={t('collection.clickToHear')}
                >
                  <pre className="text-[10px] sm:text-xs leading-tight font-mono text-center whitespace-pre">
                    {item.ascii_art}
                  </pre>
                  <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    🔊 {t('collection.clickToHear')}
                  </div>
                </button>

                {/* Name - Also clickable */}
                <button
                  onClick={() => speakItalian(item.name)}
                  className="w-full font-bold text-center mb-2 hover:text-purple-600 transition-colors cursor-pointer"
                >
                  {item.name}
                </button>

                {/* Price / Buy button */}
                {activeTab === 'shop' && (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={coins < item.price || buying === item.id}
                    className={`w-full py-2 rounded-xl font-semibold transition-colors ${
                      coins >= item.price
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {buying === item.id ? (
                      t('collection.buying')
                    ) : (
                      <>💰 {item.price}</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase celebration modal */}
      {showPurchased && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPurchased(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4">{t('collection.newCollectible')}</h2>

            <div className={`rounded-xl border-2 p-4 mb-4 ${rarityColors[showPurchased.rarity]}`}>
              <pre className="text-xs leading-tight font-mono whitespace-pre">
                {showPurchased.ascii_art}
              </pre>
            </div>

            <p className="text-xl font-bold mb-4">{showPurchased.name}</p>

            <button
              onClick={() => setShowPurchased(null)}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
            >
              {t('collection.awesome')}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </main>
  );
}
