'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { assignments } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface Problem {
  id: string;
  problem_number?: number;
  question_number?: number;
  question_text: string;
  correct_answer: string;
  answer_type: string;
  options: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty?: string;
  child_answer?: string | null;
  is_correct?: number | null;
  answered_at?: string | null;
  attempts_count?: number;
  hint_purchased?: number;
  scratch_pad_image?: string | null;
}

interface AssignmentDetail {
  id: string;
  parent_id: string;
  child_id: string;
  assignment_type: 'math' | 'reading';
  title: string;
  grade_level: number;
  status: string;
  package_id: string | null;
  created_at: string;
  completed_at: string | null;
  questions: Problem[];
}

export default function AssignmentPreview() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadAssignment(token);
  }, [router, assignmentId]);

  const loadAssignment = async (token: string) => {
    try {
      const data = await assignments.get(token, assignmentId);
      setAssignment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
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

  const getAnswerStatus = (problem: Problem) => {
    if (problem.answered_at) {
      return problem.is_correct ? 'correct' : 'incorrect';
    }
    return 'unanswered';
  };

  const getAnswerStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'incorrect':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Calculate stats
  const calculateStats = () => {
    if (!assignment) return { total: 0, answered: 0, correct: 0, hintsUsed: 0, avgAttempts: 0 };
    const total = assignment.questions.length;
    const answered = assignment.questions.filter(q => q.answered_at).length;
    const correct = assignment.questions.filter(q => q.is_correct === 1).length;
    const hintsUsed = assignment.questions.filter(q => q.hint_purchased === 1).length;
    const totalAttempts = assignment.questions.reduce((sum, q) => sum + (q.attempts_count || 1), 0);
    const avgAttempts = answered > 0 ? totalAttempts / answered : 0;
    return { total, answered, correct, hintsUsed, avgAttempts };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error || t('parent.assignmentPreview.notFound')}</p>
          <Link href="/parent" className="text-purple-600 hover:underline">
            {t('parent.assignmentPreview.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent" className="text-gray-500 hover:text-gray-700">
              ← {t('common.back')}
            </Link>
            <div>
              <h1 className="text-xl font-bold">{assignment.title}</h1>
              <p className="text-sm text-gray-500">
                {t('parent.dashboard.grade', { level: assignment.grade_level })} | {t('parent.assignmentPreview.questionCount', { count: assignment.questions.length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher showLabel={false} />
            <span className="text-2xl">
              {assignment.assignment_type === 'math' ? '📐' : '📖'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              assignment.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : assignment.status === 'in_progress'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {assignment.status === 'completed'
                ? t('parent.dashboard.completed')
                : assignment.status === 'in_progress'
                ? t('parent.dashboard.inProgress')
                : t('parent.dashboard.pending')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Summary */}
        {assignment.status === 'completed' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
            <h2 className="text-lg font-bold mb-4">{t('parent.assignmentPreview.results')}</h2>
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-gray-700">{stats.total}</div>
                <div className="text-sm text-gray-500">{t('parent.assignmentPreview.totalQuestions')}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600">{stats.correct}</div>
                <div className="text-sm text-gray-500">{t('parent.assignmentPreview.correct')}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">{t('parent.assignmentPreview.score')}</div>
              </div>
              {assignment.assignment_type === 'math' && (
                <>
                  <div className="p-4 bg-yellow-50 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-600">{stats.hintsUsed}</div>
                    <div className="text-sm text-gray-500">{t('parent.assignmentPreview.hintsUsed')}</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <div className="text-3xl font-bold text-orange-600">{stats.avgAttempts.toFixed(1)}</div>
                    <div className="text-sm text-gray-500">{t('parent.assignmentPreview.avgAttempts')}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Questions Preview */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">
            {t('parent.assignmentPreview.questions')}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({t('parent.assignmentPreview.questionCount', { count: assignment.questions.length })})
            </span>
          </h2>

          <div className="space-y-4">
            {assignment.questions.map((problem, index) => {
              const answerStatus = getAnswerStatus(problem);
              return (
                <div
                  key={problem.id}
                  className={`p-4 border rounded-lg ${getAnswerStatusColor(answerStatus)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {t('parent.assignmentPreview.question', { number: index + 1 })}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {problem.difficulty && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(
                            problem.difficulty
                          )}`}
                        >
                          {t(`parent.assignmentPreview.difficulty.${problem.difficulty}`)}
                        </span>
                      )}
                      {answerStatus !== 'unanswered' && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          answerStatus === 'correct'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {answerStatus === 'correct' ? t('parent.assignmentPreview.correct') : t('parent.assignmentPreview.incorrect')}
                        </span>
                      )}
                      {problem.attempts_count && problem.attempts_count > 1 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                          {t('parent.assignmentPreview.attempts', { count: problem.attempts_count })}
                        </span>
                      )}
                      {problem.hint_purchased === 1 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                          {t('parent.assignmentPreview.usedHint')}
                        </span>
                      )}
                    </div>
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

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-green-600">
                      {t('parent.assignmentPreview.answer')}: <strong>{problem.correct_answer}</strong>
                    </span>
                    {problem.child_answer && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className={problem.is_correct ? 'text-green-600' : 'text-red-600'}>
                          {t('parent.assignmentPreview.childAnswered')}: <strong>{problem.child_answer}</strong>
                        </span>
                      </>
                    )}
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">
                      {t('parent.assignmentPreview.type')}: {problem.answer_type}
                    </span>
                  </div>

                  {problem.hint && (
                    <div className="mt-2 text-sm text-blue-600">
                      {t('parent.assignmentPreview.hint')}: {problem.hint}
                    </div>
                  )}

                  {problem.explanation && (
                    <div className="mt-2 text-sm text-gray-500">
                      {t('parent.assignmentPreview.explanation')}: {problem.explanation}
                    </div>
                  )}

                  {problem.scratch_pad_image && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-500 mb-2">
                        {t('parent.assignmentPreview.scratchPad')}:
                      </div>
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${problem.scratch_pad_image}`}
                        alt={t('parent.assignmentPreview.scratchPadAlt')}
                        className="max-w-full h-auto border rounded-lg bg-white"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
