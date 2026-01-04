'use client';

import { useState, useEffect, useMemo } from 'react';

interface Theme {
  id: string;
  nameEn: string;
  nameSv: string;
  emoji: string;
  category: string;
}

interface ThemePickerProps {
  themes: Theme[];
  customTheme: string;
  onCustomThemeChange: (value: string) => void;
  locale: 'sv' | 'en';
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function ThemePicker({
  themes,
  customTheme,
  onCustomThemeChange,
  locale
}: ThemePickerProps) {
  // State for currently displayed themes (random subset)
  const [displayedThemes, setDisplayedThemes] = useState<Theme[]>([]);

  // Initialize with random themes on mount
  useEffect(() => {
    if (themes.length > 0) {
      setDisplayedThemes(shuffleArray(themes).slice(0, 12));
    }
  }, [themes]);

  // Handle shuffle button click
  const handleShuffle = () => {
    setDisplayedThemes(shuffleArray(themes).slice(0, 12));
  };

  const MAX_THEMES = 5;

  // Track which themes are already selected (in the text field)
  const selectedThemeNames = useMemo(() => {
    if (!customTheme.trim()) return new Set<string>();
    const names = customTheme.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    return new Set(names);
  }, [customTheme]);

  const selectedCount = selectedThemeNames.size;
  const canAddMore = selectedCount < MAX_THEMES;

  // Handle theme click - toggle selection
  const handleThemeClick = (theme: Theme) => {
    const themeName = locale === 'sv' ? theme.nameSv : theme.nameEn;
    const isSelected = isThemeSelected(theme);

    if (isSelected) {
      // Remove the theme from the list
      const themes = customTheme.split(',').map(s => s.trim()).filter(s => s);
      const filtered = themes.filter(t =>
        t.toLowerCase() !== theme.nameSv.toLowerCase() &&
        t.toLowerCase() !== theme.nameEn.toLowerCase()
      );
      onCustomThemeChange(filtered.join(', '));
    } else {
      // Add the theme if not at max
      if (!canAddMore) return;

      const newValue = customTheme.trim()
        ? `${customTheme}, ${themeName}`
        : themeName;

      // Don't exceed 100 characters
      if (newValue.length > 100) return;

      onCustomThemeChange(newValue);
    }
  };

  const isThemeSelected = (theme: Theme) => {
    const svName = theme.nameSv.toLowerCase();
    const enName = theme.nameEn.toLowerCase();
    return selectedThemeNames.has(svName) || selectedThemeNames.has(enName);
  };

  return (
    <div className="space-y-4">
      {/* Theme count indicator */}
      <div className="text-center text-sm text-gray-600">
        {locale === 'sv'
          ? `${selectedCount}/${MAX_THEMES} teman valda`
          : `${selectedCount}/${MAX_THEMES} themes selected`}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {displayedThemes.map(theme => {
          const selected = isThemeSelected(theme);
          const disabled = !canAddMore && !selected;
          return (
            <button
              key={theme.id}
              onClick={() => handleThemeClick(theme)}
              disabled={disabled}
              className={`
                p-4 rounded-xl border-2 transition-all transform
                ${selected
                  ? 'border-green-500 bg-green-50 shadow-md hover:bg-green-100 hover:scale-105'
                  : disabled
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 bg-white hover:scale-105'
                }
              `}
            >
              <div className="text-3xl mb-1">{theme.emoji}</div>
              <div className="text-sm font-medium text-gray-800">
                {locale === 'sv' ? theme.nameSv : theme.nameEn}
              </div>
              {selected && <div className="text-xs text-green-600 mt-1">✓</div>}
            </button>
          );
        })}
      </div>

      {/* Shuffle button */}
      <div className="flex justify-center">
        <button
          onClick={handleShuffle}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors"
        >
          <span className="text-xl">🎲</span>
          <span className="text-sm">
            {locale === 'sv' ? 'Visa andra teman' : 'Show other themes'}
          </span>
        </button>
      </div>

      <div className="mt-4">
        <label className="text-sm text-gray-600 mb-1 block">
          {locale === 'sv' ? 'Valda teman (klicka ovan för att lägga till):' : 'Selected themes (click above to add):'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={customTheme}
            onChange={e => onCustomThemeChange(e.target.value.slice(0, 100))}
            maxLength={100}
            placeholder={locale === 'sv' ? 'T.ex. Dinosaurier, Rymden, Pirater' : 'E.g. Dinosaurs, Space, Pirates'}
            className={`
              w-full px-4 py-3 pr-10 rounded-lg border-2 transition-colors
              ${customTheme
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 focus:border-blue-400'
              }
              focus:outline-none
            `}
          />
          {customTheme && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {customTheme.length}/100
            </span>
          )}
          {customTheme && (
            <button
              onClick={() => onCustomThemeChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title={locale === 'sv' ? 'Rensa' : 'Clear'}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;
