'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface DailyStatsData {
  date: string;
  childId: string;
  childName: string;
  subject: 'math' | 'reading' | 'english' | 'quiz';
  correct: number;
  incorrect: number;
}

interface ProgressChartProps {
  data: DailyStatsData[];
  period: '7d' | '30d' | 'all';
  onPeriodChange: (period: '7d' | '30d' | 'all') => void;
}

// Get date range string based on period (client-only to avoid hydration mismatch)
function getDateRangeString(period: '7d' | '30d' | 'all', locale: string): string {
  const now = new Date();
  const formatDate = (date: Date) => date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short'
  });

  if (period === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return `${formatDate(start)} - ${formatDate(now)}`;
  } else if (period === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return `${formatDate(start)} - ${formatDate(now)}`;
  }
  return '';
}

const SUBJECTS = ['math', 'reading', 'english', 'quiz'] as const;

export const SUBJECT_COLORS: Record<string, { color: string; errorColor: string; emoji: string }> = {
  math:    { color: '#2563eb', errorColor: '#93c5fd', emoji: '📐' },
  reading: { color: '#16a34a', errorColor: '#86efac', emoji: '📖' },
  english: { color: '#9333ea', errorColor: '#c4b5fd', emoji: '🇬🇧' },
  quiz:    { color: '#ea580c', errorColor: '#fdba74', emoji: '🧠' },
};

// Chart data: one entry per date+child, with per-subject correct/incorrect as fields
interface ChartEntry {
  label: string;
  date: string;
  childName: string;
  math: number;
  math_err: number;
  reading: number;
  reading_err: number;
  english: number;
  english_err: number;
  quiz: number;
  quiz_err: number;
  // Store per-subject details for tooltip
  details: Record<string, { correct: number; incorrect: number }>;
}

export default function ProgressChart({ data, period, onPeriodChange }: ProgressChartProps) {
  const { t, locale } = useTranslation();
  const [dateRange, setDateRange] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Compute date range only on client to avoid hydration mismatch
  useEffect(() => {
    setDateRange(getDateRangeString(period, locale));
  }, [period, locale]);

  // Auto-scroll to the right (most recent days) when data changes
  useEffect(() => {
    const scrollToEnd = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        container.scrollTo({
          left: container.scrollWidth,
          behavior: 'auto'
        });
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToEnd);
    });

    const timer = setTimeout(scrollToEnd, 300);
    return () => clearTimeout(timer);
  }, [data, period]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('parent.stats.title')}</h3>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as '7d' | '30d' | 'all')}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">{t('parent.stats.last7Days')}</option>
            <option value="30d">{t('parent.stats.last30Days')}</option>
            <option value="all">{t('parent.stats.allTime')}</option>
          </select>
        </div>
        <div className="text-center py-12 text-gray-500">
          {t('parent.stats.noAnswers')}
        </div>
      </div>
    );
  }

  // Get unique children and dates
  const children = [...new Set(data.map(d => d.childName))].sort();
  const dates = [...new Set(data.map(d => d.date))].sort();

  // Index raw data for quick lookup
  const dataMap = new Map<string, DailyStatsData>();
  for (const item of data) {
    dataMap.set(`${item.date}-${item.childName}-${item.subject}`, item);
  }

  // Build one chart entry per date+child, aggregating subjects as stacked fields
  const chartData: ChartEntry[] = [];

  for (const date of dates) {
    for (const childName of children) {
      const details: Record<string, { correct: number; incorrect: number }> = {};
      let hasAny = false;

      for (const subject of SUBJECTS) {
        const item = dataMap.get(`${date}-${childName}-${subject}`);
        if (item) {
          details[subject] = { correct: item.correct, incorrect: item.incorrect };
          hasAny = true;
        } else {
          details[subject] = { correct: 0, incorrect: 0 };
        }
      }

      if (hasAny) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
          day: 'numeric',
          month: 'short'
        });
        chartData.push({
          label: `${formattedDate}\n${childName}`,
          date: formattedDate,
          childName,
          math: details.math.correct,
          math_err: details.math.incorrect,
          reading: details.reading.correct,
          reading_err: details.reading.incorrect,
          english: details.english.correct,
          english_err: details.english.incorrect,
          quiz: details.quiz.correct,
          quiz_err: details.quiz.incorrect,
          details,
        });
      }
    }
  }

  // Custom tooltip showing per-subject breakdown
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: ChartEntry }>;
  }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border min-w-[160px]">
          <p className="font-semibold">{entry.date}</p>
          <p className="text-sm text-gray-600 mb-2">{entry.childName}</p>
          {SUBJECTS.map(subject => {
            const d = entry.details[subject];
            if (!d || (d.correct === 0 && d.incorrect === 0)) return null;
            const { color, emoji } = SUBJECT_COLORS[subject];
            return (
              <div key={subject} className="flex items-center justify-between text-sm gap-3">
                <span>{emoji} {t(`parent.stats.${subject}`)}</span>
                <span>
                  <span style={{ color }}>{d.correct} {t('parent.stats.correct').toLowerCase()}</span>
                  {d.incorrect > 0 && (
                    <span className="text-gray-400 ml-1">/ {d.incorrect} {t('parent.stats.incorrect').toLowerCase()}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom x-axis tick: date + child name (2 lines)
  const CustomTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const lines = payload.value.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#6b7280" fontSize={11}>
          {lines[0]}
        </text>
        <text x={0} y={0} dy={26} textAnchor="middle" fill="#374151" fontSize={12} fontWeight={500}>
          {lines[1]}
        </text>
      </g>
    );
  };

  // Calculate chart width based on number of bars
  const barWidth = 60;
  const minWidth = Math.max(400, chartData.length * barWidth);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-lg">{t('parent.stats.title')}</h3>
          {dateRange && <p className="text-sm text-gray-500">{dateRange}</p>}
        </div>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as '7d' | '30d' | 'all')}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">{t('parent.stats.last7Days')}</option>
          <option value="30d">{t('parent.stats.last30Days')}</option>
          <option value="all">{t('parent.stats.allTime')}</option>
        </select>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div style={{ minWidth: minWidth }}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 45 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={CustomTick}
                axisLine={{ stroke: '#d1d5db' }}
                interval={0}
                height={50}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {SUBJECTS.map((subject, i) => {
                const isLast = i === SUBJECTS.length - 1;
                return [
                  <Bar
                    key={subject}
                    dataKey={subject}
                    stackId="subjects"
                    fill={SUBJECT_COLORS[subject].color}
                  />,
                  <Bar
                    key={`${subject}_err`}
                    dataKey={`${subject}_err`}
                    stackId="subjects"
                    fill={SUBJECT_COLORS[subject].errorColor}
                    radius={isLast ? [4, 4, 0, 0] : undefined}
                  />,
                ];
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
        {SUBJECTS.map(subject => {
          const { color, errorColor, emoji } = SUBJECT_COLORS[subject];
          return (
            <div key={subject} className="flex items-center gap-1.5">
              <div className="flex">
                <div className="w-3 h-3 rounded-l" style={{ backgroundColor: color }} />
                <div className="w-3 h-3 rounded-r" style={{ backgroundColor: errorColor }} />
              </div>
              <span className="text-gray-600">{emoji} {t(`parent.stats.${subject}`)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
