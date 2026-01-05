'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ObjectiveData } from '@/types/curriculum';

// API response types
interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  score: number;
}

interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
  objectives: ObjectiveCoverage[];
}

interface CoverageData {
  childId: string;
  childGradeLevel: number;
  categories: CategoryCoverage[];
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
}

// Treemap data types
interface TreemapItem {
  name: string;
  size: number;
  coverage: number;
  code?: string;
  description?: string;
  categoryName?: string;
  categoryId?: string;
  isCovered?: boolean;
  correctCount?: number;
  totalCount?: number;
  totalObjectives?: number;
  coveredObjectives?: number;
  isCategory?: boolean;
  objectiveId?: number;
  [key: string]: string | number | boolean | undefined;
}

interface TreemapCategoryItem {
  name: string;
  children: TreemapItem[];
  coverage: number;
  totalObjectives: number;
  coveredObjectives: number;
  isSelected?: boolean;
  size?: number;
  [key: string]: string | number | boolean | TreemapItem[] | undefined;
}

interface SelectableTreemapProps {
  childId: string;
  childGradeLevel: number;
  selectedObjectives: Set<number>;
  onToggleObjective: (objectiveId: number, objective: ObjectiveData) => void;
}

// Color functions
const getPercentageColor = (correctCount: number, totalCount: number): string => {
  if (totalCount === 0) return '#ef4444';
  const percentage = (correctCount / totalCount) * 100;
  if (percentage === 0) return '#ef4444';
  if (percentage < 20) return '#fca5a5';
  if (percentage < 30) return '#fcd34d';
  if (percentage < 40) return '#fde047';
  if (percentage < 50) return '#bef264';
  if (percentage < 60) return '#86efac';
  if (percentage < 70) return '#4ade80';
  if (percentage < 80) return '#22c55e';
  if (percentage < 90) return '#16a34a';
  return '#15803d';
};

const getCoverageColor = (coverage: number): string => {
  if (coverage === 0) return '#ef4444';
  if (coverage < 20) return '#fca5a5';
  if (coverage < 40) return '#fde047';
  if (coverage < 60) return '#bef264';
  if (coverage < 80) return '#4ade80';
  if (coverage < 100) return '#22c55e';
  return '#15803d';
};

// Custom content renderer with selection support
interface CustomContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  coverage: number;
  depth: number;
  isCategory?: boolean;
  code?: string;
  correctCount?: number;
  totalCount?: number;
  totalObjectives?: number;
  coveredObjectives?: number;
  objectiveId?: number;
  isSelected?: boolean;
  onClick?: (objectiveId?: number) => void;
}

const CustomContent = (props: CustomContentProps) => {
  const { x, y, width, height, name, coverage, depth, isCategory, code, correctCount, totalCount, totalObjectives, coveredObjectives, objectiveId, isSelected, onClick } = props;

  if (width < 20 || height < 20) return null;

  const fillColor = isCategory ? getCoverageColor(coverage) : getPercentageColor(correctCount || 0, totalCount || 0);

  // For objectives: make them clickable and show selection state
  const isClickable = !isCategory && objectiveId !== undefined;
  const total = totalCount || 0;

  // Selection styling
  const selectionStroke = isSelected ? '#15803d' : undefined; // green-700
  const selectionStrokeWidth = isSelected ? 4 : undefined;

  // Border for depth (only when not selected)
  let strokeWidth: number;
  let strokeColor: string;

  if (isCategory) {
    strokeColor = '#374151';
    strokeWidth = 2;
  } else if (isSelected) {
    strokeColor = selectionStroke!;
    strokeWidth = selectionStrokeWidth!;
  } else {
    strokeColor = total >= 5 ? '#78350f' : total >= 3 ? '#c2410c' : '#eab308';
    strokeWidth = total >= 5 ? 6 : total >= 3 ? 4 : total >= 1 ? 2 : 1;
  }

  const displayName = isCategory ? name : (code || name);
  const showCount = width > 40 && height > 35;
  const showName = width > 30 && height > 20;

  const maxChars = Math.floor(width / 7);
  const truncatedName = displayName.length > maxChars
    ? displayName.substring(0, maxChars - 2) + '..'
    : displayName;

  const innerOffset = strokeWidth;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx={depth === 1 ? 4 : 2}
        style={{ cursor: isClickable ? 'pointer' : 'default' }}
        onClick={() => isClickable && onClick && onClick(objectiveId)}
      />

      {/* Checkmark icon for selected objectives */}
      {isSelected && width > 30 && height > 30 && (
        <g>
          <circle
            cx={x + width - 12}
            cy={y + 12}
            r={8}
            fill="#15803d"
            stroke="#ffffff"
            strokeWidth={2}
          />
          <path
            d={`M ${x + width - 15} ${y + 12} L ${x + width - 12} ${y + 15} L ${x + width - 8} ${y + 9}`}
            stroke="#ffffff"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showCount ? 6 : 0)}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={depth === 1 ? 12 : 10}
          fontWeight={depth === 1 ? 600 : 500}
          style={{ pointerEvents: 'none' }}
        >
          {truncatedName}
        </text>
      )}
      {showCount && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={10}
          style={{ pointerEvents: 'none' }}
        >
          {isCategory
            ? `${coveredObjectives}/${totalObjectives}`
            : (totalCount || 0) > 0 ? `${correctCount || 0}/${totalCount}` : '0'}
        </text>
      )}
    </g>
  );
};

