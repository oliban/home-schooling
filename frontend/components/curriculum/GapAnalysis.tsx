'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/LanguageContext';

// API response types
interface CurriculumGap {
  id: number;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
}

interface PackageRecommendation {
  packageId: string;
  packageName: string;
  gradeLevel: number;
  categoryId: string | null;
  categoryName: string | null;
  problemCount: number;
  description: string | null;
  objectivesCovered: number;
}

interface GapRecommendation {
  objective: CurriculumGap;
  packages: PackageRecommendation[];
}

interface RecommendationsData {
  childId: string;
  childGradeLevel: number;
  recommendations: GapRecommendation[];
  totalGaps: number;
  gapsWithPackages: number;
  topPackages: PackageRecommendation[];
  message?: string;
}

interface GapAnalysisProps {
  childId: string;
  childName?: string;
}

export default function GapAnalysis({ childId, childName }: GapAnalysisProps) {
  const { t } = useTranslation();
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchGapsAndRecommendations = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('parentToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001/api';

      // Fetch recommendations (includes gaps data)
      const response = await fetch(`${API_URL}/curriculum/recommendations/${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gap analysis data');
      }

      const data: RecommendationsData = await response.json();
      setRecommendationsData(data);

      // Auto-expand categories that have gaps with packages
      const categoriesWithPackages = new Set<string>();
      data.recommendations.forEach(rec => {
        if (rec.packages.length > 0) {
          categoriesWithPackages.add(rec.objective.categoryName);
        }
      });
      setExpandedCategories(categoriesWithPackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchGapsAndRecommendations();
  }, [fetchGapsAndRecommendations]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // Group gaps by category for better organization
  const groupedGaps = recommendationsData?.recommendations.reduce((acc, rec) => {
    const category = rec.objective.categoryName;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rec);
    return acc;
  }, {} as Record<string, GapRecommendation[]>) || {};

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Learning Gaps</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-3 text-gray-600">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Learning Gaps</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchGapsAndRecommendations}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render success state with no gaps
  if (!recommendationsData || recommendationsData.totalGaps === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Learning Gaps</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-green-600 font-semibold text-lg">All objectives covered!</p>
          <p className="text-gray-600 mt-2">
            {childName ? `${childName} has` : 'Your child has'} completed exercises covering all curriculum objectives for their grade level.
          </p>
        </div>
      </div>
    );
  }

  const categoryNames = Object.keys(groupedGaps).sort((a, b) => a.localeCompare(b, 'sv'));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Learning Gaps</h3>
          {childName && (
            <p className="text-sm text-gray-600">
              Uncovered curriculum objectives for {childName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {recommendationsData.totalGaps} gaps
          </span>
          {recommendationsData.gapsWithPackages > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {recommendationsData.gapsWithPackages} with packages
            </span>
          )}
        </div>
      </div>

      {/* Top Recommended Packages */}
      {recommendationsData.topPackages && recommendationsData.topPackages.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <span>⭐</span>
            Top Recommended Packages
          </h4>
          <p className="text-sm text-blue-600 mb-3">
            These packages cover the most curriculum gaps:
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendationsData.topPackages.map((pkg) => (
              <Link
                key={pkg.packageId}
                href={`/parent/packages/${pkg.packageId}`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <span className="text-lg">📦</span>
                <div>
                  <p className="font-medium text-gray-800">{pkg.packageName}</p>
                  <p className="text-xs text-gray-500">
                    Covers {pkg.objectivesCovered} objective{pkg.objectivesCovered !== 1 ? 's' : ''} • {pkg.problemCount} problems
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Gaps by Category */}
      <div className="space-y-3">
        {categoryNames.map((categoryName) => {
          const gaps = groupedGaps[categoryName];
          const isExpanded = expandedCategories.has(categoryName);
          const gapsWithPackages = gaps.filter(g => g.packages.length > 0).length;

          return (
            <div key={categoryName} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryName)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="font-semibold text-gray-800">{categoryName}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                  </span>
                  {gapsWithPackages > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {gapsWithPackages} with packages
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-xl">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>

              {/* Category Gaps */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {gaps.map((gap) => (
                    <div
                      key={gap.objective.id}
                      className="border-l-4 border-red-400 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            <span className="text-red-600 font-mono text-sm mr-2">
                              {gap.objective.code}
                            </span>
                            {gap.objective.description}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium whitespace-nowrap ml-2">
                          Not Covered
                        </span>
                      </div>

                      {/* Recommended Packages for this gap */}
                      {gap.packages.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">
                            Recommended packages:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {gap.packages.slice(0, 3).map((pkg) => (
                              <Link
                                key={pkg.packageId}
                                href={`/parent/packages/${pkg.packageId}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors border border-green-200"
                              >
                                <span>📦</span>
                                <span className="font-medium">{pkg.packageName}</span>
                                <span className="text-green-600 text-xs">
                                  ({pkg.problemCount} problems)
                                </span>
                              </Link>
                            ))}
                            {gap.packages.length > 3 && (
                              <span className="text-sm text-gray-500 self-center">
                                +{gap.packages.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500 italic">
                            No packages available for this objective yet.
                          </p>
                          <Link
                            href="/parent/assignments/create"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
                          >
                            <span>📝</span>
                            <span>Create a custom assignment</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 rounded-xl bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Total gaps: <span className="font-semibold text-red-600">{recommendationsData.totalGaps}</span>
            </span>
            <span className="text-gray-600">
              With packages: <span className="font-semibold text-green-600">{recommendationsData.gapsWithPackages}</span>
            </span>
          </div>
          <Link
            href="/parent/packages"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <span>📦</span>
            Browse All Packages
          </Link>
        </div>
      </div>
    </div>
  );
}
