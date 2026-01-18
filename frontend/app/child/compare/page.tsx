'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { compare } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { PeerCard } from '@/components/child/PeerCard';

interface Peer {
  id: string;
  name: string;
  grade_level: number;
}

export default function ComparePeersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<Peer[]>([]);
  const [classmates, setClassmates] = useState<Peer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadPeers(token);
  }, [router]);

  const loadPeers = async (token: string) => {
    try {
      const data = await compare.getPeers(token);
      setSiblings(data.siblings);
      setClassmates(data.classmates);
    } catch (err) {
      console.error('Failed to load peers:', err);
      setError(t('compare.loadError'));
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

  const hasPeers = siblings.length > 0 || classmates.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/child" className="text-2xl text-white hover:scale-110 transition-transform">
            🏠
          </Link>
          <div className="text-white">
            <h1 className="text-xl font-display font-bold">{t('compare.title')}</h1>
            <p className="text-sm text-white/80">{t('compare.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">😕</span>
            <p className="text-sunset-twilight/70">{error}</p>
          </div>
        ) : !hasPeers ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block animate-float">👥</span>
            <h2 className="text-2xl font-display font-bold text-sunset-twilight mb-2">
              {t('compare.noPeersTitle')}
            </h2>
            <p className="text-sunset-twilight/70 max-w-md mx-auto">
              {t('compare.noPeersMessage')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Siblings section */}
            {siblings.length > 0 && (
              <section>
                <h2 className="text-xl font-display font-bold text-sunset-twilight mb-4 flex items-center gap-2">
                  <span>👨‍👩‍👧</span>
                  {t('compare.siblingsSection')} ({siblings.length})
                </h2>
                <div className="space-y-3">
                  {siblings.map(peer => (
                    <PeerCard key={peer.id} peer={peer} isSibling={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Classmates section */}
            {classmates.length > 0 && (
              <section>
                <h2 className="text-xl font-display font-bold text-sunset-twilight mb-4 flex items-center gap-2">
                  <span>🏫</span>
                  {t('compare.classmatesSection')} ({classmates.length})
                </h2>
                <div className="space-y-3">
                  {classmates.map(peer => (
                    <PeerCard key={peer.id} peer={peer} isSibling={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
