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
  Legend,
} from 'recharts';

export interface DailyStatsData {
  date: string;
  childId: string;
  childName: string;
  subject: 'math' | 'reading';
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

// Generate colors for children
const CHILD_COLORS = [
  { correct: '#22c55e', incorrect: '#ef4444' },  // green/red
  { correct: '#3b82f6', incorrect: '#f97316' },  // blue/orange
  { correct: '#8b5cf6', incorrect: '#ec4899' },  // purple/pink
  { correct: '#14b8a6', incorrect: '#f59e0b' },  // teal/amber
];

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

  // Create a map for quick lookup
  const dataMap = new Map<string, DailyStatsData>();
  for (const item of data) {
    const key = `${item.date}-${item.childName}-${item.subject}`;
    dataMap.set(key, item);
  }

  // Build chart data: one entry per bar (date + child + subject combination)
  // Each bar shows stacked correct/incorrect
  const chartData: Array<{
    label: string;
    date: string;
    childName: string;
    subject: string;
    correct: number;
    incorrect: number;
  }> = [];

  // Sort dates ascending for display
  const sortedDates = dates.sort();

  for (const date of sortedDates) {
    for (const childName of children) {
      for (const subject of ['math', 'reading'] as const) {
        const key = `${date}-${childName}-${subject}`;
        const item = dataMap.get(key);
        if (item) {
          const subjectLabel = subject === 'math' ? t('parent.stats.math') : t('parent.stats.reading');
          // Format date for display (e.g., "Dec 21")
          const dateObj = new Date(date);
          const formattedDate = dateObj.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
            day: 'numeric',
            month: 'short'
          });
          chartData.push({
            label: `${formattedDate}\n${childName}\n${subjectLabel}`,
            date: formattedDate,
            childName,
            subject: subjectLabel,
            correct: item.correct,
            incorrect: item.incorrect,
          });
        }
      }
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; payload: { date: string; childName: string; subject: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const correct = payload.find(p => p.dataKey === 'correct')?.value || 0;
      const incorrect = payload.find(p => p.dataKey === 'incorrect')?.value || 0;
      const { date, childName, subject } = payload[0]?.payload || {};

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{date}</p>
          <p className="text-sm text-gray-600">{childName} - {subject}</p>
          <p className="text-sm text-green-600">{t('parent.stats.correct')}: {correct}</p>
          <p className="text-sm text-red-600">{t('parent.stats.incorrect')}: {incorrect}</p>
        </div>
      );
    }
    return null;
  };

  // Custom x-axis tick to render three lines (date + name + subject)
  const CustomTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const lines = payload.value.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#6b7280" fontSize={10}>
          {lines[0]}
        </text>
        <text x={0} y={0} dy={24} textAnchor="middle" fill="#374151" fontSize={11} fontWeight={500}>
          {lines[1]}
        </text>
        <text x={0} y={0} dy={36} textAnchor="middle" fill="#6b7280" fontSize={10}>
          {lines[2]}
        </text>
      </g>
    );
  };

  // Calculate chart width based on number of bars
  const barWidth = 50;
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

      <div className="overflow-x-auto">
        <div style={{ minWidth: minWidth }}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barCategoryGap="15%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={CustomTick}
                axisLine={{ stroke: '#d1d5db' }}
                interval={0}
                height={70}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="correct"
                stackId="bar"
                fill="#22c55e"
                name={t('parent.stats.correct')}
              />
              <Bar
                dataKey="incorrect"
                stackId="bar"
                fill="#ef4444"
                name={t('parent.stats.incorrect')}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend explaining colors */}
      <div className="flex justify-center gap-6 mt-2 text-sm">
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
  );
}
