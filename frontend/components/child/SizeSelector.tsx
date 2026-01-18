'use client';

interface Size {
  id: 'quick' | 'medium' | 'challenge';
  questionCount: number;
  nameEn: string;
  nameSv: string;
}

interface SizeSelectorProps {
  sizes: Size[];
  selectedSize: Size | null;
  onSelectSize: (size: Size) => void;
  locale: 'sv' | 'en';
}

const SIZE_ICONS: Record<string, string> = {
  quick: '⚡',
  medium: '🎯',
  challenge: '🏆'
};

const SIZE_COLORS: Record<string, { selected: string; hover: string }> = {
  quick: {
    selected: 'border-sunset-gold bg-sunset-amber/20 shadow-card-warm',
    hover: 'hover:border-sunset-gold'
  },
  medium: {
    selected: 'border-sunset-tangerine bg-sunset-peach/30 shadow-card-warm',
    hover: 'hover:border-sunset-tangerine'
  },
  challenge: {
    selected: 'border-sunset-coral bg-sunset-coral/20 shadow-card-warm',
    hover: 'hover:border-sunset-coral'
  }
};

export function SizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  locale
}: SizeSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      {sizes.map(size => {
        const isSelected = selectedSize?.id === size.id;
        const colors = SIZE_COLORS[size.id];

        return (
          <button
            key={size.id}
            onClick={() => onSelectSize(size)}
            className={`
              flex-1 max-w-[200px] p-6 rounded-2xl border-2 transition-all transform hover:scale-105
              ${isSelected
                ? colors.selected
                : `border-sunset-peach bg-white ${colors.hover}`
              }
            `}
          >
            <div className="text-4xl mb-2">{SIZE_ICONS[size.id]}</div>
            <div className="font-display font-bold text-sunset-twilight">
              {locale === 'sv' ? size.nameSv : size.nameEn}
            </div>
            <div className="text-sm text-sunset-twilight/70 mt-1">
              {size.questionCount} {locale === 'sv' ? 'frågor' : 'questions'}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default SizeSelector;
