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
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('available');
  const [allPackages, setAllPackages] = useState<PackageData[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<PackageData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

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

  // Auto-select child and filter by child's grade when childId is in URL
  useEffect(() => {
    const childId = searchParams.get('childId');
    if (childId && childrenList.length > 0) {
      const child = childrenList.find((c) => c.id === childId);
      if (child) {
        setSelectedChildId(childId);
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

  // Filter packages by availability (if a child is selected and filter is 'available')
  const filteredPackages = packagesList.filter((pkg) => {
    if (availabilityFilter === 'all' || !selectedChildId) {
      return true;
    }
    // Hide packages that the selected child has already been assigned
    const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
    return !hasAssignment;
  });

  // Group packages by grade
  const packagesByGrade = filteredPackages.reduce((acc, pkg) => {
    const grade = pkg.grade_level;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(pkg);
    return acc;
  }, {} as Record<number, PackageData[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium tracking-tight">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Refined Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/parent"
                className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('parent.packages.back')}
              </Link>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{t('parent.packages.title')}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Child Selector - Prominent */}
        {childrenList.length > 0 && (
          <div className="mb-8">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              {t('parent.packages.childLabel')}
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedChildId(null);
                  setGradeFilter(null);
                  applyFilters(null, scopeFilter, topicFilter, categoryFilter);
                }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium tracking-tight transition-all border ${
                  selectedChildId === null
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('parent.packages.all')}
              </button>
              {childrenList.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    setSelectedChildId(child.id);
                    setGradeFilter(child.grade_level);
                    applyFilters(child.grade_level, scopeFilter, topicFilter, categoryFilter);
                  }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium tracking-tight transition-all border ${
                    selectedChildId === child.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {child.name}
                  <span className="ml-1.5 text-xs opacity-60">Åk {child.grade_level}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Refined Filter System */}
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="grid gap-6">
            {/* Availability Filter (only show when child is selected) */}
            {selectedChildId && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {t('parent.packages.availabilityLabel')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAvailabilityFilter('available')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                      availabilityFilter === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.availableOnly')}
                  </button>
                  <button
                    onClick={() => setAvailabilityFilter('all')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                      availabilityFilter === 'all'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.allPackages')}
                  </button>
                </div>
              </div>
            )}

            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t('parent.packages.gradeLabel')}
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleGradeFilterChange(null)}
                  className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                    gradeFilter === null
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                  }`}
                >
                  {t('parent.packages.all')}
                </button>
                {childGrades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeFilterChange(grade)}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                      gradeFilter === grade
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.gradeAbbr', { grade })}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic & Visibility in Same Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Topic Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {t('parent.packages.topicLabel')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTopicFilterChange('all')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      topicFilter === 'all'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.all')}
                  </button>
                  <button
                    onClick={() => handleTopicFilterChange('math')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      topicFilter === 'math'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.math')}
                  </button>
                  <button
                    onClick={() => handleTopicFilterChange('reading')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      topicFilter === 'reading'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.reading')}
                  </button>
                </div>
              </div>

              {/* Visibility Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {t('parent.packages.visibilityLabel')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScopeFilterChange('all')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      scopeFilter === 'all'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.all')}
                  </button>
                  <button
                    onClick={() => handleScopeFilterChange('private')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      scopeFilter === 'private'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.private')}
                  </button>
                  <button
                    onClick={() => handleScopeFilterChange('global')}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all flex-1 ${
                      scopeFilter === 'global'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.global')}
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter (if categories exist) */}
            {uniqueCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {t('parent.packages.categoryLabel')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleCategoryFilterChange(null)}
                    className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                      categoryFilter === null
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {t('parent.packages.all')}
                  </button>
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryFilterChange(cat.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium tracking-tight transition-all ${
                        categoryFilter === cat.id
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {packagesList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4 opacity-40">📦</div>
            <p className="text-slate-600 mb-6 font-medium tracking-tight">{t('parent.packages.noPackages')}</p>
            <Link
              href="/parent"
              className="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors tracking-tight"
            >
              {t('parent.packages.importPackage')}
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(packagesByGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, pkgs]) => (
                <div key={grade}>
                  <div className="flex items-baseline gap-3 mb-5">
                    <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                      {t('parent.packages.gradeHeader', { grade })}
                    </h2>
                    <span className="text-sm text-slate-500">
                      {t('parent.packages.packageCount', { count: pkgs.length })}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pkgs.map((pkg) => {
                      const difficulty = parseDifficulty(pkg.difficulty_summary);
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => {
                            const url = selectedChildId
                              ? `/parent/packages/${pkg.id}?childId=${selectedChildId}`
                              : `/parent/packages/${pkg.id}`;
                            router.push(url);
                          }}
                          className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <h3 className="font-semibold text-slate-900 leading-tight tracking-tight flex-1 group-hover:text-indigo-700 transition-colors">
                              {pkg.name}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Only show delete button if user is the owner */}
                              {pkg.isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(pkg);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title={t('parent.packages.deleteTitle')}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                              {pkg.is_global ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-200">
                                  {t('parent.packages.badges.global')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                                  {t('parent.packages.badges.private')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            <span className="font-medium">{t('parent.packages.problemCount', { count: pkg.problem_count })}</span>
                            {pkg.category_name && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{pkg.category_name}</span>
                              </>
                            )}
                          </div>

                          {/* Description */}
                          {pkg.description && (
                            <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                              {pkg.description}
                            </p>
                          )}

                          {/* Difficulty Pills */}
                          {(difficulty.easy || difficulty.medium || difficulty.hard) && (
                            <div className="flex gap-2 mb-4">
                              {difficulty.easy && (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-200">
                                  {difficulty.easy} {t('parent.packages.difficulty.easy')}
                                </span>
                              )}
                              {difficulty.medium && (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium border border-amber-200">
                                  {difficulty.medium} {t('parent.packages.difficulty.medium')}
                                </span>
                              )}
                              {difficulty.hard && (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md text-xs font-medium border border-rose-200">
                                  {difficulty.hard} {t('parent.packages.difficulty.hard')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Assignments */}
                          {pkg.childAssignments.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                {t('parent.packages.assignedTo')}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pkg.childAssignments.map((ca, index) => (
                                  <span
                                    key={`${ca.childId}-${index}`}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                                      ca.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : ca.status === 'in_progress'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {ca.childName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* LGR22 Codes */}
                          {pkg.lgr22_objectives && pkg.lgr22_objectives.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 mt-4">
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                LGR22
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {pkg.lgr22_objectives.slice(0, 3).map((code, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-200"
                                  >
                                    {code}
                                  </span>
                                ))}
                                {pkg.lgr22_objectives.length > 3 && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium border border-slate-200">
                                    +{pkg.lgr22_objectives.length - 3}
                                  </span>
                                )}
                              </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2 tracking-tight">
              {t('parent.packages.delete.title')}
            </h3>
            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
              {t('parent.packages.delete.confirm', { name: deleteConfirm.name })}
            </p>
            {deleteConfirm.childAssignments.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-amber-900 text-sm font-medium mb-2">
                  {deleteConfirm.childAssignments.length === 1
                    ? t('parent.packages.delete.willRemove', { count: deleteConfirm.childAssignments.length })
                    : t('parent.packages.delete.willRemovePlural', { count: deleteConfirm.childAssignments.length })}
                </p>
                <ul className="space-y-1">
                  {deleteConfirm.childAssignments.map((ca, index) => (
                    <li key={`${ca.childId}-${index}`} className="text-xs text-amber-800">
                      {ca.childName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 tracking-tight text-sm"
              >
                {t('parent.packages.delete.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 tracking-tight text-sm"
              >
                {deleting ? t('parent.packages.delete.deleting') : t('parent.packages.delete.button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
