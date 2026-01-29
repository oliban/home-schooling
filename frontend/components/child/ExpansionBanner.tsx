'use client';

interface ExpansionBannerProps {
  name: string;
  collected: number;
  total: number;
  theme?: 'lotr' | 'default';
}

export function ExpansionBanner({ name, collected, total, theme = 'default' }: ExpansionBannerProps) {
  const isLotr = theme === 'lotr';

  return (
    <div
      className={`rounded-2xl p-4 shadow-lg mb-6 ${
        isLotr
          ? 'bg-gradient-to-r from-amber-900 via-yellow-800 to-amber-900 border-2 border-yellow-500/50'
          : 'bg-gradient-to-r from-sunset-tangerine to-sunset-coral'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLotr && (
            <div className="relative">
              {/* One Ring styling */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg ring-2 ring-yellow-300/50">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 ring-1 ring-yellow-400/30" />
              </div>
              {/* Golden glow effect */}
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-pulse" />
            </div>
          )}
          <div>
            <h3
              className={`font-display font-bold text-lg ${
                isLotr ? 'text-yellow-100' : 'text-white'
              }`}
            >
              {name}
            </h3>
            <p
              className={`text-sm ${
                isLotr ? 'text-yellow-200/80' : 'text-white/80'
              }`}
            >
              {collected}/{total} collected
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-24 h-2 rounded-full overflow-hidden ${
              isLotr ? 'bg-amber-950' : 'bg-white/30'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLotr
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                  : 'bg-white'
              }`}
              style={{ width: `${total > 0 ? (collected / total) * 100 : 0}%` }}
            />
          </div>
          <span
            className={`text-sm font-bold ${
              isLotr ? 'text-yellow-300' : 'text-white'
            }`}
          >
            {total > 0 ? Math.round((collected / total) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* LOTR decorative elvish text */}
      {isLotr && (
        <div className="mt-2 text-center">
          <p className="text-yellow-500/40 text-xs italic font-serif tracking-widest">
            One Ring to rule them all
          </p>
        </div>
      )}
    </div>
  );
}
