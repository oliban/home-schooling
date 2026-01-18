'use client';

import { useTranslation } from '@/lib/LanguageContext';
import { Sparkles } from './MagicParticles';

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  rarity: string;
  pronunciation?: string | null;
}

interface CollectionComparisonProps {
  myName: string;
  myCollection: Collectible[];
  peerName: string;
  peerCollection: Collectible[];
}

const rarityCardStyles: Record<string, string> = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-400 bg-blue-50',
  epic: 'border-purple-400 bg-purple-50',
  legendary: 'border-sunset-gold bg-amber-50',
  mythic: 'border-pink-400 bg-pink-50',
  secret: 'border-amber-500 bg-amber-50',
};

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

export function CollectionComparison({
  myName,
  myCollection,
  peerName,
  peerCollection,
}: CollectionComparisonProps) {
  const { t } = useTranslation();

  // Find shared collectibles
  const myIds = new Set(myCollection.map(c => c.id));
  const peerIds = new Set(peerCollection.map(c => c.id));
  const sharedIds = new Set([...myIds].filter(id => peerIds.has(id)));

  // Unique to each
  const myUnique = myCollection.filter(c => !peerIds.has(c.id));
  const peerUnique = peerCollection.filter(c => !myIds.has(c.id));
  const shared = myCollection.filter(c => sharedIds.has(c.id));

  const CollectibleMini = ({ item, isShared }: { item: Collectible; isShared?: boolean }) => (
    <button
      onClick={() => speakItalian(item.pronunciation || item.name)}
      className={`relative rounded-xl border-2 p-2 transition-all hover:scale-105 ${
        rarityCardStyles[item.rarity] || 'border-gray-200'
      } ${isShared ? 'ring-2 ring-sunset-gold' : ''}`}
      title={item.name}
    >
      <pre className="text-[6px] leading-tight font-mono text-center whitespace-pre text-sunset-twilight/80">
        {item.ascii_art.slice(0, 100)}
      </pre>
      <p className="text-[10px] font-bold text-center truncate mt-1">{item.name}</p>
      {(item.rarity === 'legendary' || item.rarity === 'mythic') && (
        <Sparkles count={2} size="sm" />
      )}
      {isShared && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-sunset-gold rounded-full flex items-center justify-center">
          <span className="text-[10px]">✨</span>
        </div>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Shared collectibles */}
      {shared.length > 0 && (
        <div className="bg-gradient-to-r from-sunset-gold/10 via-sunset-amber/10 to-sunset-gold/10 rounded-2xl p-5">
          <h3 className="font-display font-bold text-sunset-twilight mb-3 flex items-center gap-2">
            <span>✨</span>
            {t('compare.sharedCollectibles')} ({shared.length})
          </h3>
          <div className="flex flex-wrap gap-3">
            {shared.map(item => (
              <CollectibleMini key={item.id} item={item} isShared />
            ))}
          </div>
        </div>
      )}

      {/* Side by side comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* My unique */}
        <div className="bg-white rounded-2xl p-5 shadow-card-warm">
          <h3 className="font-display font-bold text-sunset-twilight mb-3 flex items-center gap-2">
            <span>🌟</span>
            {t('compare.onlyYouHave', { name: myName })} ({myUnique.length})
          </h3>
          {myUnique.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {myUnique.map(item => (
                <CollectibleMini key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sunset-twilight/50 text-sm italic">
              {t('compare.allShared')}
            </p>
          )}
        </div>

        {/* Peer unique */}
        <div className="bg-white rounded-2xl p-5 shadow-card-warm">
          <h3 className="font-display font-bold text-sunset-twilight mb-3 flex items-center gap-2">
            <span>🎯</span>
            {t('compare.onlyTheyHave', { name: peerName })} ({peerUnique.length})
          </h3>
          {peerUnique.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {peerUnique.map(item => (
                <CollectibleMini key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sunset-twilight/50 text-sm italic">
              {t('compare.youHaveAll')}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="text-center text-sunset-twilight/70 text-sm">
        {shared.length > 0 ? (
          <p>
            {t('compare.sharingSummary', {
              count: shared.length,
              myUnique: myUnique.length,
              peerUnique: peerUnique.length,
            })}
          </p>
        ) : (
          <p>{t('compare.noSharedItems')}</p>
        )}
      </div>
    </div>
  );
}
