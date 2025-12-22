'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children, assignments, packages } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import FileDropZone from '@/components/ui/FileDropZone';
import ProgressChart, { DailyStatsData } from '@/components/ui/ProgressChart';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
}

interface AssignmentData {
  id: string;
  child_id: string;
  child_name: string;
  assignment_type: 'math' | 'reading';
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  correct_count: number;
  total_count: number;
}

interface ParentData {
  id: string;
  email: string;
  name: string;
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
        title="Drag to reorder"
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
            {assignment.assignment_type === 'math' ? '📐' : '📖'}
          </span>
          <div>
            <p className="font-medium">{assignment.title}</p>
            <p className="text-sm text-gray-600">
              {t('parent.dashboard.created')} {new Date(assignment.created_at).toLocaleDateString()}
            </p>
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
  const { t } = useTranslation();
  const [parent, setParent] = useState<ParentData | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState(true);

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
        setImportError('Batch must have "grade_level" field.');
        return;
      }

      if (batch.packages.length === 0) {
        setImportError('Batch must contain at least one package.');
        return;
      }

      // Validate each package in the batch
      for (let i = 0; i < batch.packages.length; i++) {
        const pkg = batch.packages[i];
        if (!pkg.package || !pkg.problems || !Array.isArray(pkg.problems)) {
          setImportError(`Package ${i + 1} is invalid. Must have "package" and "problems" fields.`);
          return;
        }
        if (!pkg.package.name || !pkg.package.grade_level) {
          setImportError(`Package ${i + 1} must have "name" and "grade_level" fields.`);
          return;
        }
        if (pkg.problems.length === 0) {
          setImportError(`Package ${i + 1} must contain at least one problem.`);
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
      setImportError('Invalid format. Must be single package (with "package" and "problems") or batch (with "batch" and "packages").');
      return;
    }

    if (!singlePkg.package.name || !singlePkg.package.grade_level) {
      setImportError('Package must have "name" and "grade_level" fields.');
      return;
    }

    if (singlePkg.problems.length === 0) {
      setImportError('Package must contain at least one problem.');
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
      setImportError('Please select a child for auto-assignment.');
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

        const assignMsg = autoAssign ? ` and assigned ${assignmentsCreated} to ${childrenList.find(c => c.id === selectedChildId)?.name}` : '';
        setImportSuccess(`Imported ${totalPackages} packages with ${totalProblems} total problems${assignMsg}!`);
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

        const assignMsg = autoAssign ? ` and assigned to ${childrenList.find(c => c.id === selectedChildId)?.name}` : '';
        setImportSuccess(`Package imported successfully with ${result.problemCount} problems${assignMsg}!`);
        setImportedData(null);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import package');
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

  // Handle drag end for reordering assignments
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    // Find the assignments being reordered
    const activeAssignment = assignmentsList.find(a => a.id === active.id);
    const overAssignment = assignmentsList.find(a => a.id === over.id);

    if (!activeAssignment || !overAssignment) return;

    // Only allow reordering within the same child and status
    if (activeAssignment.child_id !== overAssignment.child_id ||
        activeAssignment.status !== overAssignment.status) {
      return;
    }

    // Get all assignments for this child and status
    const childStatusAssignments = assignmentsList.filter(
      a => a.child_id === activeAssignment.child_id && a.status === activeAssignment.status
    );

    const oldIndex = childStatusAssignments.findIndex(a => a.id === active.id);
    const newIndex = childStatusAssignments.findIndex(a => a.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the assignments
    const reordered = arrayMove(childStatusAssignments, oldIndex, newIndex);
    const orderedIds = reordered.map(a => a.id);

    // Optimistic UI update
    setAssignmentsList(prev => {
      const updated = [...prev];
      const otherAssignments = updated.filter(
        a => a.child_id !== activeAssignment.child_id || a.status !== activeAssignment.status
      );
      return [...otherAssignments, ...reordered];
    });

    // Persist to backend
    try {
      await assignments.reorder(token, orderedIds);
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

  const pendingAssignments = assignmentsList.filter(a => a.status === 'pending');
  const inProgressAssignments = assignmentsList.filter(a => a.status === 'in_progress');
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

  const pendingByChild = groupByChild(pendingAssignments);
  const inProgressByChild = groupByChild(inProgressAssignments);
  const completedByChild = groupByChild(completedAssignments);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl">👨‍👩‍👧‍👦</div>
            <div>
              <h1 className="text-xl font-bold">{t('parent.dashboard.title')}</h1>
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

      {/* Family Code Banner */}
      <div className="bg-blue-50 border-b border-blue-100 py-3">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-700 font-medium">{t('parent.dashboard.familyCode')}:</span>
            <code className="bg-white px-4 py-2 rounded border text-2xl font-bold tracking-widest">{(parent as ParentData & { familyCode?: string }).familyCode || '----'}</code>
          </div>
          <button
            onClick={() => {
              const code = (parent as ParentData & { familyCode?: string }).familyCode;
              if (code) {
                navigator.clipboard.writeText(code);
                alert(t('parent.dashboard.familyCodeCopied'));
              }
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('parent.dashboard.copy')}
          </button>
        </div>
      </div>

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
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-3xl">👤</div>
                    <div>
                      <h3 className="font-bold text-lg">{child.name}</h3>
                      <p className="text-sm text-gray-600">{t('parent.dashboard.grade', { level: child.grade_level })}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <span>💰</span>
                      <span>{child.coins} {t('common.coins')}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      child.hasPin ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {child.hasPin ? t('parent.dashboard.pinSet') : t('parent.dashboard.noPin')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-purple-600">
                      <span>🧠</span>
                      <span>{child.brainrotCount} brainrots</span>
                    </div>
                    <div className="text-gray-600">
                      {child.brainrotValue} coins
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
            <Link
              href="/parent/assignments/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + {t('parent.dashboard.createAssignment')}
            </Link>
          </div>

          {assignmentsList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">{t('parent.dashboard.noAssignments')}</p>
              {childrenList.length > 0 ? (
                <Link
                  href="/parent/assignments/create"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  {t('parent.dashboard.createFirstAssignment')}
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{t('parent.dashboard.addChildFirst')}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* In Progress */}
              {inProgressAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('parent.dashboard.inProgress')} ({inProgressAssignments.length})</h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {inProgressByChild.map(([childId, { childName, assignments: childAssignments }]) => (
                        <div key={childId}>
                          <p className="text-xs font-medium text-gray-500 mb-2 pl-1">{childName}</p>
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
                                  variant="in_progress"
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      ))}
                    </div>
                  </DndContext>
                </div>
              )}

              {/* Pending */}
              {pendingAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('parent.dashboard.pending')} ({pendingAssignments.length})</h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {pendingByChild.map(([childId, { childName, assignments: childAssignments }]) => (
                        <div key={childId}>
                          <p className="text-xs font-medium text-gray-500 mb-2 pl-1">{childName}</p>
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
                                  variant="pending"
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      ))}
                    </div>
                  </DndContext>
                </div>
              )}

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
                                      {assignment.assignment_type === 'math' ? '📐' : '📖'}
                                    </span>
                                    <div>
                                      <p className="font-medium">{assignment.title}</p>
                                      {assignment.completed_at && (
                                        <p className="text-xs text-gray-500">
                                          {t('parent.dashboard.completedAt')} {new Date(assignment.completed_at).toLocaleString()}
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

        {/* Import Package Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Import Problem Package</h2>
            <Link
              href="/parent/packages"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              {t('parent.dashboard.browsePackages')}
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            {importSuccess ? (
              <div className="text-center">
                <div className="text-4xl mb-3">.</div>
                <p className="text-green-600 font-medium mb-4">{importSuccess}</p>
                <button
                  onClick={clearImport}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Import Another
                </button>
              </div>
            ) : importedBatch ? (
              <div>
                <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Batch Import</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Grade: {importedBatch.batch.grade_level}</div>
                    <div>Packages: {importedBatch.packages.length}</div>
                    <div>Total Problems: {importedBatch.packages.reduce((sum, pkg) => sum + pkg.problems.length, 0)}</div>
                    {importedBatch.batch.category_id && (
                      <div>Category: {importedBatch.batch.category_id}</div>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    <strong>Packages:</strong>
                    <ul className="mt-1 pl-4 list-disc max-h-32 overflow-y-auto">
                      {importedBatch.packages.map((pkg, i) => (
                        <li key={i}>{pkg.package.name} ({pkg.problems.length} problems)</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGlobal}
                    onChange={(e) => setIsGlobal(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">Share globally</span>
                    <p className="text-sm text-gray-500">
                      Visible to all parents with children in grade {importedBatch.batch.grade_level}
                    </p>
                  </div>
                </label>

                {childrenList.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAssign}
                        onChange={(e) => setAutoAssign(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium">Auto-assign after import</span>
                        <p className="text-sm text-gray-500">
                          Immediately assign all packages to selected child
                        </p>
                      </div>
                    </label>

                    {autoAssign && (
                      <div className="mt-3 space-y-3">
                        <select
                          value={selectedChildId}
                          onChange={(e) => setSelectedChildId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select child...</option>
                          {childrenList.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.name} (Grade {child.grade_level})
                              {child.grade_level === importedBatch.batch.grade_level ? ' ✓' : ''}
                            </option>
                          ))}
                        </select>

                        {/* Allow Hints Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div>
                            <span className="font-medium text-sm">Allow Hints</span>
                            <p className="text-xs text-gray-500">Child can buy hints after wrong answers</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHintsAllowed(!hintsAllowed)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              hintsAllowed ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                hintsAllowed ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {importError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {importError}
                  </div>
                )}

                {importing && importProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Importing packages...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={importing || (autoAssign && !selectedChildId)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {importing ? `Importing... ${importProgress}%` : `Import ${importedBatch.packages.length} Packages${autoAssign ? ' & Assign' : ''}`}
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
            ) : importedData ? (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">{importedData.package.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Grade: {importedData.package.grade_level}</div>
                    <div>Problems: {importedData.problems.length}</div>
                    {importedData.package.category_id && (
                      <div>Category: {importedData.package.category_id}</div>
                    )}
                    {importedData.package.description && (
                      <div className="col-span-2">Description: {importedData.package.description}</div>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGlobal}
                    onChange={(e) => setIsGlobal(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">Share globally</span>
                    <p className="text-sm text-gray-500">
                      Visible to all parents with children in grade {importedData.package.grade_level}
                    </p>
                  </div>
                </label>

                {childrenList.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAssign}
                        onChange={(e) => setAutoAssign(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium">Auto-assign after import</span>
                        <p className="text-sm text-gray-500">
                          Immediately assign to selected child
                        </p>
                      </div>
                    </label>

                    {autoAssign && (
                      <div className="mt-3 space-y-3">
                        <select
                          value={selectedChildId}
                          onChange={(e) => setSelectedChildId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select child...</option>
                          {childrenList.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.name} (Grade {child.grade_level})
                              {child.grade_level === importedData.package.grade_level ? ' ✓' : ''}
                            </option>
                          ))}
                        </select>

                        {/* Allow Hints Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div>
                            <span className="font-medium text-sm">Allow Hints</span>
                            <p className="text-xs text-gray-500">Child can buy hints after wrong answers</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHintsAllowed(!hintsAllowed)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              hintsAllowed ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                hintsAllowed ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {importError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {importError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={importing || (autoAssign && !selectedChildId)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : `Import Package${autoAssign ? ' & Assign' : ''}`}
                  </button>
                  <button
                    onClick={clearImport}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <FileDropZone
                  onFileLoad={handleFileLoad}
                  label="Drop problem package JSON here"
                  description="Single package or batch (multiple packages)"
                />
                {importError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {importError}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold mb-4">{t('parent.dashboard.quickActions')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Link
              href="/parent/children/add"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">👶</div>
              <p className="font-medium">{t('parent.dashboard.addChild')}</p>
            </Link>
            <Link
              href="/parent/assignments/create"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📝</div>
              <p className="font-medium">{t('parent.dashboard.createAssignment')}</p>
            </Link>
            <Link
              href="/parent/packages"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📦</div>
              <p className="font-medium">{t('parent.dashboard.browsePackages')}</p>
            </Link>
            <Link
              href="/parent/curriculum"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">📊</div>
              <p className="font-medium">LGR 22 Coverage</p>
            </Link>
            <Link
              href="/login"
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🎮</div>
              <p className="font-medium">{t('parent.dashboard.childLogin')}</p>
            </Link>
            <button
              onClick={() => {
                const parentData = localStorage.getItem('parentData');
                if (parentData) {
                  const p = JSON.parse(parentData);
                  localStorage.setItem('parentId', p.id);
                  alert(t('parent.dashboard.setupComplete', { id: p.id }));
                }
              }}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">🔑</div>
              <p className="font-medium">{t('parent.dashboard.setupChildLogin')}</p>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
