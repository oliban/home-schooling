'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children, packages } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import CoverageChart from '@/components/curriculum/CoverageChart';
import CustomPromptBuilder from '@/components/curriculum/CustomPromptBuilder';
import ExportButton from '@/components/curriculum/ExportButton';
import FileDropZone from '@/components/ui/FileDropZone';
import { ObjectiveData } from '@/types/curriculum';

interface ChildData {
  id: string;
  name: string;
  birthdate: string | null;
  grade_level: number;
  coins: number;
  hasPin: boolean;
  brainrotCount: number;
  brainrotValue: number;
}

interface ParentData {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface ImportedPackage {
  package: {
    name: string;
    grade_level: number;
    category_id?: string;
    description?: string;
    global?: boolean;
  };
  problems: Array<{
    question_text: string;
    correct_answer: string;
    answer_type?: 'number' | 'text' | 'multiple_choice';
    options?: string[];
    explanation?: string;
    hint?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
}

interface ImportedBatch {
  batch: {
    grade_level: number;
    category_id?: string | null;
    global?: boolean;
  };
  packages: ImportedPackage[];
}

export default function CurriculumDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [parent, setParent] = useState<ParentData | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // State for custom prompt builder
  const [selectedObjectives, setSelectedObjectives] = useState<Set<number>>(new Set());
  const [objectiveDetails, setObjectiveDetails] = useState<Map<number, ObjectiveData>>(new Map());

  // State for import functionality
  const [importSectionExpanded, setImportSectionExpanded] = useState(true); // Expanded by default
  const [importedData, setImportedData] = useState<ImportedPackage | null>(null);
  const [importedBatch, setImportedBatch] = useState<ImportedBatch | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [autoAssign, setAutoAssign] = useState(false); // Whether to auto-assign after import
  const [assignChildId, setAssignChildId] = useState<string>(''); // Child to assign imported package to
  const [hintsAllowed, setHintsAllowed] = useState(true);
  const [importProgress, setImportProgress] = useState(0);

  // Check if any child matches the imported package grade
  const hasMatchingChild = useMemo(() => {
    const gradeLevel = importedData?.package.grade_level || importedBatch?.batch.grade_level;
    if (!gradeLevel) return true; // No package loaded yet
    return childrenList.some(c => c.grade_level === gradeLevel);
  }, [importedData, importedBatch, childrenList]);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    const parentData = localStorage.getItem('parentData');

    if (!token || !parentData) {
      router.push('/parent/login');
      return;
    }

    setParent(JSON.parse(parentData));
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const childrenData = await children.list(token);
      setChildrenList(childrenData);

