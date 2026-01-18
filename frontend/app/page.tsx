'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/LanguageContext';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/30 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col lg:flex-row items-center gap-8">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-sunset-twilight mb-4">
              {t('home.hero.title')}
            </h1>
            <p className="text-xl text-sunset-twilight/70 mb-8">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral text-white rounded-2xl text-lg font-display font-bold hover:from-sunset-amber hover:via-sunset-gold hover:to-sunset-tangerine hover:scale-105 transition-all shadow-card-warm"
              >
                ✨ {t('home.hero.startButton')}
              </Link>
              <Link
                href="/parent/login"
                className="px-8 py-4 bg-white/80 text-sunset-twilight rounded-2xl text-lg font-display font-semibold hover:bg-white transition-all border-2 border-sunset-peach hover:border-sunset-tangerine"
              >
                {t('home.hero.parentButton')}
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="flex-1 max-w-md">
            <Image
              src="/school-adventure.png"
              alt={t('home.imageAlt')}
              width={600}
              height={400}
              className="rounded-3xl shadow-card-warm border-4 border-sunset-peach"
              priority
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-card-warm hover:shadow-lg transition-all hover:scale-105 text-center">
            <div className="text-4xl mb-2">🧮</div>
            <h3 className="font-display font-bold text-sunset-twilight">{t('home.features.math.title')}</h3>
            <p className="text-sunset-twilight/70 text-sm mt-1">{t('home.features.math.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-card-warm hover:shadow-lg transition-all hover:scale-105 text-center">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="font-display font-bold text-sunset-twilight">{t('home.features.reading.title')}</h3>
            <p className="text-sunset-twilight/70 text-sm mt-1">{t('home.features.reading.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-card-warm hover:shadow-lg transition-all hover:scale-105 text-center">
            <div className="text-4xl mb-2">🪙</div>
            <h3 className="font-display font-bold text-sunset-twilight">{t('home.features.coins.title')}</h3>
            <p className="text-sunset-twilight/70 text-sm mt-1">{t('home.features.coins.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-card-warm hover:shadow-lg transition-all hover:scale-105 text-center">
            <div className="text-4xl mb-2">🦄</div>
            <h3 className="font-display font-bold text-sunset-twilight">{t('home.features.characters.title')}</h3>
            <p className="text-sunset-twilight/70 text-sm mt-1">{t('home.features.characters.description')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
