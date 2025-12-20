'use client';

import { useState } from 'react';

interface SpeakButtonProps {
  text: string;
  lang?: 'sv-SE' | 'it-IT' | 'en-US';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function speak(text: string, lang: 'sv-SE' | 'it-IT' | 'en-US' = 'sv-SE') {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }
}

export function SpeakButton({
  text,
  lang = 'sv-SE',
  size = 'md',
  className = '',
  showLabel = false,
  label = 'Lyssna'
}: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    }
  };

  const sizeClasses = {
    sm: 'text-lg p-1',
    md: 'text-2xl p-2',
    lg: 'text-3xl p-3'
  };

  return (
    <button
      onClick={handleSpeak}
      className={`
        inline-flex items-center gap-2 rounded-full
        hover:bg-gray-100 active:bg-gray-200
        transition-all duration-200
        ${isSpeaking ? 'animate-pulse bg-blue-100' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
      title={label}
      aria-label={label}
    >
      <span className={isSpeaking ? 'animate-bounce' : ''}>
        🔊
      </span>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600">
          {label}
        </span>
      )}
    </button>
  );
}

export default SpeakButton;
