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
  Bar: ({ children, dataKey, fill }: React.PropsWithChildren<{ dataKey: string; fill: string }>) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill}>{children}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="responsive-container">{children}</div>
  ),
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
        'parent.stats.english': 'English',
        'parent.stats.quiz': 'Quiz',
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

  describe('Subject-stacked bars', () => {
    const multiSubjectData: DailyStatsData[] = [
      { date: '2024-12-20', childId: 'c1', childName: 'Alice', subject: 'math', correct: 5, incorrect: 2 },
      { date: '2024-12-20', childId: 'c1', childName: 'Alice', subject: 'reading', correct: 3, incorrect: 1 },
      { date: '2024-12-20', childId: 'c1', childName: 'Alice', subject: 'english', correct: 4, incorrect: 0 },
      { date: '2024-12-20', childId: 'c1', childName: 'Alice', subject: 'quiz', correct: 2, incorrect: 3 },
    ];

    it('should render correct and error Bar layers per subject', () => {
      render(
        <ProgressChart
          data={multiSubjectData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      // Each subject gets a correct Bar and an error Bar
      for (const subject of ['math', 'reading', 'english', 'quiz']) {
        expect(screen.getByTestId(`bar-${subject}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bar-${subject}_err`)).toBeInTheDocument();
      }
    });

    it('should use solid colors for correct and lighter colors for errors', () => {
      render(
        <ProgressChart
          data={multiSubjectData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      // Correct bars use solid subject colors
      expect(screen.getByTestId('bar-math').getAttribute('data-fill')).toBe('#2563eb');
      expect(screen.getByTestId('bar-reading').getAttribute('data-fill')).toBe('#16a34a');
      expect(screen.getByTestId('bar-english').getAttribute('data-fill')).toBe('#9333ea');
      expect(screen.getByTestId('bar-quiz').getAttribute('data-fill')).toBe('#ea580c');
      // Error bars use lighter shades
      expect(screen.getByTestId('bar-math_err').getAttribute('data-fill')).toBe('#93c5fd');
      expect(screen.getByTestId('bar-reading_err').getAttribute('data-fill')).toBe('#86efac');
      expect(screen.getByTestId('bar-english_err').getAttribute('data-fill')).toBe('#c4b5fd');
      expect(screen.getByTestId('bar-quiz_err').getAttribute('data-fill')).toBe('#fdba74');
    });
  });

  describe('Subject legend', () => {
    const testData: DailyStatsData[] = [
      { date: '2024-12-20', childId: 'c1', childName: 'Alice', subject: 'math', correct: 5, incorrect: 2 },
    ];

    it('should show legend with correct and error color swatches per subject', () => {
      const { container } = render(
        <ProgressChart
          data={testData}
          period="7d"
          onPeriodChange={mockOnPeriodChange}
        />
      );
      // Each subject has two swatches: solid (correct) + light (error)
      const solidSwatches = container.querySelectorAll('.w-3.h-3.rounded-l');
      const errorSwatches = container.querySelectorAll('.w-3.h-3.rounded-r');
      expect(solidSwatches.length).toBe(4);
      expect(errorSwatches.length).toBe(4);

      // Solid colors
      expect((solidSwatches[0] as HTMLElement).style.backgroundColor).toBe('rgb(37, 99, 235)');  // math blue
      expect((solidSwatches[1] as HTMLElement).style.backgroundColor).toBe('rgb(22, 163, 74)');  // reading green
      // Error colors
      expect((errorSwatches[0] as HTMLElement).style.backgroundColor).toBe('rgb(147, 197, 253)'); // math light blue
      expect((errorSwatches[1] as HTMLElement).style.backgroundColor).toBe('rgb(134, 239, 172)'); // reading light green
    });
  });
});
