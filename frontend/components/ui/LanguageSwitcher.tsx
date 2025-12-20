'use client';

import { useLanguage } from '@/lib/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function LanguageSwitcher({ className = '', showLabel = true }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'sv' ? 'en' : 'sv');
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-gray-100 hover:bg-gray-200 transition-colors
        text-sm font-medium
        ${className}
      `}
      title={t('language.switch')}
    >
      <span className="text-lg">
        {locale === 'sv' ? '🇸🇪' : '🇬🇧'}
      </span>
      {showLabel && (
        <span>
          {locale === 'sv' ? 'Svenska' : 'English'}
        </span>
      )}
    </button>
  );
}

export default LanguageSwitcher;
