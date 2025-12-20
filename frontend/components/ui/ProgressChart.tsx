'use client';

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

export default function ProgressChart({ data, period, onPeriodChange }: ProgressChartProps) {
  const { t } = useTranslation();

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

  // Transform data for Recharts - child names on x-axis, stacked bars for math and reading
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

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
          {/* Math bars - stacked green/red */}
          <Bar
            dataKey="mathCorrect"
            stackId="math"
            fill="#22c55e"
            name="Math Correct"
          />
          <Bar
            dataKey="mathIncorrect"
            stackId="math"
            fill="#ef4444"
            name="Math Incorrect"
            radius={[4, 4, 0, 0]}
          />
          {/* Reading bars - stacked green/red */}
          <Bar
            dataKey="readingCorrect"
            stackId="reading"
            fill="#16a34a"
            name="Reading Correct"
          />
          <Bar
            dataKey="readingIncorrect"
            stackId="reading"
            fill="#dc2626"
            name="Reading Incorrect"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Simple legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-sm">{t('parent.stats.math')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600" />
          <span className="text-sm">{t('parent.stats.reading')}</span>
        </div>
      </div>
    </div>
  );
}
