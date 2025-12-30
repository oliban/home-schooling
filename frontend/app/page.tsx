'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/LanguageContext';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col lg:flex-row items-center gap-8">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
              {t('home.hero.title')}
            </h1>
            <p className="text-xl text-amber-700 mb-8">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="px-8 py-4 bg-amber-600 text-white rounded-2xl text-lg font-bold hover:bg-amber-700 hover:scale-105 transition-all shadow-lg"
              >
                {t('home.hero.startButton')}
              </Link>
              <Link
                href="/parent/login"
                className="px-8 py-4 bg-white/80 text-amber-800 rounded-2xl text-lg font-semibold hover:bg-white transition-all border-2 border-amber-200"
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
              className="rounded-3xl shadow-2xl border-4 border-amber-200"
              priority
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-md hover:shadow-lg transition-shadow text-center">
            <div className="text-4xl mb-2">🧮</div>
            <h3 className="font-bold text-amber-900">{t('home.features.math.title')}</h3>
            <p className="text-amber-700 text-sm mt-1">{t('home.features.math.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-md hover:shadow-lg transition-shadow text-center">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="font-bold text-amber-900">{t('home.features.reading.title')}</h3>
            <p className="text-amber-700 text-sm mt-1">{t('home.features.reading.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-md hover:shadow-lg transition-shadow text-center">
            <div className="text-4xl mb-2">🪙</div>
            <h3 className="font-bold text-amber-900">{t('home.features.coins.title')}</h3>
            <p className="text-amber-700 text-sm mt-1">{t('home.features.coins.description')}</p>
          </div>
          <div className="p-5 bg-white/70 backdrop-blur rounded-2xl shadow-md hover:shadow-lg transition-shadow text-center">
            <div className="text-4xl mb-2">🦄</div>
            <h3 className="font-bold text-amber-900">{t('home.features.characters.title')}</h3>
            <p className="text-amber-700 text-sm mt-1">{t('home.features.characters.description')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
