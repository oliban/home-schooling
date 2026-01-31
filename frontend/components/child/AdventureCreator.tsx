'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { ThemePicker } from './ThemePicker';
import { SizeSelector } from './SizeSelector';

interface Theme {
  id: string;
  nameEn: string;
  nameSv: string;
  emoji: string;
  category: string;
}

interface Size {
  id: 'quick' | 'medium' | 'challenge';
  questionCount: number;
  nameEn: string;
  nameSv: string;
}

interface QuotaData {
  maxActive: number;
  activeCount: number;
  remaining: number;
  canCreate: boolean;
}

interface AdventureCreatorProps {
  quota: QuotaData;
  onClose: () => void;
  onSuccess: (adventureId: string, assignmentId: string) => void;
}

type Step = 'type' | 'theme' | 'size' | 'generating';

export function AdventureCreator({ quota, onClose, onSuccess }: AdventureCreatorProps) {
  const { locale, t } = useLanguage();
  const [step, setStep] = useState<Step>('type');
  const [contentType, setContentType] = useState<'math' | 'reading' | 'english' | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [customTheme, setCustomTheme] = useState('');
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Load themes and sizes on mount
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const token = localStorage.getItem('childToken');
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/adventures/themes`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setThemes(data.themes);
          setSizes(data.sizes);
        }
      } catch (err) {
        console.error('Failed to load themes:', err);
      }
    };

    loadThemes();
  }, []);

  const handleSelectType = (type: 'math' | 'reading' | 'english') => {
    setContentType(type);
    setStep('theme');
  };

  const handleThemeNext = () => {
    if (customTheme.trim()) {
      setStep('size');
    }
  };

  const handleGenerate = async () => {
    if (!contentType || !customTheme.trim() || !selectedSize) {
      return;
    }

    setStep('generating');
    setGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('childToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/adventures/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType,
          themeId: 'custom',
          customTheme: customTheme.trim(),
          sizeId: selectedSize.id,
          locale
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      onSuccess(data.adventureId, data.assignmentId);
    } catch (err) {
      setError(
        locale === 'sv'
          ? 'Kunde inte skapa äventyret. Försök igen!'
          : 'Could not create adventure. Please try again!'
      );
      setStep('size');
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    if (step === 'theme') {
      setStep('type');
      setContentType(null);
      setCustomTheme('');
    } else if (step === 'size') {
      setStep('theme');
      setSelectedSize(null);
    }
  };

  const canProceedFromTheme = customTheme.trim() !== '';
  const canProceedFromSize = selectedSize !== null;

  // Get emojis for selected themes
  const getSelectedEmojis = (): string[] => {
    if (!customTheme.trim()) return [];
    const selectedNames = customTheme.split(',').map(s => s.trim().toLowerCase());
    return themes
      .filter(t =>
        selectedNames.includes(t.nameSv.toLowerCase()) ||
        selectedNames.includes(t.nameEn.toLowerCase())
      )
      .map(t => t.emoji);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-card-warm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral rounded-t-2xl">
          <h2 className="text-xl font-display font-bold text-white">
            {locale === 'sv' ? 'Skapa ditt äventyr' : 'Create Your Adventure'} ✨
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none transition-colors"
            disabled={generating}
          >
            &times;
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 py-4 bg-sunset-cream/50">
          {['type', 'theme', 'size'].map((s, i) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                step === s
                  ? 'bg-sunset-tangerine'
                  : (step === 'generating' || ['type', 'theme', 'size'].indexOf(step) > i)
                    ? 'bg-sunset-gold'
                    : 'bg-sunset-peach/50'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Choose Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold text-center text-sunset-twilight mb-6">
                {locale === 'sv' ? 'Vad vill du göra?' : 'What do you want to do?'}
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleSelectType('math')}
                  className="flex-1 max-w-[250px] p-6 rounded-2xl border-2 border-sunset-peach hover:border-sunset-tangerine bg-white hover:bg-sunset-cream/50 transition-all transform hover:scale-105 shadow-sm hover:shadow-card-warm"
                >
                  <div className="text-5xl mb-3">📐</div>
                  <div className="font-display font-bold text-lg text-sunset-twilight">
                    {locale === 'sv' ? 'Matte' : 'Math'}
                  </div>
                  <div className="text-sm text-sunset-twilight/70 mt-1">
                    {locale === 'sv' ? 'Lösningsuppgifter med roliga teman' : 'Problem solving with fun themes'}
                  </div>
                </button>
                <button
                  onClick={() => handleSelectType('reading')}
                  className="flex-1 max-w-[250px] p-6 rounded-2xl border-2 border-sunset-peach hover:border-sunset-coral bg-white hover:bg-sunset-cream/50 transition-all transform hover:scale-105 shadow-sm hover:shadow-card-warm"
                >
                  <div className="text-5xl mb-3">📖</div>
                  <div className="font-display font-bold text-lg text-sunset-twilight">
                    {locale === 'sv' ? 'Läsning' : 'Reading'}
                  </div>
                  <div className="text-sm text-sunset-twilight/70 mt-1">
                    {locale === 'sv' ? 'Korta berättelser med frågor' : 'Short stories with questions'}
                  </div>
                </button>
                <button
                  onClick={() => handleSelectType('english')}
                  className="flex-1 max-w-[250px] p-6 rounded-2xl border-2 border-sunset-peach hover:border-blue-400 bg-white hover:bg-blue-50/50 transition-all transform hover:scale-105 shadow-sm hover:shadow-card-warm"
                >
                  <div className="text-5xl mb-3">🇬🇧</div>
                  <div className="font-display font-bold text-lg text-sunset-twilight">
                    {locale === 'sv' ? 'Engelska' : 'English'}
                  </div>
                  <div className="text-sm text-sunset-twilight/70 mt-1">
                    {locale === 'sv' ? 'Övningar i engelska' : 'English language practice'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Theme */}
          {step === 'theme' && (
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold text-center text-sunset-twilight mb-6">
                {locale === 'sv' ? 'Välj ett tema' : 'Choose a theme'}
              </h3>
              <ThemePicker
                themes={themes}
                customTheme={customTheme}
                onCustomThemeChange={setCustomTheme}
                locale={locale}
              />
            </div>
          )}

          {/* Step 3: Choose Size */}
          {step === 'size' && (
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold text-center text-sunset-twilight mb-6">
                {locale === 'sv' ? 'Hur många frågor?' : 'How many questions?'}
              </h3>
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                locale={locale}
              />
              {error && (
                <div className="mt-4 p-3 bg-sunset-coral/10 border border-sunset-coral/30 rounded-lg text-sunset-coral text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Generating state */}
          {step === 'generating' && (
            <div className="text-center py-12 relative overflow-hidden bg-gradient-to-b from-sunset-cream/50 to-white rounded-xl">
              {/* Dancing theme emojis */}
              <div className="flex justify-center gap-4 mb-6 min-h-[80px]">
                {getSelectedEmojis().length > 0 ? (
                  getSelectedEmojis().map((emoji, i) => (
                    <span
                      key={i}
                      className="text-5xl animate-float"
                      style={{
                        animationDelay: `${i * 0.3}s`
                      }}
                    >
                      {emoji}
                    </span>
                  ))
                ) : (
                  <span className="text-6xl animate-float">✨</span>
                )}
              </div>
              <h3 className="text-xl font-display font-bold text-sunset-twilight mb-2">
                {locale === 'sv' ? 'Skapar ditt äventyr...' : 'Creating your adventure...'}
              </h3>
              <p className="text-sunset-twilight/70">
                {locale === 'sv' ? 'Detta tar ungefär en halv minut' : 'This will take about half a minute'}
              </p>
              <div className="mt-6 flex justify-center">
                <div className="w-12 h-12 border-4 border-sunset-tangerine border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'generating' && (
          <div className="flex justify-between p-4 border-t border-sunset-peach/30 bg-sunset-cream/30 rounded-b-2xl">
            <button
              onClick={step === 'type' ? onClose : handleBack}
              className="px-6 py-2 text-sunset-twilight/70 hover:text-sunset-twilight font-medium transition-colors"
            >
              {step === 'type'
                ? (locale === 'sv' ? 'Avbryt' : 'Cancel')
                : (locale === 'sv' ? 'Tillbaka' : 'Back')
              }
            </button>

            {step === 'theme' && (
              <button
                onClick={handleThemeNext}
                disabled={!canProceedFromTheme}
                className={`px-6 py-2 rounded-xl font-display font-medium transition-all ${
                  canProceedFromTheme
                    ? 'bg-sunset-tangerine hover:bg-sunset-coral text-white shadow-sm hover:shadow-md'
                    : 'bg-sunset-peach/50 text-sunset-twilight/40 cursor-not-allowed'
                }`}
              >
                {locale === 'sv' ? 'Nästa' : 'Next'}
              </button>
            )}

            {step === 'size' && (
              <button
                onClick={handleGenerate}
                disabled={!canProceedFromSize}
                className={`px-6 py-2 rounded-xl font-display font-medium transition-all ${
                  canProceedFromSize
                    ? 'bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral hover:from-sunset-amber hover:via-sunset-gold hover:to-sunset-tangerine text-white shadow-md hover:shadow-lg'
                    : 'bg-sunset-peach/50 text-sunset-twilight/40 cursor-not-allowed'
                }`}
              >
                ✨ {locale === 'sv' ? 'Skapa äventyret!' : 'Create adventure!'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdventureCreator;
