'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { packages, children } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

interface ChildAssignment {
  childId: string;
  childName: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface PackageData {
  id: string;
  name: string;
  grade_level: number;
  category_id: string | null;
  category_name: string | null;
  problem_count: number;
  difficulty_summary: string | null;
  description: string | null;
  is_global: number;
  created_at: string;
  isOwner: boolean;
  childAssignments: ChildAssignment[];
  lgr22_objectives?: string[];
}

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
}

export default function PackageBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [packagesList, setPackagesList] = useState<PackageData[]>([]);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'private' | 'global'>('all');
  const [topicFilter, setTopicFilter] = useState<'all' | 'math' | 'reading'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [allPackages, setAllPackages] = useState<PackageData[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<PackageData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [prefilledChildId, setPrefilledChildId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const [packagesData, childrenData] = await Promise.all([
        packages.list(token),
        children.list(token),
      ]);
      setPackagesList(packagesData);
      setAllPackages(packagesData);
      setChildrenList(childrenData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.packages.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Auto-filter by child's grade when childId is in URL
  useEffect(() => {
    const childId = searchParams.get('childId');
    if (childId && childrenList.length > 0) {
      const child = childrenList.find((c) => c.id === childId);
      if (child) {
        setPrefilledChildId(childId);
        setGradeFilter(child.grade_level);
        applyFilters(child.grade_level, scopeFilter, topicFilter, categoryFilter);
      }
    }
  }, [searchParams, childrenList]);

  const applyFilters = async (
    grade: number | null,
    scope: 'all' | 'private' | 'global',
    topic: 'all' | 'math' | 'reading',
    category: string | null
  ) => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      const filters: { grade?: number; category?: string; scope?: 'private' | 'global'; type?: 'math' | 'reading' } = {};
      if (grade) filters.grade = grade;
      if (category) filters.category = category;
      if (scope !== 'all') filters.scope = scope;
      if (topic !== 'all') filters.type = topic;

      const data = await packages.list(token, Object.keys(filters).length > 0 ? filters : undefined);
      setPackagesList(data);
    } catch (err) {
      console.error('Failed to filter packages:', err);
    }
  };

  const handleGradeFilterChange = (grade: number | null) => {
    setGradeFilter(grade);
    applyFilters(grade, scopeFilter, topicFilter, categoryFilter);
  };

  const handleScopeFilterChange = (scope: 'all' | 'private' | 'global') => {
    setScopeFilter(scope);
    applyFilters(gradeFilter, scope, topicFilter, categoryFilter);
  };

  const handleTopicFilterChange = (topic: 'all' | 'math' | 'reading') => {
    setTopicFilter(topic);
    applyFilters(gradeFilter, scopeFilter, topic, categoryFilter);
  };

  const handleCategoryFilterChange = (category: string | null) => {
    setCategoryFilter(category);
    applyFilters(gradeFilter, scopeFilter, topicFilter, category);
  };

  const parseDifficulty = (summary: string | null): Record<string, number> => {
    if (!summary) return {};
    try {
      return JSON.parse(summary);
    } catch {
      return {};
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setDeleting(true);
    try {
      await packages.delete(token, deleteConfirm.id);
      setPackagesList(prev => prev.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.packages.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  // Get unique grades from children
  const childGrades = [...new Set(childrenList.map(c => c.grade_level))].sort((a, b) => a - b);

  // Get unique categories from all packages
  const uniqueCategories = [...new Map(
    allPackages
      .filter(p => p.category_id && p.category_name)
      .map(p => [p.category_id, { id: p.category_id!, name: p.category_name! }])
  ).values()];

  // Group packages by grade
  const packagesByGrade = packagesList.reduce((acc, pkg) => {
    const grade = pkg.grade_level;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(pkg);
    return acc;
  }, {} as Record<number, PackageData[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent" className="text-gray-500 hover:text-gray-700">
              &larr; {t('parent.packages.back')}
            </Link>
            <h1 className="text-xl font-bold">{t('parent.packages.title')}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Grade Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500 w-20">{t('parent.packages.gradeLabel')}:</span>
            <button
              onClick={() => handleGradeFilterChange(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                gradeFilter === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.all')}
            </button>
            {childGrades.map((grade) => (
              <button
                key={grade}
                onClick={() => handleGradeFilterChange(grade)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  gradeFilter === grade
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('parent.packages.gradeAbbr', { grade })}
              </button>
            ))}
          </div>

          {/* Topic Filter (Math/Svenska) */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500 w-20">{t('parent.packages.topicLabel')}:</span>
            <button
              onClick={() => handleTopicFilterChange('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                topicFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.all')}
            </button>
            <button
              onClick={() => handleTopicFilterChange('math')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                topicFilter === 'math'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.math')}
            </button>
            <button
              onClick={() => handleTopicFilterChange('reading')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                topicFilter === 'reading'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.reading')}
            </button>
          </div>

          {/* Category Filter (Algebra, Geometri etc) */}
          {uniqueCategories.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-gray-500 w-20">{t('parent.packages.categoryLabel')}:</span>
              <button
                onClick={() => handleCategoryFilterChange(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('parent.packages.all')}
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilterChange(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Scope Filter (Private/Global) */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500 w-20">{t('parent.packages.visibilityLabel')}:</span>
            <button
              onClick={() => handleScopeFilterChange('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                scopeFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.all')}
            </button>
            <button
              onClick={() => handleScopeFilterChange('private')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                scopeFilter === 'private'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.private')}
            </button>
            <button
              onClick={() => handleScopeFilterChange('global')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                scopeFilter === 'global'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('parent.packages.global')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {packagesList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-600 mb-4">{t('parent.packages.noPackages')}</p>
            <Link
              href="/parent"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
            >
              {t('parent.packages.importPackage')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(packagesByGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, pkgs]) => (
                <div key={grade}>
                  <h2 className="text-lg font-bold mb-4 text-gray-700">
                    {t('parent.packages.gradeHeader', { grade })}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({t('parent.packages.packageCount', { count: pkgs.length })})
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pkgs.map((pkg) => {
                      const difficulty = parseDifficulty(pkg.difficulty_summary);
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => {
                            const url = prefilledChildId
                              ? `/parent/packages/${pkg.id}?childId=${prefilledChildId}`
                              : `/parent/packages/${pkg.id}`;
                            router.push(url);
                          }}
                          className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-lg leading-tight">{pkg.name}</h3>
                            <div className="flex items-center gap-2">
                              {pkg.isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(pkg);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title={t('parent.packages.deleteTitle')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                              {pkg.is_global ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  {t('parent.packages.badges.global')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  {t('parent.packages.badges.private')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-sm text-gray-500 mb-3">
                            {t('parent.packages.problemCount', { count: pkg.problem_count })}
                            {pkg.category_name && ` | ${pkg.category_name}`}
                          </div>

                          {pkg.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}

                          <div className="flex gap-2 text-xs">
                            {difficulty.easy && (
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded">
                                {t('parent.packages.difficultyCount', { count: difficulty.easy, level: t('parent.packages.difficulty.easy') })}
                              </span>
                            )}
                            {difficulty.medium && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded">
                                {t('parent.packages.difficultyCount', { count: difficulty.medium, level: t('parent.packages.difficulty.medium') })}
                              </span>
                            )}
                            {difficulty.hard && (
                              <span className="px-2 py-1 bg-red-50 text-red-600 rounded">
                                {t('parent.packages.difficultyCount', { count: difficulty.hard, level: t('parent.packages.difficulty.hard') })}
                              </span>
                            )}
                          </div>

                          {pkg.childAssignments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-gray-500 mb-1">{t('parent.packages.assignedTo')}</div>
                              <div className="flex flex-wrap gap-1">
                                {pkg.childAssignments.map((ca, index) => (
                                  <span
                                    key={`${ca.childId}-${index}`}
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      ca.status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : ca.status === 'in_progress'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {ca.childName}: {ca.status === 'completed' ? t('parent.packages.status.done') : ca.status === 'in_progress' ? t('parent.packages.status.inProgress') : t('parent.packages.status.pending')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {pkg.lgr22_objectives && pkg.lgr22_objectives.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium text-gray-500 mb-1">LGR22:</div>
                              <div className="flex flex-wrap gap-1">
                                {pkg.lgr22_objectives.slice(0, 3).map((code, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                                  >
                                    {code}
                                  </span>
                                ))}
                                {pkg.lgr22_objectives.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                    +{pkg.lgr22_objectives.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {pkg.isOwner && (
                            <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                              {t('parent.packages.createdByYou')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">{t('parent.packages.delete.title')}</h3>
            <p className="text-gray-600 mb-4">
              {t('parent.packages.delete.confirm', { name: deleteConfirm.name })}
            </p>
            {deleteConfirm.childAssignments.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm font-medium">
                  {t('parent.packages.delete.willRemove', { count: deleteConfirm.childAssignments.length })}
                </p>
                <ul className="mt-2 text-sm text-yellow-700">
                  {deleteConfirm.childAssignments.map((ca, index) => (
                    <li key={`${ca.childId}-${index}`}>
                      {ca.childName} ({ca.status === 'completed' ? t('parent.packages.status.done') : ca.status === 'in_progress' ? t('parent.packages.status.inProgress') : t('parent.packages.status.pending')})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('parent.packages.delete.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? t('parent.packages.delete.deleting') : t('parent.packages.delete.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