      // Auto-select first child if available
      if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].id);
      }
    } catch (err) {
      // Error loading data - will show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentData');
    router.push('/parent/login');
  };

  // Handle objective selection for custom prompt builder
  const handleToggleObjective = (objectiveId: number, objective: ObjectiveData) => {
    // If removing an objective, allow it
    if (selectedObjectives.has(objectiveId)) {
      setSelectedObjectives(prev => {
        const next = new Set(prev);
        next.delete(objectiveId);
        return next;
      });

      setObjectiveDetails(prev => {
        const next = new Map(prev);
        next.delete(objectiveId);
        return next;
      });
      return;
    }

    // Adding a new objective - check if it would mix subjects
    // Use updater functions that coordinate via shared closure state
    let shouldAdd = false;

    // First, check if we can add (using updater to see current state)
    setSelectedObjectives(prev => {
      setObjectiveDetails(prevDetails => {
        // Check subjects based on CURRENT state, not stale closures
        const currentSubjects = Array.from(prev)
          .map(id => prevDetails.get(id))
          .filter((obj): obj is ObjectiveData => obj !== undefined)
          .map(obj => obj.subject);

        const uniqueCurrentSubjects = new Set(currentSubjects);

        if (uniqueCurrentSubjects.size > 0 && !uniqueCurrentSubjects.has(objective.subject)) {
          // Would cause mixing - prevent addition
          console.warn('[handleToggleObjective] Cannot mix subjects. Ignoring click.');
          shouldAdd = false;
          return prevDetails; // No change
        }

        // OK to add
        shouldAdd = true;
        const next = new Map(prevDetails);
        next.set(objectiveId, objective);
        return next;
      });

      if (!shouldAdd) {
        return prev; // No change
      }

      const next = new Set(prev);
      next.add(objectiveId);
      return next;
    });
  };

  // Helper to auto-select best matching child based on grade level
  const autoSelectChildByGrade = (gradeLevel: number): string => {
    // Find children with matching grade level
    const matchingChildren = childrenList.filter(c => c.grade_level === gradeLevel);

    if (matchingChildren.length === 0) {
      return ''; // No match found
    }

    if (matchingChildren.length === 1) {
      return matchingChildren[0].id; // Single match
    }

    // Multiple matches - prefer currently selected child if they match
    if (selectedChildId && matchingChildren.some(c => c.id === selectedChildId)) {
      return selectedChildId;
    }

    // Otherwise return first matching child
    return matchingChildren[0].id;
  };

  // Auto-select child when checkbox is checked
  useEffect(() => {
    if (autoAssign && (importedData || importedBatch)) {
      const gradeLevel = importedData?.package.grade_level || importedBatch?.batch.grade_level;
      if (gradeLevel) {
        setAssignChildId(autoSelectChildByGrade(gradeLevel));
      }
    } else if (!autoAssign) {
      setAssignChildId('');
    }
  }, [autoAssign, importedData, importedBatch]);

  // Reset auto-assign when no matching child exists
  useEffect(() => {
    if (!hasMatchingChild && autoAssign) {
      setAutoAssign(false);
      setAssignChildId('');
    }
  }, [hasMatchingChild, autoAssign]);

  const handleFileLoad = (data: unknown) => {
    setImportError(null);
    setImportSuccess(null);
    setImportedData(null);
    setImportedBatch(null);

    const parsed = data as Record<string, unknown>;

    // Check if it's a batch format
    if (parsed.batch && parsed.packages && Array.isArray(parsed.packages)) {
      const batch = parsed as unknown as ImportedBatch;

      if (!batch.batch.grade_level) {
        setImportError(t('parent.dashboard.errors.batchGradeRequired'));
        return;
      }

      if (batch.packages.length === 0) {
        setImportError(t('parent.dashboard.errors.batchEmptyPackages'));
        return;
      }

      for (let i = 0; i < batch.packages.length; i++) {
        const pkg = batch.packages[i];
        if (!pkg.package || !pkg.problems || !Array.isArray(pkg.problems)) {
          setImportError(t('parent.dashboard.errors.packageInvalid', { index: i + 1 }));
          return;
        }
        if (!pkg.package.name || !pkg.package.grade_level) {
          setImportError(t('parent.dashboard.errors.packageMissingFields', { index: i + 1 }));
          return;
        }
        if (pkg.problems.length === 0) {
          setImportError(t('parent.dashboard.errors.packageEmptyProblems', { index: i + 1 }));
          return;
        }
      }

      setImportedBatch(batch);
      setIsGlobal(batch.batch.global ?? false);
      // Reset auto-assign checkbox
      setAutoAssign(false);
      setAssignChildId('');
      return;
    }

    // Single package format
    const singlePkg = parsed as unknown as ImportedPackage;
    if (!singlePkg.package || !singlePkg.problems || !Array.isArray(singlePkg.problems)) {
      setImportError(t('parent.dashboard.errors.invalidFormat'));
      return;
    }

    if (!singlePkg.package.name || !singlePkg.package.grade_level) {
      setImportError(t('parent.dashboard.errors.packageMustHaveFields'));
      return;
    }

    if (singlePkg.problems.length === 0) {
      setImportError(t('parent.dashboard.errors.packageMustHaveProblems'));
      return;
    }

    setImportedData(singlePkg);
    setIsGlobal(singlePkg.package.global ?? false);
    // Reset auto-assign checkbox
    setAutoAssign(false);
    setAssignChildId('');
  };

  const handleImport = async () => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setImporting(true);
    setImportError(null);
    setImportProgress(0);

    try {
      // Handle batch import
      if (importedBatch) {
        let totalProblems = 0;
        const totalPackages = importedBatch.packages.length;

        for (let i = 0; i < importedBatch.packages.length; i++) {
          const pkg = importedBatch.packages[i];
          setImportProgress(Math.round(((i + 0.5) / totalPackages) * 100));

          const result = await packages.import(token, {
            package: {
              ...pkg.package,
              global: isGlobal,
            },
            problems: pkg.problems,
            isGlobal,
          });

          totalProblems += result.problemCount;

          if (assignChildId) {
            await packages.assign(token, result.id, {
              childId: assignChildId,
              title: pkg.package.name,
              hintsAllowed,
            });
          }
        }

        setImportProgress(100);

        const assignedChild = childrenList.find(c => c.id === assignChildId);

        if (assignChildId) {
          setImportSuccess(t('parent.dashboard.import.successBatchAssigned', {
            packages: totalPackages,
            problems: totalProblems,
            assignments: totalPackages,
            childName: assignedChild?.name || '',
          }));
        } else {
          setImportSuccess(t('parent.dashboard.import.successBatch', {
            packages: totalPackages,
            problems: totalProblems,
          }));
        }

        setImportedBatch(null);
        return;
      }

      // Handle single package import
      if (importedData) {
        setImportProgress(50);

        const result = await packages.import(token, {
          package: {
            ...importedData.package,
            global: isGlobal,
          },
          problems: importedData.problems,
          isGlobal,
        });

        setImportProgress(75);

        const assignedChild = childrenList.find(c => c.id === assignChildId);

        if (assignChildId) {
          await packages.assign(token, result.id, {
            childId: assignChildId,
            title: importedData.package.name,
            hintsAllowed,
          });
          setImportSuccess(t('parent.dashboard.import.successAssigned', {
            problems: result.problemCount,
            childName: assignedChild?.name || '',
          }));
        } else {
          setImportSuccess(t('parent.dashboard.import.success', {
            problems: result.problemCount,
          }));
        }

        setImportProgress(100);
        setImportedData(null);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('parent.dashboard.errors.importFailed'));
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  const clearImport = () => {
    setImportedData(null);
    setImportedBatch(null);
    setImportError(null);
    setImportSuccess(null);
    setImportProgress(0);
    setAssignChildId('');
    setHintsAllowed(true);
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId);

  if (loading || !parent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent" className="text-2xl hover:opacity-80 transition-opacity">
              ←
            </Link>
            <div>
              <h1 className="text-xl font-bold">{t('curriculum.title')}</h1>
              <p className="text-sm text-gray-600">{parent.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher showLabel={true} />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Child Selector */}
        <section className="mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('curriculum.selectChild')}</h2>
              {selectedChild && (
                <span className="text-sm text-gray-600">
                  {t('curriculum.gradeLevel', { grade_level: selectedChild.grade_level })}
                </span>
              )}
            </div>

            {childrenList.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👶</div>
                <p className="text-gray-600 mb-4">{t('parent.dashboard.noChildren')}</p>
                <Link
                  href="/parent/children/add"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                >
                  {t('parent.dashboard.addFirstChild')}
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {childrenList.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      selectedChildId === child.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <span>{child.name}</span>
                      <span className="text-xs opacity-75">
                        ({t('curriculum.gradeLevel', { grade_level: child.grade_level })})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Curriculum Coverage Section */}
        {selectedChildId && (
          <section className="mb-8">
            <CoverageChart
              childId={selectedChildId}
              childName={selectedChild?.name}
            />
          </section>
        )}

        {/* Custom Prompt Builder Section */}
        {selectedChildId && selectedChild && (
          <section className="mb-8">
            <CustomPromptBuilder
              childId={selectedChildId}
              childName={selectedChild.name}
              childGradeLevel={selectedChild.grade_level}
              selectedObjectives={selectedObjectives}
              objectiveDetails={objectiveDetails}
              onToggleObjective={handleToggleObjective}
            />
          </section>
        )}

        {/* Export Section */}
        {selectedChildId && selectedChild && (
          <section className="mb-8">
            <ExportButton
              childId={selectedChildId}
              childName={selectedChild.name}
            />
          </section>
        )}

        {/* Import Package Section - Admin Only */}
        {parent?.isAdmin && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400 rounded-2xl p-6 shadow-sm">
              <button
                onClick={() => setImportSectionExpanded(!importSectionExpanded)}
                className="flex items-center gap-2 text-xl font-bold text-purple-900 mb-4 hover:text-purple-700 transition-colors w-full"
              >
                <span className={`transform transition-transform ${importSectionExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <span className="text-2xl mr-2">📦</span>
                {t('curriculum.importTitle')}
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold ml-2">
                  ADMIN ONLY
                </span>
              </button>

              {importSectionExpanded && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  {importSuccess ? (
                    <div className="text-center">
                      <div className="text-4xl mb-4">✅</div>
                      <p className="text-green-600 font-medium mb-4">{importSuccess}</p>
                      <button
                        onClick={clearImport}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                      >
                        {t('parent.dashboard.importAnother')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                <FileDropZone
                  onFileLoad={handleFileLoad}
                  label={t('parent.dashboard.dropZone')}
                  description={t('parent.dashboard.dropZoneDescription')}
                />

                {importError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {importError}
                  </div>
                )}

                {(importedData || importedBatch) && (
                  <div className="space-y-4">
                    {/* Package Preview */}
                    {importedData && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-bold mb-2">{importedData.package.name}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Grade: {importedData.package.grade_level}</div>
                          <div>{importedData.problems.length} problems</div>
                          {importedData.package.description && (
                            <div className="text-xs">{importedData.package.description}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Batch Preview */}
                    {importedBatch && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h3 className="font-bold mb-2">Batch Import</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Grade: {importedBatch.batch.grade_level}</div>
                          <div>{importedBatch.packages.length} packages</div>
                          <div className="text-xs mt-2">
                            <strong>Packages:</strong>
                            <ul className="mt-1 pl-4 list-disc max-h-32 overflow-y-auto">
                              {importedBatch.packages.map((pkg, i) => (
                                <li key={i}>{pkg.package.name} ({pkg.problems.length} problems)</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auto-assign Checkbox */}
                    <label className={`flex items-start gap-3 ${!hasMatchingChild ? 'opacity-50' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={autoAssign}
                        onChange={(e) => setAutoAssign(e.target.checked)}
                        disabled={!hasMatchingChild}
                        className="mt-1 w-5 h-5"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t('parent.dashboard.autoAssign')}</span>
                        <p className="text-xs text-gray-500">
                          {t('parent.dashboard.autoAssignDescription')}
                        </p>
                      </div>
                    </label>

                    {/* Grade mismatch warning */}
                    {!hasMatchingChild && (importedData || importedBatch) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        {t('parent.dashboard.gradeMismatchWarning', {
                          grade: (importedData?.package.grade_level || importedBatch?.batch.grade_level) ?? 0
                        })}
                      </div>
                    )}

                    {/* Child Selection Dropdown (only show if auto-assign is checked) */}
                    {autoAssign && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign to child
                        </label>
                        <select
                          value={assignChildId}
                          onChange={(e) => setAssignChildId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="" disabled>
                            {t('parent.dashboard.selectChild')}
                          </option>
                          {childrenList.map((child) => {
                            // Check if this child matches the package grade
                            const packageGrade = importedData?.package.grade_level || importedBatch?.batch.grade_level;
                            const isMatch = packageGrade && child.grade_level === packageGrade;

                            return (
                              <option key={child.id} value={child.id}>
                                {child.name} (Grade {child.grade_level}){isMatch ? ' ✓ Recommended' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {assignChildId && (
                          <p className="mt-1 text-xs text-gray-500">
                            Will assign to {childrenList.find(c => c.id === assignChildId)?.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Import Options */}
                    <div className="space-y-3">
                      {/* Global Sharing */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isGlobal}
                          onChange={(e) => setIsGlobal(e.target.checked)}
                          className="mt-1 w-5 h-5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{t('parent.dashboard.shareGlobal')}</span>
                          <p className="text-xs text-gray-500">
                            {selectedChild && t('parent.dashboard.shareDescription', { grade_level: selectedChild.grade_level })}
                          </p>
                        </div>
                      </label>

                      {/* Hints (only show if assigning to a child) */}
                      {assignChildId && (
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hintsAllowed}
                            onChange={(e) => setHintsAllowed(e.target.checked)}
                            className="mt-1 w-5 h-5"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{t('parent.dashboard.allowHints')}</span>
                            <p className="text-xs text-gray-500">
                              {t('parent.dashboard.allowHintsDescription')}
                            </p>
                          </div>
                        </label>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {importing && importProgress > 0 && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Importing...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Import Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleImport}
                        disabled={importing}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing
                          ? 'Importing...'
                          : assignChildId
                          ? (importedBatch ? `Import & Assign ${importedBatch.packages.length} Packages` : 'Import & Assign')
                          : (importedBatch ? `Import ${importedBatch.packages.length} Packages` : 'Import Package')}
                      </button>
                      <button
                        onClick={clearImport}
                        disabled={importing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold mb-4">{t('parent.dashboard.quickActions')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/parent"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🏠</div>
              <p className="font-medium">{t('curriculum.backToDashboard')}</p>
            </Link>
            <Link
              href="/parent/packages"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📦</div>
              <p className="font-medium">{t('curriculum.browsePackages')}</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
