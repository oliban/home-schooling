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

  // Transform data for Recharts - flatten to one bar per subject per child
  // Each entry is: "ChildName\nSubject" with correct/incorrect values
  const chartData = data.flatMap(child => [
    {
      name: child.childName,
      subject: t('parent.stats.math'),
      label: `${child.childName}\n${t('parent.stats.math')}`,
      correct: child.math.correct,
      incorrect: child.math.incorrect,
    },
    {
      name: child.childName,
      subject: t('parent.stats.reading'),
      label: `${child.childName}\n${t('parent.stats.reading')}`,
      correct: child.reading.correct,
      incorrect: child.reading.incorrect,
    },
  ]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; payload: { name: string; subject: string } }>;
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const correct = payload.find(p => p.dataKey === 'correct')?.value || 0;
      const incorrect = payload.find(p => p.dataKey === 'incorrect')?.value || 0;
      const childName = payload[0]?.payload?.name || label;
      const subject = payload[0]?.payload?.subject || '';

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{childName}</p>
          <p className="text-sm text-gray-600 mb-2">{subject}</p>
          <p className="text-sm text-green-600">{t('parent.stats.correct')}: {correct}</p>
          <p className="text-sm text-red-600">{t('parent.stats.incorrect')}: {incorrect}</p>
        </div>
      );
    }
    return null;
  };

  // Custom x-axis tick to render two lines (name + subject)
  const CustomTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const lines = payload.value.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={500}>
          {lines[0]}
        </text>
        <text x={0} y={0} dy={32} textAnchor="middle" fill="#6b7280" fontSize={11}>
          {lines[1]}
        </text>
      </g>
    );
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

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          barCategoryGap="15%"
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
          <Bar
            dataKey="correct"
            stackId="bar"
            fill="#22c55e"
            name="correct"
          />
          <Bar
            dataKey="incorrect"
            stackId="bar"
            fill="#ef4444"
            name="incorrect"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

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
