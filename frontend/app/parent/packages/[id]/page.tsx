'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { packages, children, admin } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

interface Problem {
  id: string;
  problem_number: number;
  question_text: string;
  correct_answer: string;
  answer_type: string;
  options: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty: string;
  lgr22_codes?: string[];
}

interface PackageDetail {
  id: string;
  name: string;
  grade_level: number;
  category_id: string | null;
  category_name: string | null;
  problem_count: number;
  difficulty_summary: string | null;
  description: string | null;
  is_global: number;
  isOwner: boolean;
  problems: Problem[];
}

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
  parent_name?: string;
  parent_id?: string;
}

export default function PackagePreview() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const packageId = params.id as string;

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign state
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [hintsAllowed, setHintsAllowed] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadData(token);
  }, [router, packageId]);

  const loadData = async (token: string) => {
    try {
      // Check if user is admin
      const parentData = localStorage.getItem('parentData');
      const isAdmin = parentData ? JSON.parse(parentData).isAdmin : false;

      // Admin users see all children, regular users see only their own
      const [packageData, childrenData] = await Promise.all([
        packages.get(token, packageId),
        isAdmin ? admin.listChildren(token) : children.list(token),
      ]);

      setPkg(packageData);
      setChildrenList(childrenData.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade_level: c.grade_level,
        parent_name: c.parent_name,
        parent_id: c.parent_id
      })));
      setCustomTitle(packageData.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.packagePreview.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedChild || !pkg) return;

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setAssigning(true);
    setError(null);

    try {
      await packages.assign(token, packageId, {
        childId: selectedChild,
        title: customTitle || pkg.name,
        hintsAllowed,
      });
      setAssignSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.packagePreview.errors.assignFailed'));
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setDeleting(true);
    try {
      await packages.delete(token, packageId);
      router.push('/parent/packages');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.packagePreview.errors.deleteFailed'));
      setDeleting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('parent.packagePreview.loading')}</div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error || t('parent.packagePreview.notFound')}</p>
          <Link href="/parent/packages" className="text-purple-600 hover:underline">
            {t('parent.packagePreview.backToPackages')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent/packages" className="text-gray-500 hover:text-gray-700">
              &larr; {t('common.back')}
            </Link>
            <div>
              <h1 className="text-xl font-bold">{pkg.name}</h1>
              <p className="text-sm text-gray-500">
                {t('parent.packagePreview.grade', { grade: pkg.grade_level })} | {t('parent.packagePreview.problems', { count: pkg.problem_count })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pkg.is_global ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {t('parent.packagePreview.global')}
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {t('parent.packagePreview.private')}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {assignSuccess ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center mb-6">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-xl font-bold text-green-600 mb-4">{t('parent.packagePreview.assignmentCreated')}</p>
            <p className="text-gray-600 mb-6">
              {t('parent.packagePreview.assignedTo', { childName: childrenList.find((c) => c.id === selectedChild)?.name || '' })}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setAssignSuccess(false);
                  setSelectedChild('');
                }}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
              >
                {t('parent.packagePreview.assignAnother')}
              </button>
              <Link
                href="/parent"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
              >
                {t('parent.packagePreview.backToDashboard')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Assign Section */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-6">
                <h2 className="text-lg font-bold mb-4">{t('parent.packagePreview.assignToChild')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('parent.packagePreview.selectChild')}
                    </label>
                    <select
                      value={selectedChild}
                      onChange={(e) => setSelectedChild(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">{t('parent.packagePreview.chooseChild')}</option>
                      {childrenList.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name} ({t('parent.packagePreview.grade', { grade: child.grade_level })})
                          {child.parent_name && ` - ${t('parent.packagePreview.gradeWithParent', { grade: child.grade_level, parent: child.parent_name })}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('parent.packagePreview.assignmentTitle')}
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={pkg.name}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('parent.packagePreview.allowHints')}
                      </label>
                      <p className="text-xs text-gray-500">
                        {t('parent.packagePreview.allowHintsDescription')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHintsAllowed(!hintsAllowed)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        hintsAllowed ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hintsAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={handleAssign}
                    disabled={!selectedChild || assigning}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? t('parent.packagePreview.assigning') : t('parent.packagePreview.assignPackage')}
                  </button>
                </div>

                {pkg.isOwner && (
                  <div className="mt-6 pt-6 border-t">
                    {showDeleteConfirm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          {t('parent.packagePreview.deleteConfirm')}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleting ? t('parent.packagePreview.deleting') : t('parent.packagePreview.yesDelete')}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                      >
                        {t('parent.packagePreview.deletePackage')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Problems Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4">
                  {t('parent.packagePreview.problemsPreview')}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {t('parent.packagePreview.questionsCount', { count: pkg.problems.length })}
                  </span>
                </h2>

                <div className="space-y-4">
                  {pkg.problems.map((problem, index) => (
                    <div
                      key={problem.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          {t('parent.packagePreview.question', { number: index + 1 })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(
                            problem.difficulty
                          )}`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>

                      <p className="text-gray-800 mb-3">{problem.question_text}</p>

                      {problem.answer_type === 'multiple_choice' && problem.options && (
                        <div className="mb-3 pl-4 space-y-1">
                          {JSON.parse(problem.options).map((option: string, i: number) => (
                            <div key={i} className="text-sm text-gray-600">
                              {option}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          {t('parent.packagePreview.answer')} <strong>{problem.correct_answer}</strong>
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">
                          {t('parent.packagePreview.type')} {problem.answer_type}
                        </span>
                      </div>

                      {problem.hint && (
                        <div className="mt-2 text-sm text-blue-600">
                          {t('parent.packagePreview.hint')} {problem.hint}
                        </div>
                      )}

                      {problem.explanation && (
                        <div className="mt-2 text-sm text-gray-500">
                          {t('parent.packagePreview.explanation')} {problem.explanation}
                        </div>
                      )}

                      {problem.lgr22_codes && problem.lgr22_codes.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs font-medium text-gray-500 mb-1">LGR22 Objectives:</div>
                          <div className="flex flex-wrap gap-1">
                            {problem.lgr22_codes.map((code, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
