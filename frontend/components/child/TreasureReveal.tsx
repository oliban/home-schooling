'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagicParticles } from './MagicParticles';
import { useTranslation } from '@/lib/LanguageContext';

interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
  pronunciation?: string | null;
}

interface TreasureRevealProps {
  collectible: Collectible;
  onClose: () => void;
}

const rarityGlowClasses: Record<string, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  mythic: 'rarity-mythic',
  secret: 'rarity-secret',
};

const rarityBgClasses: Record<string, string> = {
  common: 'bg-gray-50 border-gray-300',
  rare: 'bg-blue-50 border-blue-400',
  epic: 'bg-purple-50 border-purple-400',
  legendary: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-sunset-gold',
  mythic: 'bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 border-pink-400',
  secret: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-500',
};

const rarityBadgeClasses: Record<string, string> = {
  common: 'bg-gray-200 text-gray-700',
  rare: 'bg-blue-200 text-blue-700',
  epic: 'bg-purple-200 text-purple-700',
  legendary: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-900',
  mythic: 'bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 text-white',
  secret: 'bg-gradient-to-r from-amber-300 to-orange-400 text-orange-900',
};

type Phase = 'waiting' | 'tapped' | 'revealing' | 'revealed';

export function TreasureReveal({ collectible, onClose }: TreasureRevealProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [typedText, setTypedText] = useState('');
  const [burstParticles, setBurstParticles] = useState(false);

  // Text-to-speech for Italian pronunciation
  const speakItalian = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Handle tap to reveal
  const handleTap = () => {
    if (phase !== 'waiting') return;
    setPhase('tapped');
    setBurstParticles(true);

    // Start the reveal sequence
    setTimeout(() => {
      setPhase('revealing');
      setBurstParticles(false);
    }, 600);
  };

  // Typewriter effect for ASCII art
  useEffect(() => {
    if (phase !== 'revealing') return;

    const art = collectible.ascii_art;
    let index = 0;
    const interval = setInterval(() => {
      if (index < art.length) {
        // Type multiple characters at once for speed
        const charsToAdd = Math.min(5, art.length - index);
        setTypedText(art.substring(0, index + charsToAdd));
        index += charsToAdd;
      } else {
        clearInterval(interval);
        setPhase('revealed');
        // Auto-speak the name
        speakItalian(collectible.pronunciation || collectible.name);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [phase, collectible, speakItalian]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay with fade in */}
      <div
        className={`absolute inset-0 bg-sunset-twilight/90 transition-opacity duration-500 ${
          phase === 'waiting' ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ animation: 'fadeIn 0.5s ease-out forwards' }}
      />

      {/* Particle system */}
      <MagicParticles active={phase !== 'waiting'} burst={burstParticles} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8">
        {/* Waiting phase - glowing orb */}
        {phase === 'waiting' && (
          <button
            onClick={handleTap}
            className="flex flex-col items-center gap-6 animate-fade-in"
          >
            {/* Glowing treasure orb */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sunset-gold via-sunset-amber to-sunset-tangerine animate-float gold-aura flex items-center justify-center">
                <span className="text-5xl">✨</span>
              </div>
              {/* Outer ring */}
              <div className="absolute inset-0 -m-4 rounded-full border-4 border-sunset-gold/30 animate-glow-pulse" />
            </div>

            {/* Tap prompt */}
            <div className="text-white text-center animate-bounce-gentle">
              <p className="text-2xl font-display font-bold mb-2">
                {t('treasureReveal.tapToReveal')}
              </p>
              <p className="text-sunset-peach/80 text-sm">
                {t('treasureReveal.newDiscovery')}
              </p>
            </div>
          </button>
        )}

        {/* Tapped phase - explosion effect */}
        {phase === 'tapped' && (
          <div className="w-32 h-32 rounded-full bg-white animate-scale-in" />
        )}

        {/* Revealing/Revealed phase - show collectible */}
        {(phase === 'revealing' || phase === 'revealed') && (
          <div className="flex flex-col items-center gap-6 max-w-md w-full animate-fade-in">
            {/* Rarity badge */}
            <div
              className={`px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
                rarityBadgeClasses[collectible.rarity]
              } ${collectible.rarity === 'mythic' ? 'mythic-sparkle' : ''}`}
            >
              {t(`collection.rarity.${collectible.rarity}`)}
            </div>

            {/* ASCII Art Card */}
            <div
              className={`relative rounded-2xl border-4 p-6 ${rarityBgClasses[collectible.rarity]} ${
                rarityGlowClasses[collectible.rarity]
              } ${phase === 'revealed' ? 'animate-treasure-reveal' : ''}`}
              style={{ perspective: '1000px' }}
            >
              <button
                onClick={() => speakItalian(collectible.pronunciation || collectible.name)}
                className="bg-white/80 backdrop-blur rounded-lg p-4 hover:bg-white transition-colors cursor-pointer w-full"
                title={t('collection.clickToHear')}
              >
                <pre className="text-xs sm:text-sm leading-tight font-mono text-center whitespace-pre text-sunset-twilight">
                  {typedText}
                  {phase === 'revealing' && <span className="animate-pulse">|</span>}
                </pre>
              </button>
            </div>

            {/* Name */}
            {phase === 'revealed' && (
              <button
                onClick={() => speakItalian(collectible.pronunciation || collectible.name)}
                className="text-white text-3xl font-display font-bold hover:text-sunset-gold transition-colors cursor-pointer animate-scale-in"
              >
                {collectible.name}
              </button>
            )}

            {/* Speaker hint */}
            {phase === 'revealed' && (
              <p className="text-sunset-peach/60 text-sm animate-fade-in">
                🔊 {t('collection.clickToHear')}
              </p>
            )}

            {/* Close button */}
            {phase === 'revealed' && (
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-sunset-tangerine to-sunset-coral text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg animate-scale-in"
              >
                {t('collection.awesome')} ✨
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
