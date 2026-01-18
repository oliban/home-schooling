'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/LanguageContext';
import { Sparkles } from './MagicParticles';

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  rarity: string;
}

interface CollectionPreviewProps {
  latestItems: Collectible[];
  totalCount: number;
  ownedCount: number;
}

const rarityBorderColors: Record<string, string> = {
  common: 'border-gray-300',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-sunset-gold',
  mythic: 'border-pink-400',
  secret: 'border-amber-500',
};

export function CollectionPreview({ latestItems, totalCount, ownedCount }: CollectionPreviewProps) {
  const { t } = useTranslation();

  return (
    <Link
      href="/child/collection"
      className="block bg-white rounded-2xl shadow-card-warm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <h3 className="text-lg font-display font-bold text-sunset-twilight">
            {t('childDashboard.myCollections')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-sunset-twilight/60 font-medium">
            {ownedCount}/{totalCount}
          </span>
          <span className="text-sunset-tangerine group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </div>

      {/* Preview of latest items */}
      {latestItems.length > 0 ? (
        <div className="flex gap-3 justify-center">
          {latestItems.slice(0, 3).map((item, index) => (
            <div
              key={item.id}
              className={`relative bg-sunset-cream/50 rounded-xl p-3 border-2 ${
                rarityBorderColors[item.rarity] || 'border-gray-200'
              } transition-transform group-hover:scale-105`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <pre className="text-[8px] leading-tight font-mono text-center whitespace-pre text-sunset-twilight/80">
                {item.ascii_art.slice(0, 200)}
              </pre>
              {item.rarity === 'legendary' || item.rarity === 'mythic' ? (
                <Sparkles count={2} size="sm" />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sunset-twilight/50">
          <span className="text-3xl mb-2 block">✨</span>
          <p className="text-sm">{t('collection.noItems')}</p>
        </div>
      )}
    </Link>
  );
}
