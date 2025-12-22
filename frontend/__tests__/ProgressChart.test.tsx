/**
 * ProgressChart component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock recharts since it requires DOM measurements
vi.mock('recharts', () => ({
  BarChart: ({ children }: React.PropsWithChildren) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children, dataKey }: React.PropsWithChildren<{ dataKey: string }>) => (
    <div data-testid={`bar-${dataKey}`}>{children}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
}));

// Mock the translation hook
vi.mock('@/lib/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'parent.stats.title': 'Progress Statistics',
        'parent.stats.last7Days': 'Last 7 Days',
        'parent.stats.last30Days': 'Last 30 Days',
        'parent.stats.allTime': 'All Time',
        'parent.stats.noAnswers': 'No answers yet',
        'parent.stats.correct': 'Correct',
        'parent.stats.incorrect': 'Incorrect',
        'parent.stats.math': 'Math',
        'parent.stats.reading': 'Reading',
      };
      return translations[key] || key;
    },
    locale: 'en',
  }),
}));

import ProgressChart, { DailyStatsData } from '@/components/ui/ProgressChart';

describe('ProgressChart', () => {
  const mockOnPeriodChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should render empty state when no data', () => {
      render(
        <ProgressChart
          data={[]}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByText('No answers yet')).toBeInTheDocument();
    });

    it('should render period selector in empty state', () => {
      render(
        <ProgressChart
          data={[]}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('With data', () => {
    const singleChildData: DailyStatsData[] = [
      {
        date: '2024-12-20',
        childId: 'child-1',
        childName: 'Alice',
        subject: 'math',
        correct: 5,
        incorrect: 2,
      },
    ];

    const twoChildrenData: DailyStatsData[] = [
      {
        date: '2024-12-20',
        childId: 'child-1',
        childName: 'Alice',
        subject: 'math',
        correct: 5,
        incorrect: 2,
      },
      {
        date: '2024-12-20',
        childId: 'child-2',
        childName: 'Bob',
        subject: 'math',
        correct: 8,
        incorrect: 1,
      },
    ];

    it('should render chart when data is provided', () => {
      render(
        <ProgressChart
          data={singleChildData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(
        <ProgressChart
          data={singleChildData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByText('Progress Statistics')).toBeInTheDocument();
    });

    it('should show legend with child name for single child', () => {
      render(
        <ProgressChart
          data={singleChildData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByText('Alice:')).toBeInTheDocument();
    });

    it('should show legends for multiple children', () => {
      render(
        <ProgressChart
          data={twoChildrenData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      expect(screen.getByText('Alice:')).toBeInTheDocument();
      expect(screen.getByText('Bob:')).toBeInTheDocument();
    });

    it('should show correct/incorrect labels in legend', () => {
      render(
        <ProgressChart
          data={singleChildData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const correctLabels = screen.getAllByText('Correct');
      const incorrectLabels = screen.getAllByText('Incorrect');
      expect(correctLabels.length).toBeGreaterThan(0);
      expect(incorrectLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Period selection', () => {
    const testData: DailyStatsData[] = [
      {
        date: '2024-12-20',
        childId: 'child-1',
        childName: 'Alice',
        subject: 'math',
        correct: 5,
        incorrect: 2,
      },
    ];

    it('should call onPeriodChange when period is changed', () => {
      render(
        <ProgressChart
          data={testData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '30d' } });
      expect(mockOnPeriodChange).toHaveBeenCalledWith('30d');
    });

    it('should show selected period in dropdown', () => {
      render(
        <ProgressChart
          data={testData}
          period="30d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('30d');
    });
  });

  describe('Child color differentiation', () => {
    const threeChildrenData: DailyStatsData[] = [
      {
        date: '2024-12-20',
        childId: 'child-1',
        childName: 'Alice',
        subject: 'math',
        correct: 5,
        incorrect: 2,
      },
      {
        date: '2024-12-20',
        childId: 'child-2',
        childName: 'Bob',
        subject: 'math',
        correct: 8,
        incorrect: 1,
      },
      {
        date: '2024-12-20',
        childId: 'child-3',
        childName: 'Charlie',
        subject: 'math',
        correct: 3,
        incorrect: 4,
      },
    ];

    it('should render Cell components for each data point', () => {
      render(
        <ProgressChart
          data={threeChildrenData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const cells = screen.getAllByTestId('cell');
      // Should have cells for both correct and incorrect bars for each child
      expect(cells.length).toBe(6); // 3 children * 2 (correct + incorrect)
    });

    it('should use different colors for different children', () => {
      render(
        <ProgressChart
          data={threeChildrenData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const cells = screen.getAllByTestId('cell');
      const fills = cells.map((cell) => cell.getAttribute('data-fill'));

      // All expected colors should be present (order may vary based on data order)
      expect(fills).toContain('#166534'); // dark green for correct
      expect(fills).toContain('#991b1b'); // dark red for incorrect
      expect(fills).toContain('#86efac'); // light green for correct
      expect(fills).toContain('#fca5a5'); // light red for incorrect
      expect(fills).toContain('#22c55e'); // medium green for correct
      expect(fills).toContain('#ef4444'); // medium red for incorrect
    });

    it('should show color swatches in legend matching child colors', () => {
      const { container } = render(
        <ProgressChart
          data={threeChildrenData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );

      // Check for color swatches in the legend
      const colorSwatches = container.querySelectorAll('.w-3.h-3.rounded');
      expect(colorSwatches.length).toBe(6); // 3 children * 2 (correct + incorrect)

      // First child colors
      expect((colorSwatches[0] as HTMLElement).style.backgroundColor).toBe('rgb(22, 101, 52)'); // #166534
      expect((colorSwatches[1] as HTMLElement).style.backgroundColor).toBe('rgb(153, 27, 27)'); // #991b1b
    });
  });

  describe('Two children contrast optimization', () => {
    const twoChildrenData: DailyStatsData[] = [
      {
        date: '2024-12-20',
        childId: 'child-1',
        childName: 'Alice',
        subject: 'math',
        correct: 5,
        incorrect: 2,
      },
      {
        date: '2024-12-20',
        childId: 'child-2',
        childName: 'Bob',
        subject: 'math',
        correct: 8,
        incorrect: 1,
      },
    ];

    it('should use maximum contrast colors for 2 children (dark vs light)', () => {
      render(
        <ProgressChart
          data={twoChildrenData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      const cells = screen.getAllByTestId('cell');
      const fills = cells.map((cell) => cell.getAttribute('data-fill'));

      // Should have 4 cells (2 children * 2 bars each)
      expect(cells.length).toBe(4);

      // First child should get dark colors and second child should get light colors
      // Order may vary based on data order, but all these colors should be present
      expect(fills).toContain('#166534'); // dark green
      expect(fills).toContain('#991b1b'); // dark red
      expect(fills).toContain('#86efac'); // light green
      expect(fills).toContain('#fca5a5'); // light red
    });
  });
});
