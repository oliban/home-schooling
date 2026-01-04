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
  const [contentType, setContentType] = useState<'math' | 'reading' | null>(null);
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

  const handleSelectType = (type: 'math' | 'reading') => {
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
          sizeId: selectedSize.id
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {locale === 'sv' ? 'Skapa ditt äventyr' : 'Create Your Adventure'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={generating}
          >
            &times;
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 py-4">
          {['type', 'theme', 'size'].map((s, i) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full ${
                step === s
                  ? 'bg-blue-500'
                  : (step === 'generating' || ['type', 'theme', 'size'].indexOf(step) > i)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Choose Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-6">
                {locale === 'sv' ? 'Vad vill du göra?' : 'What do you want to do?'}
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleSelectType('math')}
                  className="flex-1 max-w-[250px] p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 bg-white transition-all transform hover:scale-105"
                >
                  <div className="text-5xl mb-3">📐</div>
                  <div className="font-bold text-lg text-gray-800">
                    {locale === 'sv' ? 'Matte' : 'Math'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {locale === 'sv' ? 'Lösningsuppgifter med roliga teman' : 'Problem solving with fun themes'}
                  </div>
                </button>
                <button
                  onClick={() => handleSelectType('reading')}
                  className="flex-1 max-w-[250px] p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-400 bg-white transition-all transform hover:scale-105"
                >
                  <div className="text-5xl mb-3">📖</div>
                  <div className="font-bold text-lg text-gray-800">
                    {locale === 'sv' ? 'Läsning' : 'Reading'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {locale === 'sv' ? 'Korta berättelser med frågor' : 'Short stories with questions'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Theme */}
          {step === 'theme' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-6">
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
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-6">
                {locale === 'sv' ? 'Hur många frågor?' : 'How many questions?'}
              </h3>
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                locale={locale}
              />
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Generating state */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {locale === 'sv' ? 'Skapar ditt äventyr...' : 'Creating your adventure...'}
              </h3>
              <p className="text-gray-600">
                {locale === 'sv' ? 'Detta tar ungefär en halv minut' : 'This will take about half a minute'}
              </p>
              <div className="mt-6 flex justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'generating' && (
          <div className="flex justify-between p-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={step === 'type' ? onClose : handleBack}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
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
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceedFromTheme
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {locale === 'sv' ? 'Nästa' : 'Next'}
              </button>
            )}

            {step === 'size' && (
              <button
                onClick={handleGenerate}
                disabled={!canProceedFromSize}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceedFromSize
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {locale === 'sv' ? 'Skapa äventyret!' : 'Create adventure!'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdventureCreator;
