/**
 * ExpansionBanner component tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpansionBanner } from '@/components/child/ExpansionBanner';

describe('ExpansionBanner', () => {
  describe('Default theme rendering', () => {
    it('should render the expansion name', () => {
      render(<ExpansionBanner name="Italian Animals" collected={5} total={10} />);
      expect(screen.getByText('Italian Animals')).toBeInTheDocument();
    });

    it('should display the collection progress', () => {
      render(<ExpansionBanner name="Italian Animals" collected={5} total={10} />);
      expect(screen.getByText('5/10 collected')).toBeInTheDocument();
    });

    it('should display the percentage progress', () => {
      render(<ExpansionBanner name="Italian Animals" collected={5} total={10} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle zero total without error', () => {
      render(<ExpansionBanner name="Empty Pack" collected={0} total={0} />);
      expect(screen.getByText('0/0 collected')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle full collection', () => {
      render(<ExpansionBanner name="Complete Pack" collected={10} total={10} />);
      expect(screen.getByText('10/10 collected')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should round percentage correctly', () => {
      render(<ExpansionBanner name="Test Pack" collected={1} total={3} />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('LOTR theme rendering', () => {
    it('should render the expansion name with LOTR theme', () => {
      render(<ExpansionBanner name="Middle-earth Treasures" collected={3} total={12} theme="lotr" />);
      expect(screen.getByText('Middle-earth Treasures')).toBeInTheDocument();
    });

    it('should display decorative elvish text for LOTR theme', () => {
      render(<ExpansionBanner name="Middle-earth Treasures" collected={3} total={12} theme="lotr" />);
      expect(screen.getByText('One Ring to rule them all')).toBeInTheDocument();
    });

    it('should NOT display decorative text for default theme', () => {
      render(<ExpansionBanner name="Italian Animals" collected={5} total={10} theme="default" />);
      expect(screen.queryByText('One Ring to rule them all')).not.toBeInTheDocument();
    });

    it('should NOT display decorative text when no theme specified', () => {
      render(<ExpansionBanner name="Italian Animals" collected={5} total={10} />);
      expect(screen.queryByText('One Ring to rule them all')).not.toBeInTheDocument();
    });
  });

  describe('Progress bar', () => {
    it('should render progress bar with correct width style', () => {
      const { container } = render(<ExpansionBanner name="Test" collected={5} total={10} />);
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render 0% width when no items collected', () => {
      const { container } = render(<ExpansionBanner name="Test" collected={0} total={10} />);
      const progressBar = container.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render 100% width when all items collected', () => {
      const { container } = render(<ExpansionBanner name="Test" collected={10} total={10} />);
      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have amber/gold gradient for LOTR theme', () => {
      const { container } = render(<ExpansionBanner name="LOTR Pack" collected={1} total={10} theme="lotr" />);
      const banner = container.firstChild as HTMLElement;
      expect(banner.className).toContain('from-amber-900');
      expect(banner.className).toContain('via-yellow-800');
      expect(banner.className).toContain('to-amber-900');
    });

    it('should have sunset gradient for default theme', () => {
      const { container } = render(<ExpansionBanner name="Default Pack" collected={1} total={10} />);
      const banner = container.firstChild as HTMLElement;
      expect(banner.className).toContain('from-sunset-tangerine');
      expect(banner.className).toContain('to-sunset-coral');
    });
  });
});