// Custom tooltip
interface TooltipPayload {
  payload?: TreemapItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0 && payload[0].payload) {
    const data = payload[0].payload;

    if (data.isCategory) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">Coverage: </span>
              <span className={`font-medium ${
                data.coverage === 100 ? 'text-green-700' :
                data.coverage > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.coverage}%
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {data.coveredObjectives} of {data.totalObjectives} objectives
            </p>
          </div>
        </div>
      );
    }

    const correct = data.correctCount || 0;
    const total = data.totalCount || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
        <p className="font-semibold text-gray-800">{data.code}</p>
        <p className="text-sm text-gray-600 mt-1">{data.description}</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: correct > 0 ? '#dcfce7' : '#fee2e2',
                color: correct > 0 ? '#166534' : '#991b1b'
              }}
            >
              {total > 0 ? `${correct}/${total} (${percentage}%)` : 'Not Attempted'}
            </span>
          </div>
          {data.categoryName && (
            <p className="text-xs text-gray-500">{data.categoryName}</p>
          )}
          <p className="text-xs text-blue-600 mt-2">Click to select for custom assignment</p>
        </div>
      </div>
    );
  }
  return null;
};

export default function SelectableTreemap({ childId, childGradeLevel, selectedObjectives, onToggleObjective }: SelectableTreemapProps) {
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'objectives'>('objectives');
  const [isMounted, setIsMounted] = useState(false);

  const fetchCoverage = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('parentToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL!;
      const response = await fetch(`${API_URL}/curriculum/coverage/${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coverage data');
      }

      const data: CoverageData = await response.json();
      setCoverageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle objective click
  const handleObjectiveClick = (objectiveId?: number) => {
    if (!objectiveId || !coverageData) return;

    // Find the objective in the coverage data
    for (const category of coverageData.categories) {
      const objective = category.objectives.find(obj => obj.id === objectiveId);
      if (objective) {
        // Determine subject from objective code (SV-* = reading, MA-* = math)
        const subject: 'math' | 'reading' = objective.code.startsWith('SV-') ? 'reading' : 'math';

        const objectiveData: ObjectiveData = {
          id: objective.id,
          code: objective.code,
          description: objective.description,
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          subject,
        };

        onToggleObjective(objectiveId, objectiveData);
        return;
      }
    }
  };

  // Transform API data to Treemap format with selection state
  const getTreemapData = (): TreemapCategoryItem[] => {
    if (!coverageData) return [];

    return coverageData.categories.map(category => ({
      name: category.categoryName,
      coverage: category.coveragePercentage,
      totalObjectives: category.totalObjectives,
      coveredObjectives: category.coveredObjectives,
      children: category.objectives.map(obj => ({
        name: obj.code,
        size: 100,
        coverage: obj.isCovered ? 100 : 0,
        code: obj.code,
        description: obj.description,
        categoryName: category.categoryName,
        categoryId: category.categoryId,
        isCovered: obj.isCovered,
        correctCount: obj.correctCount,
        totalCount: obj.totalCount,
        objectiveId: obj.id,
        isSelected: selectedObjectives.has(obj.id),
      })),
    }));
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading objectives...</span>
        </div>
      </div>
    );
  }

  if (error || !coverageData) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  const treemapData = getTreemapData();
  const displayData = treemapData.flatMap(category => category.children);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Click objectives to select them
      </h4>
      <div className="relative h-64 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%" minHeight={256}>
            <Treemap
              data={displayData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              content={(props: any) => (
                <CustomContent {...props} onClick={handleObjectiveClick} />
              )}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {selectedObjectives.size} objective{selectedObjectives.size !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
