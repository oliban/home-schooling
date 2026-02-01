'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { children, assignments, packages, admin } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import FileDropZone from '@/components/ui/FileDropZone';
import ProgressChart, { DailyStatsData } from '@/components/ui/ProgressChart';
import { isDevelopment } from '@/lib/env';
import DevAdminPanel from '@/components/admin/DevAdminPanel';
import AdminPanel from '@/components/admin/AdminPanel';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChildData {
  id: string;
  name: string;
  birthdate: string | null;
  grade_level: number;
  coins: number;
  hasPin: boolean;
  brainrotCount: number;
  brainrotValue: number;
  activeAssignments: number;
  completedAssignments: number;
}

interface AssignmentData {
  id: string;
  child_id: string;
  child_name: string;
  assignment_type: 'math' | 'reading' | 'english' | 'quiz';
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  correct_count: number;
  total_count: number;
  assigned_by_name?: string;
  assigned_by_email?: string;
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

// Sortable Assignment Card Component
function SortableAssignmentCard({
  assignment,
  deletingAssignmentId,
  onDelete,
  t,
  variant = 'pending',
}: {
  assignment: AssignmentData;
  deletingAssignmentId: string | null;
  onDelete: (id: string, e: React.MouseEvent) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  variant?: 'pending' | 'in_progress';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const borderClass = variant === 'in_progress' ? 'border-l-4 border-orange-400' : '';
  const statusClass = variant === 'in_progress'
    ? 'bg-orange-100 text-orange-700'
    : 'bg-yellow-100 text-yellow-700';
  const statusText = variant === 'in_progress'
    ? t('parent.dashboard.inProgress')
    : t('parent.dashboard.pending');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow ${borderClass} ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-2 mr-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title={t('parent.dashboard.dragToReorder')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="12" cy="3" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
          <circle cx="4" cy="13" r="1.5" />
          <circle cx="12" cy="13" r="1.5" />
        </svg>
      </button>

      <Link
        href={`/parent/assignments/${assignment.id}`}
        className="flex-1 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {assignment.assignment_type === 'math' ? '📐' : assignment.assignment_type === 'reading' ? '📖' : assignment.assignment_type === 'english' ? '🇬🇧' : '🧠'}
          </span>
          <div>
            <p className="font-medium">{assignment.title}</p>
            <p className="text-sm text-gray-600">
              {t('parent.dashboard.created')} {new Date(assignment.created_at).toLocaleDateString()}
            </p>
            {assignment.assigned_by_name && (
              <p className="text-xs text-purple-600">
                {t('parent.dashboard.assignedBy', { name: assignment.assigned_by_name })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {variant === 'in_progress' && (
            <span className="font-medium text-orange-700">
              {assignment.correct_count}/{assignment.total_count}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm ${statusClass}`}>
            {statusText}
          </span>
        </div>
      </Link>

      <button
        onClick={(e) => onDelete(assignment.id, e)}
        disabled={deletingAssignmentId === assignment.id}
        className="p-2 ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title={t('parent.dashboard.deleteAssignment')}
      >
        {deletingAssignmentId === assignment.id ? '...' : '🗑️'}
      </button>
    </div>
  );
}

export default function ParentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [parent, setParent] = useState<ParentData | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync banner state
  const [syncInfo, setSyncInfo] = useState<{
    syncedAt: number | null;
    sourceFile: string | null;
    syncedAtHuman: string | null;
  } | null>(null);
  const [showSyncBanner, setShowSyncBanner] = useState(false);

  // Import state
  const [importedData, setImportedData] = useState<ImportedPackage | null>(null);
  const [importedBatch, setImportedBatch] = useState<ImportedBatch | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [autoAssign, setAutoAssign] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [hintsAllowed, setHintsAllowed] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Stats chart state
  const [statsData, setStatsData] = useState<DailyStatsData[]>([]);
  const [statsPeriod, setStatsPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  // Delete assignment state
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  // Completed section collapsed state (hidden by default)
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

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
      const [childrenData, assignmentsData, statsResponse] = await Promise.all([
        children.list(token),
        assignments.list(token),
        children.getStatsByDate(token, statsPeriod),
      ]);
      setChildrenList(childrenData);
      setAssignmentsList(assignmentsData);
      setStatsData(statsResponse);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh stats when period changes
  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (token && !loading) {
      children.getStatsByDate(token, statsPeriod)
        .then(setStatsData)
        .catch(err => console.error('Failed to load stats:', err));
    }
  }, [statsPeriod, loading]);

  // Check for sync completion and show banner (dev only)
  useEffect(() => {
    if (isDevelopment() && searchParams.get('synced') === '1') {
      admin.getSyncInfo()
        .then(info => {
          if (info.syncedAt) {
            // Only show if synced within last 5 minutes
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (info.syncedAt > fiveMinutesAgo) {
              setSyncInfo(info);
              setShowSyncBanner(true);
            }
          }
          // Remove the query param from URL
          router.replace('/parent', { scroll: false });
        })
        .catch(err => console.error('Failed to get sync info:', err));
    }
  }, [searchParams, router]);

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentData');
    router.push('/parent/login');
  };

  // Auto-select child by matching grade
  const autoSelectChildByGrade = (gradeLevel: number) => {
    const matchingChild = childrenList.find(c => c.grade_level === gradeLevel);
    if (matchingChild) {
      setSelectedChildId(matchingChild.id);
      setAutoAssign(true);
    } else if (childrenList.length === 1) {
      // If only one child, select them regardless of grade
      setSelectedChildId(childrenList[0].id);
      setAutoAssign(true);
    } else {
      setSelectedChildId('');
      setAutoAssign(false);
    }
  };

  const handleFileLoad = (data: unknown) => {
    setImportError(null);
    setImportSuccess(null);
    setImportedData(null);
    setImportedBatch(null);

    const parsed = data as Record<string, unknown>;

    // Check if it's a batch format
    if (parsed.batch && parsed.packages && Array.isArray(parsed.packages)) {
      const batch = parsed as unknown as ImportedBatch;

      // Validate batch structure
      if (!batch.batch.grade_level) {
        setImportError(t('parent.dashboard.errors.batchGradeRequired'));
        return;
      }

      if (batch.packages.length === 0) {
        setImportError(t('parent.dashboard.errors.batchEmptyPackages'));
        return;
      }

      // Validate each package in the batch
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
      autoSelectChildByGrade(batch.batch.grade_level);
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
    autoSelectChildByGrade(singlePkg.package.grade_level);
  };

  const handleImport = async () => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    // Validate auto-assign has a child selected
    if (autoAssign && !selectedChildId) {
      setImportError(t('parent.dashboard.errors.selectChildForAutoAssign'));
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportProgress(0);

    try {
      let assignmentsCreated = 0;

      // Handle batch import
      if (importedBatch) {
        let totalProblems = 0;
        const totalPackages = importedBatch.packages.length;

        for (let i = 0; i < importedBatch.packages.length; i++) {
          const pkg = importedBatch.packages[i];
          const result = await packages.import(token, {
            package: pkg.package,
            problems: pkg.problems,
            isGlobal,
          });
          totalProblems += result.problemCount;

          // Auto-assign if enabled
          if (autoAssign && selectedChildId) {
            await packages.assign(token, result.id, {
              childId: selectedChildId,
              title: pkg.package.name,
              hintsAllowed,
            });
            assignmentsCreated++;
          }

          setImportProgress(Math.round(((i + 1) / totalPackages) * 100));
        }

        const childName = childrenList.find(c => c.id === selectedChildId)?.name || '';
        if (autoAssign && assignmentsCreated > 0) {
          setImportSuccess(t('parent.dashboard.import.successBatchAssigned', {
            packages: totalPackages,
            problems: totalProblems,
            assignments: assignmentsCreated,
            childName
          }));
        } else {
          setImportSuccess(t('parent.dashboard.import.successBatch', { packages: totalPackages, problems: totalProblems }));
        }
        setImportedBatch(null);

        // Reload assignments if we created any
        if (assignmentsCreated > 0) {
          const updatedAssignments = await assignments.list(token);
          setAssignmentsList(updatedAssignments);
        }
        return;
      }

      // Handle single package import
      if (importedData) {
        const result = await packages.import(token, {
          package: importedData.package,
          problems: importedData.problems,
          isGlobal,
        });

        // Auto-assign if enabled
        if (autoAssign && selectedChildId) {
          await packages.assign(token, result.id, {
            childId: selectedChildId,
            title: importedData.package.name,
            hintsAllowed,
          });
          assignmentsCreated = 1;

          // Reload assignments
          const updatedAssignments = await assignments.list(token);
          setAssignmentsList(updatedAssignments);
        }

        const childName = childrenList.find(c => c.id === selectedChildId)?.name || '';
        if (autoAssign) {
          setImportSuccess(t('parent.dashboard.import.successAssigned', { problems: result.problemCount, childName }));
        } else {
          setImportSuccess(t('parent.dashboard.import.success', { problems: result.problemCount }));
        }
        setImportedData(null);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('parent.dashboard.errors.importFailed'));
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const clearImport = () => {
    setImportedData(null);
    setImportedBatch(null);
    setImportError(null);
    setImportSuccess(null);
    setImportProgress(0);
    setAutoAssign(false);
    setSelectedChildId('');
    setHintsAllowed(true);
  };

  const handleDeleteAssignment = async (assignmentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('parent.dashboard.confirmDeleteAssignment'))) {
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setDeletingAssignmentId(assignmentId);
    try {
      await assignments.delete(token, assignmentId);
      setAssignmentsList(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert(t('parent.dashboard.deleteAssignmentError'));
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start for visual feedback
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end for reordering assignments
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset active state
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    // Find the assignments being reordered
    const activeAssignment = assignmentsList.find(a => a.id === active.id);
    const overAssignment = assignmentsList.find(a => a.id === over.id);

    if (!activeAssignment || !overAssignment) return;

    // Only allow reordering within the same child (removed status check)
    if (activeAssignment.child_id !== overAssignment.child_id) {
      return;
    }

    // Get all active assignments for this child (both pending and in_progress)
    const childActiveAssignments = assignmentsList.filter(
      a => a.child_id === activeAssignment.child_id &&
           (a.status === 'pending' || a.status === 'in_progress')
    );

    const oldIndex = childActiveAssignments.findIndex(a => a.id === active.id);
    const newIndex = childActiveAssignments.findIndex(a => a.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the assignments
    const reordered = arrayMove(childActiveAssignments, oldIndex, newIndex);
    const orderedIds = reordered.map(a => a.id);

    // Determine status updates: if pending assignment is dragged, set it to in_progress
    const statusUpdates: Record<string, string> = {};
    if (activeAssignment.status === 'pending') {
      statusUpdates[active.id as string] = 'in_progress';
    }

    // Optimistic UI update
    setAssignmentsList(prev => {
      const updated = [...prev];
      const otherAssignments = updated.filter(
        a => a.child_id !== activeAssignment.child_id ||
             (a.status !== 'pending' && a.status !== 'in_progress')
      );
      const updatedReordered = reordered.map(a => {
        if (statusUpdates[a.id]) {
          return { ...a, status: statusUpdates[a.id] as 'pending' | 'in_progress' | 'completed' };
        }
        return a;
      });
      return [...otherAssignments, ...updatedReordered];
    });

    // Persist to backend
    try {
      await assignments.reorder(token, orderedIds, statusUpdates);
    } catch (err) {
      console.error('Failed to reorder assignments:', err);
      // Reload on error to restore correct order
      const token = localStorage.getItem('parentToken');
      if (token) {
        const updatedAssignments = await assignments.list(token);
        setAssignmentsList(updatedAssignments);
      }
    }
  };

  if (loading || !parent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  // Combine pending and in_progress into "active" assignments
  const activeAssignments = assignmentsList.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const completedAssignments = assignmentsList.filter(a => a.status === 'completed');

  // Group assignments by child
  const groupByChild = (assignments: AssignmentData[]) => {
    const grouped: Record<string, { childName: string; assignments: AssignmentData[] }> = {};
    for (const assignment of assignments) {
      if (!grouped[assignment.child_id]) {
        grouped[assignment.child_id] = {
          childName: assignment.child_name,
          assignments: [],
        };
      }
      grouped[assignment.child_id].assignments.push(assignment);
    }
    return Object.entries(grouped).sort((a, b) => a[1].childName.localeCompare(b[1].childName));
  };

  const activeByChild = groupByChild(activeAssignments);
  const completedByChild = groupByChild(completedAssignments);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Sync Success Banner (dev only) */}
      {isDevelopment() && showSyncBanner && syncInfo && (
        <div className="bg-green-600 text-white px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-medium">Database synced from production</p>
                <p className="text-sm text-green-100">
                  Synced at {syncInfo.syncedAtHuman} from {syncInfo.sourceFile}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSyncBanner(false)}
              className="text-green-200 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl">👨‍👩‍👧‍👦</div>
            <div>
              <h1 className="text-xl font-bold">{t('parent.dashboard.title')}</h1>
              <p className="text-sm text-gray-600">{parent.email}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{t('parent.dashboard.familyCodeLabel')}</span>
                <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                  {(parent as ParentData & { familyCode?: string }).familyCode || '----'}
                </code>
                <button
                  onClick={() => {
                    const code = (parent as ParentData & { familyCode?: string }).familyCode;
                    if (code) {
                      navigator.clipboard.writeText(code);
                      alert(t('parent.dashboard.familyCodeCopied'));
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs"
                >
                  {t('parent.dashboard.copy')}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/parent/curriculum"
              className="px-4 py-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors font-medium"
            >
              {t('parent.dashboard.lgr22Link')}
            </Link>
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
        {/* Children Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('parent.dashboard.children')}</h2>
            <Link
              href="/parent/children/add"
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              + {t('parent.dashboard.addChild')}
            </Link>
          </div>

          {childrenList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childrenList.map((child) => (
                <Link
                  key={child.id}
                  href={`/parent/children/${child.id}`}
                  className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* Subtle gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative p-5">
                    {/* Header: Name, Grade, Coins */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl shadow-sm">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                            {child.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {t('parent.dashboard.grade', { level: child.grade_level })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-lg">💰</span>
                        <span className="font-semibold text-amber-700">{child.coins}</span>
                      </div>
                    </div>

                    {/* Stats Grid: Assignments */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <div className="text-2xl font-bold text-orange-600 mb-0.5">
                          {child.activeAssignments}
                        </div>
                        <div className="text-xs font-medium text-orange-700/80">
                          {t('parent.dashboard.activeAssignmentsCount', { count: '' }).replace(/\d+\s*/, '')}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                        <div className="text-2xl font-bold text-green-600 mb-0.5">
                          {child.completedAssignments}
                        </div>
                        <div className="text-xs font-medium text-green-700/80">
                          {t('parent.dashboard.completedAssignmentsCount', { count: '' }).replace(/\d+\s*/, '')}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Brainrot info */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span>🧠</span>
                        <span className="font-medium">{child.brainrotCount}</span>
                      </div>
                      <span className="text-gray-400">|</span>
                      <div className="text-gray-500">
                        {child.brainrotValue} mynt
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Progress Chart Section */}
        {childrenList.length > 0 && (
          <section className="mb-8">
            <ProgressChart
              data={statsData}
              period={statsPeriod}
              onPeriodChange={setStatsPeriod}
            />
          </section>
        )}

        {/* Assignments Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('parent.dashboard.assignments')}</h2>
          </div>

          {assignmentsList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">{t('parent.dashboard.noAssignments')}</p>
              <p className="text-sm text-gray-500">
                {childrenList.length > 0
                  ? 'Use the curriculum planning page to create assignments'
                  : t('parent.dashboard.addChildFirst')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Assignments (Pending + In Progress) */}
              {activeAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">
                    {t('parent.dashboard.activeAssignments')} ({activeAssignments.length})
                  </h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {activeByChild.map(([childId, { childName, assignments: childAssignments }]) => (
                        <div key={childId}>
                          <div className="flex items-center justify-between mb-2 pl-1">
                            <p className="text-xs font-medium text-gray-500">{childName}</p>
                            <Link
                              href={`/parent/packages?childId=${childId}`}
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
                            >
                              {t('parent.dashboard.addAssignment')}
                            </Link>
                          </div>
                          <SortableContext
                            items={childAssignments.map(a => a.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {childAssignments.map((assignment) => (
                                <SortableAssignmentCard
                                  key={assignment.id}
                                  assignment={assignment}
                                  deletingAssignmentId={deletingAssignmentId}
                                  onDelete={handleDeleteAssignment}
                                  t={t}
                                  variant={assignment.status === 'in_progress' ? 'in_progress' : 'pending'}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      ))}
                    </div>
                    <DragOverlay>
                      {activeId ? (
                        <div className="bg-white p-4 rounded-xl shadow-lg ring-2 ring-blue-400 opacity-90">
                          {(() => {
                            const activeAssignment = assignmentsList.find(a => a.id === activeId);
                            if (!activeAssignment) return null;

                            const variant = activeAssignment.status === 'in_progress' ? 'in_progress' : 'pending';
                            const borderClass = variant === 'in_progress' ? 'border-l-4 border-orange-400' : '';

                            return (
                              <div className={`flex items-center gap-3 ${borderClass}`}>
                                <div className="p-2 text-gray-400">
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="4" cy="3" r="1.5" />
                                    <circle cx="12" cy="3" r="1.5" />
                                    <circle cx="4" cy="8" r="1.5" />
                                    <circle cx="12" cy="8" r="1.5" />
                                    <circle cx="4" cy="13" r="1.5" />
                                    <circle cx="12" cy="13" r="1.5" />
                                  </svg>
                                </div>
                                <span className="text-2xl">
                                  {activeAssignment.assignment_type === 'math' ? '📐' : activeAssignment.assignment_type === 'reading' ? '📖' : activeAssignment.assignment_type === 'english' ? '🇬🇧' : '🧠'}
                                </span>
                                <div>
                                  <p className="font-medium">{activeAssignment.title}</p>
                                  <p className="text-sm text-gray-600">
                                    {t('parent.dashboard.created')} {new Date(activeAssignment.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}

              {/* Children without active assignments */}
              {(() => {
                const childrenWithActiveAssignments = new Set(activeByChild.map(([childId]) => childId));
                const childrenWithoutActive = childrenList.filter(child => !childrenWithActiveAssignments.has(child.id));

                return childrenWithoutActive.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">
                      No active assignments
                    </h3>
                    {childrenWithoutActive.map((child) => (
                      <div key={child.id} className="mb-3">
                        <div className="flex items-center justify-between mb-2 pl-1">
                          <p className="text-xs font-medium text-gray-500">{child.name}</p>
                        </div>
                        <Link
                          href={`/parent/packages?childId=${child.id}`}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <span className="text-lg">📚</span>
                          <span>{t('parent.dashboard.addAssignment')}</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Completed - Collapsible */}
              {completedAssignments.length > 0 && (
                <div>
                  <button
                    onClick={() => setCompletedExpanded(!completedExpanded)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2 hover:text-gray-800 transition-colors"
                  >
                    <span className={`transform transition-transform ${completedExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    {t('parent.dashboard.completed')} ({completedAssignments.length})
                  </button>
                  {completedExpanded && (
                    <div className="space-y-4">
                      {completedByChild.map(([childId, { childName, assignments }]) => (
                        <div key={childId}>
                          <p className="text-xs font-medium text-gray-500 mb-2 pl-1">{childName}</p>
                          <div className="space-y-2">
                            {assignments.map((assignment) => {
                              const percentage = assignment.total_count > 0
                                ? Math.round((assignment.correct_count / assignment.total_count) * 100)
                                : 0;
                              const scoreColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';

                              return (
                                <Link
                                  key={assignment.id}
                                  href={`/parent/assignments/${assignment.id}`}
                                  className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between opacity-75 hover:opacity-100 hover:shadow-md transition-all block"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">
                                      {assignment.assignment_type === 'math' ? '📐' : assignment.assignment_type === 'reading' ? '📖' : assignment.assignment_type === 'english' ? '🇬🇧' : '🧠'}
                                    </span>
                                    <div>
                                      <p className="font-medium">{assignment.title}</p>
                                      {assignment.completed_at && (
                                        <p className="text-xs text-gray-500">
                                          {t('parent.dashboard.completedAt')} {new Date(assignment.completed_at).toLocaleString()}
                                        </p>
                                      )}
                                      {assignment.assigned_by_name && (
                                        <p className="text-xs text-purple-600">
                                          {t('parent.dashboard.assignedBy', { name: assignment.assigned_by_name })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`font-semibold ${scoreColor}`}>
                                      {assignment.correct_count}/{assignment.total_count} ({percentage}%)
                                    </span>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                      {t('parent.dashboard.completed')}
                                    </span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>


        {/* Admin Panel (for admin parents only) */}
        {parent?.isAdmin && (
          <AdminPanel token={localStorage.getItem('parentToken') || ''} />
        )}

        {/* Developer Admin Panel (Development Only) */}
        {isDevelopment() && (
          <section className="mt-8">
            <DevAdminPanel />
          </section>
        )}
      </div>
    </main>
  );
}
