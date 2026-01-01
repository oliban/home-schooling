'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/LanguageContext';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// API response types
interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
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

// Treemap data types - use index signature for Recharts compatibility
interface TreemapItem {
  name: string;
  size: number;
  coverage: number;
  code?: string;
  description?: string;
  categoryName?: string;
  isCovered?: boolean;
  correctCount?: number;
  totalCount?: number;
  totalObjectives?: number;
  coveredObjectives?: number;
  isCategory?: boolean;
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

interface CoverageChartProps {
  childId: string;
  childName?: string;
}

// Color functions based on percentage correct (10 levels)
// For objectives: darker green = higher percentage correct
const getPercentageColor = (correctCount: number, totalCount: number): string => {
  if (totalCount === 0) return '#ef4444';  // red-500 - not attempted

  const percentage = (correctCount / totalCount) * 100;

  if (percentage === 0) return '#ef4444';   // red-500 - 0%
  if (percentage < 20) return '#fca5a5';    // red-300 - 1-19%
  if (percentage < 30) return '#fcd34d';    // yellow-300 - 20-29%
  if (percentage < 40) return '#fde047';    // yellow-300 - 30-39%
  if (percentage < 50) return '#bef264';    // lime-300 - 40-49%
  if (percentage < 60) return '#86efac';    // green-300 - 50-59%
  if (percentage < 70) return '#4ade80';    // green-400 - 60-69%
  if (percentage < 80) return '#22c55e';    // green-500 - 70-79%
  if (percentage < 90) return '#16a34a';    // green-600 - 80-89%
  return '#15803d';                          // green-700 - 90-100%
};

// For categories: use gradient based on coverage percentage
const getCoverageColor = (coverage: number): string => {
  if (coverage === 0) return '#ef4444';   // red-500 - not covered
  if (coverage < 20) return '#fca5a5';    // red-300 - minimal coverage
  if (coverage < 40) return '#fde047';    // yellow-300 - low coverage
  if (coverage < 60) return '#bef264';    // lime-300 - moderate coverage
  if (coverage < 80) return '#4ade80';    // green-400 - good coverage
  if (coverage < 100) return '#22c55e';   // green-500 - high coverage
  return '#15803d';                        // green-700 - fully covered
};

const getCoverageColorLight = (coverage: number): string => {
  if (coverage === 0) return '#fee2e2';   // red-100 - not covered
  if (coverage < 20) return '#fecaca';    // red-200 - minimal coverage
  if (coverage < 40) return '#fef3c7';    // yellow-100 - low coverage
  if (coverage < 60) return '#ecfccb';    // lime-100 - moderate coverage
  if (coverage < 80) return '#dcfce7';    // green-100 - good coverage
  if (coverage < 100) return '#bbf7d0';   // green-200 - high coverage
  return '#86efac';                        // green-300 - fully covered
};

// Custom content renderer for Treemap
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
  onClick?: (name: string, position: {x: number, y: number, width: number, height: number}) => void;
}

