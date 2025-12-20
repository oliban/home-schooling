'use client';

import { useState, useEffect } from 'react';
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

export interface ChildStatsData {
  childId: string;
  childName: string;
  math: { correct: number; incorrect: number };
  reading: { correct: number; incorrect: number };
}

interface ProgressChartProps {
  data: ChildStatsData[];
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

export default function ProgressChart({ data, period, onPeriodChange }: ProgressChartProps) {
  const { t, locale } = useTranslation();
  const [dateRange, setDateRange] = useState('');

  // Compute date range only on client to avoid hydration mismatch
  useEffect(() => {
    setDateRange(getDateRangeString(period, locale));
  }, [period, locale]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('parent.stats.title')}</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          {t('parent.stats.noData')}
        </div>
      </div>
    );
  }

  const hasData = data.some(d =>
    d.math.correct > 0 || d.math.incorrect > 0 ||
    d.reading.correct > 0 || d.reading.incorrect > 0
  );

  if (!hasData) {
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

  // Transform data for Recharts - two bars per child (Math and Reading side by side)
  const chartData = data.map(child => ({
    name: child.childName,
    mathCorrect: child.math.correct,
    mathIncorrect: child.math.incorrect,
    readingCorrect: child.reading.correct,
    readingIncorrect: child.reading.incorrect,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const mathCorrect = payload.find(p => p.dataKey === 'mathCorrect')?.value || 0;
      const mathIncorrect = payload.find(p => p.dataKey === 'mathIncorrect')?.value || 0;
      const readingCorrect = payload.find(p => p.dataKey === 'readingCorrect')?.value || 0;
      const readingIncorrect = payload.find(p => p.dataKey === 'readingIncorrect')?.value || 0;

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold mb-2">{label}</p>
          <div className="mb-2">
            <p className="text-sm font-medium">{t('parent.stats.math')}</p>
            <p className="text-xs text-green-600">{t('parent.stats.correct')}: {mathCorrect}</p>
            <p className="text-xs text-red-600">{t('parent.stats.incorrect')}: {mathIncorrect}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{t('parent.stats.reading')}</p>
            <p className="text-xs text-green-600">{t('parent.stats.correct')}: {readingCorrect}</p>
            <p className="text-xs text-red-600">{t('parent.stats.incorrect')}: {readingIncorrect}</p>
          </div>
        </div>
      );
    }
    return null;
  };

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

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={0}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#374151', fontSize: 14, fontWeight: 500 }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Math bar - stacked green/red */}
          <Bar
            dataKey="mathCorrect"
            stackId="math"
            fill="#22c55e"
            name="mathCorrect"
          />
          <Bar
            dataKey="mathIncorrect"
            stackId="math"
            fill="#ef4444"
            name="mathIncorrect"
            radius={[4, 4, 0, 0]}
          />
          {/* Reading bar - stacked green/red (separate bar, not stacked with math) */}
          <Bar
            dataKey="readingCorrect"
            stackId="reading"
            fill="#22c55e"
            name="readingCorrect"
          />
          <Bar
            dataKey="readingIncorrect"
            stackId="reading"
            fill="#ef4444"
            name="readingIncorrect"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend explaining bars and colors */}
      <div className="flex justify-center gap-8 mt-4 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{t('parent.stats.math')}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{t('parent.stats.reading')}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">{t('parent.stats.correct')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600">{t('parent.stats.incorrect')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
