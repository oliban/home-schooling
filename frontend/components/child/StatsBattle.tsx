'use client';

import { useTranslation } from '@/lib/LanguageContext';

interface Stats {
  coins: number;
  totalEarned: number;
  streak: number;
  collectibleCount: number;
  completedAssignments: number;
  totalAssignments: number;
}

interface StatsBattleProps {
  myName: string;
  myStats: Stats;
  peerName: string;
  peerStats: Stats;
}

interface StatRowProps {
  label: string;
  icon: string;
  myValue: number;
  peerValue: number;
  format?: (val: number) => string;
  higherIsBetter?: boolean;
}

function StatRow({ label, icon, myValue, peerValue, format, higherIsBetter = true }: StatRowProps) {
  const formatter = format || ((v: number) => v.toString());
  const myWins = higherIsBetter ? myValue > peerValue : myValue < peerValue;
  const peerWins = higherIsBetter ? peerValue > myValue : peerValue < myValue;
  const isTie = myValue === peerValue;

  // Calculate percentage for visual bar
  const total = myValue + peerValue || 1;
  const myPercent = (myValue / total) * 100;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sunset-twilight/70 text-sm font-medium flex items-center gap-2">
          <span>{icon}</span>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* My value */}
        <div className={`text-lg font-bold min-w-[60px] text-right ${
          myWins ? 'text-green-600' : isTie ? 'text-sunset-twilight' : 'text-sunset-twilight/60'
        }`}>
          {formatter(myValue)}
          {myWins && <span className="ml-1">👑</span>}
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="flex h-full">
            <div
              className={`h-full transition-all duration-500 ${
                myWins ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-sunset-peach to-sunset-tangerine'
              }`}
              style={{ width: `${myPercent}%` }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                peerWins ? 'bg-gradient-to-l from-green-400 to-green-500' : 'bg-gradient-to-l from-blue-300 to-blue-400'
              }`}
              style={{ width: `${100 - myPercent}%` }}
            />
          </div>
        </div>

        {/* Peer value */}
        <div className={`text-lg font-bold min-w-[60px] ${
          peerWins ? 'text-green-600' : isTie ? 'text-sunset-twilight' : 'text-sunset-twilight/60'
        }`}>
          {peerWins && <span className="mr-1">👑</span>}
          {formatter(peerValue)}
        </div>
      </div>
    </div>
  );
}

export function StatsBattle({ myName, myStats, peerName, peerStats }: StatsBattleProps) {
  const { t } = useTranslation();

  // Count wins
  let myWins = 0;
  let peerWins = 0;

  if (myStats.coins > peerStats.coins) myWins++;
  else if (peerStats.coins > myStats.coins) peerWins++;

  if (myStats.streak > peerStats.streak) myWins++;
  else if (peerStats.streak > myStats.streak) peerWins++;

  if (myStats.collectibleCount > peerStats.collectibleCount) myWins++;
  else if (peerStats.collectibleCount > myStats.collectibleCount) peerWins++;

  if (myStats.totalEarned > peerStats.totalEarned) myWins++;
  else if (peerStats.totalEarned > myStats.totalEarned) peerWins++;

  const overallWinner = myWins > peerWins ? 'me' : peerWins > myWins ? 'peer' : 'tie';

  return (
    <div className="bg-white rounded-2xl shadow-card-warm overflow-hidden">
      {/* Header with names */}
      <div className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral p-4">
        <div className="flex items-center justify-between text-white">
          <div className="text-center flex-1">
            <p className="font-display font-bold text-lg">{myName}</p>
            <p className="text-sm text-white/80">{t('compare.you')}</p>
          </div>
          <div className="text-3xl px-4">⚔️</div>
          <div className="text-center flex-1">
            <p className="font-display font-bold text-lg">{peerName}</p>
            <p className="text-sm text-white/80">{t('compare.friend')}</p>
          </div>
        </div>
      </div>

      {/* Stats comparison */}
      <div className="p-5 divide-y divide-sunset-peach/30">
        <StatRow
          label={t('compare.stats.currentCoins')}
          icon="💰"
          myValue={myStats.coins}
          peerValue={peerStats.coins}
        />
        <StatRow
          label={t('compare.stats.totalEarned')}
          icon="🏆"
          myValue={myStats.totalEarned}
          peerValue={peerStats.totalEarned}
        />
        <StatRow
          label={t('compare.stats.streak')}
          icon="🔥"
          myValue={myStats.streak}
          peerValue={peerStats.streak}
        />
        <StatRow
          label={t('compare.stats.collectibles')}
          icon="🎁"
          myValue={myStats.collectibleCount}
          peerValue={peerStats.collectibleCount}
        />
      </div>

      {/* Winner banner */}
      <div className={`p-4 text-center ${
        overallWinner === 'me' ? 'bg-gradient-to-r from-green-100 to-emerald-100' :
        overallWinner === 'peer' ? 'bg-gradient-to-r from-blue-100 to-cyan-100' :
        'bg-gradient-to-r from-sunset-peach/30 to-sunset-gold/30'
      }`}>
        {overallWinner === 'tie' ? (
          <p className="font-display font-bold text-sunset-twilight">
            🤝 {t('compare.itsATie')}!
          </p>
        ) : (
          <p className="font-display font-bold text-sunset-twilight">
            {overallWinner === 'me' ? '🎉 ' : ''}
            {t('compare.winner', { name: overallWinner === 'me' ? myName : peerName })}
            {overallWinner === 'me' ? ' 🎉' : ' 👏'}
          </p>
        )}
        <p className="text-sm text-sunset-twilight/60 mt-1">
          {myWins} - {peerWins}
        </p>
      </div>
    </div>
  );
}