const CustomContent = (props: CustomContentProps) => {
  const { x, y, width, height, name, coverage, depth, isCategory, code, correctCount, totalCount, totalObjectives, coveredObjectives, onClick } = props;

  // Don't render if too small
  if (width < 20 || height < 20) return null;

  // Use percentage-based color for objectives, coverage-based for categories
  const fillColor = isCategory ? getCoverageColor(coverage) : getPercentageColor(correctCount || 0, totalCount || 0);

  // Border color and width: thicker border = more attempts (deeper testing)
  const total = totalCount || 0;
  let strokeWidth: number;
  let strokeColor: string;

  if (isCategory) {
    strokeColor = '#374151';
    strokeWidth = 2;
  } else {
    // Much more visible depth differences - thicker = more tested
    // Using high contrast: thin yellow → medium orange → thick dark brown
    strokeColor = total >= 5 ? '#78350f' : total >= 3 ? '#c2410c' : '#eab308'; // yellow → orange → brown
    strokeWidth = total >= 5 ? 6 : total >= 3 ? 4 : total >= 1 ? 2 : 1;
  }

  // Calculate text to display
  const displayName = isCategory ? name : (code || name);
  const showCount = width > 40 && height > 35;
  const showName = width > 30 && height > 20;

  // Truncate long names
  const maxChars = Math.floor(width / 7);
  const truncatedName = displayName.length > maxChars
    ? displayName.substring(0, maxChars - 2) + '..'
    : displayName;

  // Inner border offset
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
        style={{ cursor: isCategory ? 'pointer' : 'default' }}
        onClick={() => isCategory && onClick && onClick(name, {x, y, width, height})}
      />
      {/* Inner border for depth (only for objectives with attempts) */}
      {!isCategory && total > 0 && width > 30 && height > 30 && (
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
  payload?: {
    name: string;
    coverage: number;
    code?: string;
    description?: string;
    categoryName?: string;
    isCovered?: boolean;
    correctCount?: number;
    totalCount?: number;
    isCategory?: boolean;
    totalObjectives?: number;
    coveredObjectives?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  const { t } = useTranslation();

  if (active && payload && payload.length > 0 && payload[0].payload) {
    const data = payload[0].payload;

    if (data.isCategory) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">{t('curriculum.coverage.coverageLabel')}</span>
              <span className={`font-medium ${
                data.coverage === 100 ? 'text-green-700' :
                data.coverage > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.coverage}%
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {t('curriculum.coverage.objectivesOf', { covered: data.coveredObjectives ?? 0, total: data.totalObjectives ?? 0 })}
            </p>
          </div>
        </div>
      );
    }

    const correct = data.correctCount || 0;
    const total = data.totalCount || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const depthLabel = total >= 5 ? t('curriculum.coverage.depthLevels.deep') : total >= 3 ? t('curriculum.coverage.depthLevels.medium') : total >= 1 ? t('curriculum.coverage.depthLevels.light') : t('curriculum.coverage.depthLevels.none');

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
              {total > 0 ? `${correct}/${total} (${percentage}%)` : t('curriculum.coverage.notAttempted')}
            </span>
          </div>
          {total > 0 && (
            <p className="text-xs text-amber-700">
              {t('curriculum.coverage.depthLabel', { level: depthLabel, count: total })}
            </p>
          )}
          {data.categoryName && (
            <p className="text-xs text-gray-500">{data.categoryName}</p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function CoverageChart({ childId, childName }: CoverageChartProps) {
  const { t } = useTranslation();
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'objectives'>('categories');
  const [selectedCategories, setSelectedCategories] = useState<Map<string, {x: number, y: number, width: number, height: number}>>(new Map());
  const [flippingCategories, setFlippingCategories] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  const fetchCoverage = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('parentToken');
      if (!token) {
        setError(t('curriculum.coverage.notAuthenticated'));
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
        throw new Error(t('curriculum.coverage.fetchFailed'));
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

  // Handle category click - toggle overlay for that category
  const handleCategoryClick = (categoryName: string, position: {x: number, y: number, width: number, height: number}) => {
    setFlippingCategories(prev => new Set(prev).add(categoryName));

    setTimeout(() => {
      setSelectedCategories(prev => {
        const newMap = new Map(prev);
        if (newMap.has(categoryName)) {
          newMap.delete(categoryName);
        } else {
          newMap.set(categoryName, position);
        }
        return newMap;
      });

      setTimeout(() => {
        setFlippingCategories(prev => {
          const newSet = new Set(prev);
          newSet.delete(categoryName);
          return newSet;
        });
      }, 50);
    }, 300);
  };

  // Handle objective click - close its parent category
  const handleObjectiveClick = (categoryName: string) => {
    setFlippingCategories(prev => new Set(prev).add(categoryName));

    setTimeout(() => {
      setSelectedCategories(prev => {
        const newMap = new Map(prev);
        newMap.delete(categoryName);
        return newMap;
      });

      setTimeout(() => {
        setFlippingCategories(prev => {
          const newSet = new Set(prev);
          newSet.delete(categoryName);
          return newSet;
        });
      }, 50);
    }, 300);
  };

  // Handle back to categories with flip animation
  const handleBackToCategories = () => {
    const allCategories = Array.from(selectedCategories.keys());
    setFlippingCategories(new Set(allCategories));

    setTimeout(() => {
      setSelectedCategories(new Map());
      setViewMode('categories');
      setTimeout(() => setFlippingCategories(new Set()), 50);
    }, 300);
  };

  // Transform API data to Treemap format
  // ALWAYS include all objectives to keep layout stable
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
        isCovered: obj.isCovered,
        correctCount: obj.correctCount,
        totalCount: obj.totalCount,
      })),
    }));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">{t('curriculum.coverage.title')}</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">{t('curriculum.coverage.title')}</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchCoverage}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {t('curriculum.coverage.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!coverageData || coverageData.categories.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">{t('curriculum.coverage.title')}</h3>
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>{t('curriculum.coverage.noData')}</p>
          <p className="text-sm mt-2">
            {t('curriculum.coverage.completeAssignments')}
          </p>
        </div>
      </div>
    );
  }

  const treemapData = getTreemapData();

  // Always show categories as base layer
  const categoryData = treemapData.map(item => ({
    name: item.name,
    size: item.totalObjectives * 100,
    coverage: item.coverage,
    totalObjectives: item.totalObjectives,
    coveredObjectives: item.coveredObjectives,
    isCategory: true,
  }));

  // Base grid: always show categories, OR all objectives when "All Objectives" clicked
  // When category is clicked, show overlay instead of changing base grid
  const showCategoriesBase = viewMode === 'categories' || selectedCategories.size > 0;
  const displayData = showCategoriesBase
    ? categoryData
    : treemapData.flatMap(category => category.children);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{t('curriculum.coverage.title')}</h3>
          {childName && (
            <p className="text-sm text-gray-600">
              {t('curriculum.coverage.gradeChild', { grade: coverageData.childGradeLevel, name: childName })}
              {selectedCategories.size > 0 && ` - ${t(selectedCategories.size === 1 ? 'curriculum.coverage.categoriesSelected' : 'curriculum.coverage.categoriesSelectedPlural', { count: selectedCategories.size })}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode('categories');
              setSelectedCategories(new Map());
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'categories'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('curriculum.coverage.categories')}
          </button>
          <button
            onClick={() => {
              setViewMode('objectives');
              setSelectedCategories(new Map());
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'objectives' && selectedCategories.size === 0
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('curriculum.coverage.allObjectives')}
          </button>
          {selectedCategories.size > 0 && (
            <button
              onClick={handleBackToCategories}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('curriculum.coverage.closeAll')}
            </button>
          )}
        </div>
      </div>

      {/* Overall coverage summary */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: getCoverageColorLight(coverageData.coveragePercentage) }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('curriculum.coverage.overallCoverage')}</p>
            <p className="text-2xl font-bold" style={{ color: getCoverageColor(coverageData.coveragePercentage) }}>
              {coverageData.coveragePercentage}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {t('curriculum.coverage.objectivesOf', { covered: coverageData.coveredObjectives, total: coverageData.totalObjectives })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('curriculum.coverage.categoriesCount', { count: coverageData.categories.length })}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${coverageData.coveragePercentage}%`,
              backgroundColor: getCoverageColor(coverageData.coveragePercentage),
            }}
          />
        </div>
      </div>

      {/* Treemap with objectives overlay */}
      <div className="relative h-80">
        {/* Categories grid - ALWAYS rendered, never changes */}
        {showCategoriesBase && isMounted && (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <Treemap
                data={categoryData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={(props: any) => (
                  <CustomContent {...props} onClick={handleCategoryClick} />
                )}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* All objectives grid - shown when "All Objectives" clicked */}
        {!showCategoriesBase && isMounted && (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <Treemap
                data={treemapData.flatMap(category => category.children)}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={(props: any) => <CustomContent {...props} />}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* Objectives overlays - shown for each selected category */}
        {Array.from(selectedCategories.entries()).map(([categoryName, position]) => {
          const categoryData = treemapData.find(c => c.name === categoryName);
          const objectives = categoryData?.children || [];
          const isFlipping = flippingCategories.has(categoryName);

          return (
            <div
              key={categoryName}
              className="absolute bg-white rounded-lg shadow-xl border-2 border-green-600 overflow-hidden"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${position.width}px`,
                height: `${position.height}px`,
                transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s ease-in-out',
              }}
            >
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                  <Treemap
                    data={objectives}
                    dataKey="size"
                    aspectRatio={position.width / position.height}
                    stroke="#fff"
                    fill="#8884d8"
                    content={(props: any) => (
                      <CustomContent
                        {...props}
                        onClick={() => handleObjectiveClick(categoryName)}
                      />
                    )}
                  >
                    <Tooltip content={<CustomTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {/* Percentage legend */}
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">{t('curriculum.coverage.accuracy')}</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-gray-600">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fcd34d' }} />
            <span className="text-gray-600">20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#bef264' }} />
            <span className="text-gray-600">40%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4ade80' }} />
            <span className="text-gray-600">60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#16a34a' }} />
            <span className="text-gray-600">80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#15803d' }} />
            <span className="text-gray-600">100%</span>
          </div>
        </div>
        {/* Depth legend */}
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">{t('curriculum.coverage.depth')}</span>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-green-400" style={{ border: '2px solid #eab308' }} />
            <span className="text-gray-600">{t('curriculum.coverage.questionsRange.light')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-green-400" style={{ border: '4px solid #c2410c' }} />
            <span className="text-gray-600">{t('curriculum.coverage.questionsRange.medium')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-green-400" style={{ border: '6px solid #78350f' }} />
            <span className="text-gray-600">{t('curriculum.coverage.questionsRange.deep')}</span>
          </div>
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-3">{t('curriculum.coverage.categoryBreakdown')}</h4>
        <div className="space-y-2">
          {coverageData.categories.map((category) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getCoverageColor(category.coveragePercentage) }}
                />
                <span className="font-medium text-gray-800">{category.categoryName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {t('curriculum.coverage.objectivesInCategory', { covered: category.coveredObjectives, total: category.totalObjectives })}
                </span>
                <span
                  className="font-semibold min-w-[48px] text-right"
                  style={{ color: getCoverageColor(category.coveragePercentage) }}
                >
                  {category.coveragePercentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
