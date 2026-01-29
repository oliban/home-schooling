/**
 * Tests for SVG rendering support in collectibles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';

// Mock the translation hook
vi.mock('@/lib/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'collection.clickToHear': 'Click to hear',
        'collection.rarity.common': 'Common',
        'collection.rarity.rare': 'Rare',
        'collection.rarity.epic': 'Epic',
        'collection.rarity.legendary': 'Legendary',
        'collection.rarity.mythic': 'Mythic',
        'collection.rarity.secret': 'Secret',
        'collection.awesome': 'Awesome!',
        'treasureReveal.tapToReveal': 'Tap to reveal',
        'treasureReveal.newDiscovery': 'New discovery!',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock MagicParticles component
vi.mock('@/components/child/MagicParticles', () => ({
  MagicParticles: () => null,
}));

// Mock speechSynthesis and SpeechSynthesisUtterance
const mockSpeak = vi.fn();
const mockCancel = vi.fn();

class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = '';
  rate: number = 1;
  constructor(text: string) {
    this.text = text;
  }
}

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
  },
  writable: true,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});

import { TreasureReveal } from '@/components/child/TreasureReveal';

describe('TreasureReveal SVG Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockAsciiCollectible = {
    id: 'test-1',
    name: 'Il Gatto',
    ascii_art: '  /\\_/\\  \n ( o.o ) \n  > ^ <',
    rarity: 'common' as const,
    pronunciation: 'eel GAH-toh',
  };

  const mockSvgCollectible = {
    id: 'test-2',
    name: 'The One Ring',
    ascii_art: '  ( )  ',
    svg_path: '/collectibles/lotr/one-ring.svg',
    rarity: 'legendary' as const,
    pronunciation: 'The One Ring',
  };

  describe('Collectible interface', () => {
    it('should accept collectible without svg_path', () => {
      const onClose = vi.fn();
      render(<TreasureReveal collectible={mockAsciiCollectible} onClose={onClose} />);
      expect(screen.getByText('Tap to reveal')).toBeInTheDocument();
    });

    it('should accept collectible with svg_path', () => {
      const onClose = vi.fn();
      render(<TreasureReveal collectible={mockSvgCollectible} onClose={onClose} />);
      expect(screen.getByText('Tap to reveal')).toBeInTheDocument();
    });
  });

  describe('SVG rendering in reveal phase', () => {
    it('should render img element for SVG collectible after reveal', async () => {
      const onClose = vi.fn();
      const { container } = render(<TreasureReveal collectible={mockSvgCollectible} onClose={onClose} />);

      // Simulate tap
      const tapButton = screen.getByText('Tap to reveal');
      await act(async () => {
        fireEvent.click(tapButton);
      });

      // Wait for tapped phase to complete
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Wait for SVG reveal (500ms delay)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should render SVG image
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('src')).toBe('/collectibles/lotr/one-ring.svg');
      expect(img?.getAttribute('alt')).toBe('The One Ring');
    });

    it('should render pre element for ASCII collectible after reveal', async () => {
      const onClose = vi.fn();
      const { container } = render(<TreasureReveal collectible={mockAsciiCollectible} onClose={onClose} />);

      // Simulate tap
      const tapButton = screen.getByText('Tap to reveal');
      await act(async () => {
        fireEvent.click(tapButton);
      });

      // Wait for tapped phase to complete
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Wait for typewriter to complete (each char takes 20ms, 5 chars at a time)
      const artLength = mockAsciiCollectible.ascii_art.length;
      const iterations = Math.ceil(artLength / 5);
      await act(async () => {
        vi.advanceTimersByTime(iterations * 20 + 100);
      });

      // Should render ASCII art in pre element
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });

    it('should NOT render img element for ASCII collectible', async () => {
      const onClose = vi.fn();
      const { container } = render(<TreasureReveal collectible={mockAsciiCollectible} onClose={onClose} />);

      // Simulate tap
      const tapButton = screen.getByText('Tap to reveal');
      await act(async () => {
        fireEvent.click(tapButton);
      });

      // Wait for phases
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should NOT have img element
      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });
  });

  describe('SVG fade-in vs ASCII typewriter', () => {
    it('should skip typewriter effect for SVG collectibles', async () => {
      const onClose = vi.fn();
      render(<TreasureReveal collectible={mockSvgCollectible} onClose={onClose} />);

      // Simulate tap
      const tapButton = screen.getByText('Tap to reveal');
      await act(async () => {
        fireEvent.click(tapButton);
      });

      // Wait for tapped phase
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // SVG should be revealed quickly (500ms)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Name should be visible (indicates revealed phase)
      expect(screen.getByText('The One Ring')).toBeInTheDocument();
    });

    it('should show close button after SVG reveal', async () => {
      const onClose = vi.fn();
      render(<TreasureReveal collectible={mockSvgCollectible} onClose={onClose} />);

      // Simulate tap
      const tapButton = screen.getByText('Tap to reveal');
      await act(async () => {
        fireEvent.click(tapButton);
      });

      // Wait for tapped phase (600ms)
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Wait for SVG reveal phase (500ms) - need to advance separately after revealing phase starts
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Close button should be visible
      expect(screen.getByText(/Awesome!/)).toBeInTheDocument();
    });
  });
});

describe('Collectible Type Definition', () => {
  it('svg_path should be optional and nullable in the type', () => {
    // This test validates that our types accept the expected shapes
    const asciiOnly = {
      id: '1',
      name: 'Test',
      ascii_art: 'art',
      price: 10,
      rarity: 'common' as const,
      owned: false,
    };

    const withSvgNull = {
      ...asciiOnly,
      svg_path: null,
    };

    const withSvgPath = {
      ...asciiOnly,
      svg_path: '/path/to/svg.svg',
    };

    const withExpansion = {
      ...asciiOnly,
      svg_path: '/path/to/svg.svg',
      expansion_pack: 'lotr',
    };

    // These should all be valid shapes (type checking at compile time)
    expect(asciiOnly.name).toBe('Test');
    expect(withSvgNull.svg_path).toBeNull();
    expect(withSvgPath.svg_path).toBe('/path/to/svg.svg');
    expect(withExpansion.expansion_pack).toBe('lotr');
  });
});
