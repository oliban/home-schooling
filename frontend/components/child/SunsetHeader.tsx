'use client';

import { WavyDivider } from '@/components/ui/WavyDivider';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sparkles } from './MagicParticles';

interface SunsetHeaderProps {
  childName: string;
  gradeLevel: number;
  coins: number;
  streak: number;
  onLogout: () => void;
}

export function SunsetHeader({
  childName,
  gradeLevel,
  coins,
  streak,
  onLogout,
}: SunsetHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral px-4 pt-4 pb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between relative">
          {/* Left side - Child info */}
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-float">🎒</div>
            <div className="text-white">
              <h1 className="text-xl font-display font-bold">
                {t('childDashboard.greeting', { name: childName })}
              </h1>
              <p className="text-sm text-white/80">
                {t('childDashboard.gradeLevel', { grade: gradeLevel })}
              </p>
            </div>
          </div>

          {/* Right side - Stats and actions */}
          <div className="flex items-center gap-3">
            {/* Coin pouch */}
            <div className="relative">
              <div className="coin-pouch flex items-center gap-2 px-4 py-2 rounded-full animate-glow-pulse">
                <span className="text-xl">💰</span>
                <span className="font-bold text-sunset-twilight">{coins}</span>
              </div>
              <Sparkles count={3} size="sm" />
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-xl fire-glow">🔥</span>
                <span className="font-bold text-white">{streak}</span>
              </div>
            )}

            {/* Language switcher */}
            <div className="bg-white/20 backdrop-blur-sm rounded-full">
              <LanguageSwitcher showLabel={false} />
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="text-white/80 hover:text-white transition-colors text-sm"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Wavy bottom edge */}
      <div className="relative -mt-1">
        <WavyDivider color="#FFF8E7" height={30} />
      </div>
    </div>
  );
}
