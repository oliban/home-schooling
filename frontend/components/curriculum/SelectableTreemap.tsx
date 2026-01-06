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
  extendedDescription: string | null;
  requiresWorkShown: boolean;
  exampleProblems: string[] | null;
  keyConcepts: string[] | null;
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

// Color functions based on percentage correct
// For objectives: ≤50% = red, then gradually to green at 100%
const getPercentageColor = (correctCount: number, totalCount: number): string => {
  if (totalCount === 0) return '#ef4444';  // red-500 - not attempted

  const percentage = (correctCount / totalCount) * 100;

  if (percentage <= 50) return '#ef4444';   // red-500 - poor (≤50%)
  if (percentage < 60) return '#f97316';    // orange-500 (50-60%)
  if (percentage < 70) return '#fb923c';    // orange-400 (60-70%)
  if (percentage < 80) return '#eab308';    // yellow-500 (70-80%)
  if (percentage < 90) return '#84cc16';    // lime-500 (80-90%)
  if (percentage < 95) return '#22c55e';    // green-500 (90-95%)
  return '#15803d';                          // green-700 - perfect (95-100%)
};

// For categories: use gradient based on coverage percentage
// Scale: ≤50% = red, then gradually to green at 100%
const getCoverageColor = (coverage: number): string => {
  if (coverage <= 50) return '#ef4444';    // red-500 - poor (≤50%)
  if (coverage < 60) return '#f97316';     // orange-500 (50-60%)
  if (coverage < 70) return '#fb923c';     // orange-400 (60-70%)
  if (coverage < 80) return '#eab308';     // yellow-500 (70-80%)
  if (coverage < 90) return '#84cc16';     // lime-500 (80-90%)
  if (coverage < 95) return '#22c55e';     // green-500 (90-95%)
  return '#15803d';                         // green-700 - perfect (95-100%)
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
  // Depth scale: red (shallow) → dark green (well-tested at 50+)
  let strokeWidth: number;
  let strokeColor: string;

  if (isCategory) {
    strokeColor = '#374151';
    strokeWidth = 2;
  } else if (isSelected) {
    strokeColor = selectionStroke!;
    strokeWidth = selectionStrokeWidth!;
  } else {
    if (total >= 50) {
      strokeColor = '#15803d'; // dark green - well tested
      strokeWidth = 7;
    } else if (total >= 25) {
      strokeColor = '#22c55e'; // green
      strokeWidth = 6;
    } else if (total >= 15) {
      strokeColor = '#84cc16'; // lime - green starts here
      strokeWidth = 5;
    } else if (total >= 10) {
      strokeColor = '#eab308'; // yellow
      strokeWidth = 4;
    } else if (total >= 5) {
      strokeColor = '#f97316'; // orange
      strokeWidth = 3;
    } else {
      strokeColor = '#ef4444'; // red - shallow
      strokeWidth = 2;
    }
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
      {/* Main fill rect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke="#ffffff"
        strokeWidth={1}
        rx={depth === 1 ? 4 : 2}
        style={{ cursor: isClickable ? 'pointer' : 'default' }}
        onClick={() => isClickable && onClick && onClick(objectiveId)}
      />
      {/* Inner border for depth (only for objectives with attempts) */}
      {!isCategory && !isSelected && total > 0 && width > 30 && height > 30 && (
        <rect
          x={x + innerOffset / 2}
          y={y + innerOffset / 2}
          width={width - innerOffset}
          height={height - innerOffset}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx={depth === 1 ? 3 : 1}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Selection border (when selected) */}
      {isSelected && width > 30 && height > 30 && (
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          fill="none"
          stroke={selectionStroke}
          strokeWidth={selectionStrokeWidth}
          rx={depth === 1 ? 3 : 1}
          style={{ pointerEvents: 'none' }}
        />
      )}

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

  // Split into Math and Reading
  const mathData = treemapData
    .filter(category => category.name !== 'Lasforstaelse')
    .flatMap(category => category.children);
  const readingData = treemapData
    .filter(category => category.name === 'Lasforstaelse')
    .flatMap(category => category.children);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Click objectives to select them
      </h4>

      {/* Math objectives */}
      {mathData.length > 0 && (
        <div className="mb-4">
          <h5 className="text-xs font-semibold text-blue-800 mb-2">📐 Matematik</h5>
          <div className="relative h-48 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                <Treemap
                  data={mathData}
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
        </div>
      )}

      {/* Reading objectives */}
      {readingData.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-purple-800 mb-2">📖 Läsförståelse</h5>
          <div className="relative h-32 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minHeight={128}>
                <Treemap
                  data={readingData}
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
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {/* Percentage legend */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Accuracy:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-gray-600">≤50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
            <span className="text-gray-600">60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fb923c' }} />
            <span className="text-gray-600">70%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }} />
            <span className="text-gray-600">80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#84cc16' }} />
            <span className="text-gray-600">90%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-gray-600">95%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#15803d' }} />
            <span className="text-gray-600">100%</span>
          </div>
        </div>
        {/* Depth legend */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Depth:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '2px solid #ef4444' }} />
            <span className="text-gray-600">&lt;5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '3px solid #f97316' }} />
            <span className="text-gray-600">5-10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '4px solid #eab308' }} />
            <span className="text-gray-600">10-15</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '5px solid #84cc16' }} />
            <span className="text-gray-600">15-25</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '6px solid #22c55e' }} />
            <span className="text-gray-600">25-50</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ border: '7px solid #15803d' }} />
            <span className="text-gray-600">50+</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        {selectedObjectives.size} objective{selectedObjectives.size !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
