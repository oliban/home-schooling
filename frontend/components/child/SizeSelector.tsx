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
    selected: 'border-green-500 bg-green-50',
    hover: 'hover:border-green-300'
  },
  medium: {
    selected: 'border-blue-500 bg-blue-50',
    hover: 'hover:border-blue-300'
  },
  challenge: {
    selected: 'border-purple-500 bg-purple-50',
    hover: 'hover:border-purple-300'
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
                ? `${colors.selected} shadow-md`
                : `border-gray-200 bg-white ${colors.hover}`
              }
            `}
          >
            <div className="text-4xl mb-2">{SIZE_ICONS[size.id]}</div>
            <div className="font-bold text-gray-800">
              {locale === 'sv' ? size.nameSv : size.nameEn}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {size.questionCount} {locale === 'sv' ? 'frågor' : 'questions'}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default SizeSelector;
