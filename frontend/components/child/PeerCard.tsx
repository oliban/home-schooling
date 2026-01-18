'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/LanguageContext';

interface Peer {
  id: string;
  name: string;
  grade_level: number;
}

interface PeerCardProps {
  peer: Peer;
  isSibling: boolean;
}

export function PeerCard({ peer, isSibling }: PeerCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={`/child/compare/${peer.id}`}
      className="block bg-white rounded-2xl shadow-card-warm p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sunset-gold to-sunset-tangerine flex items-center justify-center text-2xl shadow-md">
          {isSibling ? '👨‍👩‍👧' : '👥'}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-display font-bold text-sunset-twilight text-lg group-hover:text-sunset-tangerine transition-colors">
            {peer.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-sunset-twilight/60">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isSibling ? 'bg-sunset-peach/50 text-sunset-tangerine' : 'bg-blue-100 text-blue-600'
            }`}>
              {isSibling ? t('compare.sibling') : t('compare.classmate')}
            </span>
            <span>{t('childDashboard.gradeLevel', { grade: peer.grade_level })}</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-sunset-tangerine group-hover:translate-x-1 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
