'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { assignments } from '@/lib/api';
import { fireConfetti } from '@/components/ui/Confetti';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { useTranslation } from '@/lib/LanguageContext';

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  answer_type: string;
  options: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty?: string;
  child_answer: string | null;
  is_correct: number | null;
  answered_at?: string | null;
}

interface AssignmentData {
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
  questions: Question[];
}

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    correctAnswer?: string;
    coinsEarned: number;
    streak: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadAssignment(token);
  }, [assignmentId, router]);

  const loadAssignment = async (token: string) => {
    try {
      const data = await assignments.get(token, assignmentId);
      setAssignment(data);

      // Find first unanswered question
      const unansweredIndex = data.questions.findIndex(q => q.child_answer === null);
      if (unansweredIndex >= 0) {
        setCurrentIndex(unansweredIndex);
      } else if (data.questions.length > 0) {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Failed to load assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !assignment) return;

    const token = localStorage.getItem('childToken');
    if (!token) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const question = assignment.questions[currentIndex];
      const result = await assignments.submit(token, assignmentId, {
        questionId: question.id,
        answer: answer.trim(),
      });

      setTotalCoins(result.totalCoins);

      if (result.isCorrect) {
        fireConfetti('coins');
      }

      setFeedback({
        show: true,
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        coinsEarned: result.coinsEarned,
        streak: result.streak,
      });

      // Update local state
      const updatedQuestions = [...assignment.questions];
      updatedQuestions[currentIndex] = {
        ...question,
        child_answer: answer,
        is_correct: result.isCorrect ? 1 : 0,
      };
      setAssignment({ ...assignment, questions: updatedQuestions });

    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!assignment) return;

    setFeedback(null);
    setAnswer('');

    if (currentIndex < assignment.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
      fireConfetti('fireworks');
    }
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
        <div className="text-xl text-red-600">{t('common.error')}</div>
      </div>
    );
  }

  if (completed) {
    // Calculate score
    const correct = assignment.questions.filter(q => q.is_correct === 1).length;
    const total = assignment.questions.length;

    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">{t('assignment.completed.title')}</h1>
          <div className="text-5xl font-bold text-yellow-500 mb-4">
            {'⭐'.repeat(Math.min(correct, 5))}
          </div>
          <p className="text-xl text-gray-600 mb-6">
            {t('assignment.completed.score', { correct, total })}
          </p>

          <div className="bg-yellow-100 p-4 rounded-xl mb-6">
            <div className="text-2xl">{t('assignment.completed.coinsEarned', { coins: totalCoins })}</div>
          </div>

          <div className="space-y-2 mb-8">
            {assignment.questions.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between text-sm">
                <span>{t('assignment.completed.questionLabel', { number: i + 1 })}</span>
                <span>{q.is_correct === 1 ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/child')}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            🏠 {t('assignment.completed.backButton')}
          </button>
        </div>
      </main>
    );
  }

  const question = assignment.questions[currentIndex];
  const options = question.options ? JSON.parse(question.options) : null;
  const isMultipleChoice = question.answer_type === 'multiple_choice' || options;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {assignment.assignment_type === 'math' ? '📐' : '📖'}
            </span>
            <span className="font-semibold">{assignment.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {t('assignment.question', { current: currentIndex + 1, total: assignment.questions.length })}
            </span>
            <div className="bg-yellow-100 px-3 py-1 rounded-full text-sm">
              💰 {totalCoins}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / assignment.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto p-8">
        <div className={`bg-white p-8 rounded-2xl shadow-sm ${feedback?.show && !feedback.isCorrect ? 'animate-shake' : ''}`}>
          <div className="flex items-start gap-3 mb-8">
            <p className="text-xl flex-1">{question.question_text}</p>
            <SpeakButton
              text={question.question_text}
              lang="sv-SE"
              size="md"
              label={t('assignment.listenToQuestion')}
            />
          </div>

          {isMultipleChoice ? (
            <div className="space-y-3">
              {(options as string[]).map((option, i) => {
                const letter = option.charAt(0);
                const isSelected = answer === letter;
                const isDisabled = feedback?.show;

                return (
                  <button
                    key={i}
                    onClick={() => !isDisabled && setAnswer(letter)}
                    disabled={!!isDisabled}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isDisabled ? 'cursor-not-allowed opacity-75' : ''}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={feedback?.show}
              placeholder={t('assignment.answerPlaceholder')}
              className="w-full p-4 text-xl border-2 rounded-xl focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && !feedback?.show && handleSubmit()}
            />
          )}

          {/* Feedback */}
          {feedback?.show && (
            <div className={`mt-6 p-4 rounded-xl ${feedback.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{feedback.isCorrect ? '✅' : '❌'}</span>
                <span className="text-xl font-bold">
                  {feedback.isCorrect ? t('assignment.correct') : t('assignment.incorrect')}
                </span>
              </div>

              {feedback.isCorrect && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <span>+{feedback.coinsEarned} 💰</span>
                  {feedback.streak > 1 && (
                    <span className="fire-glow">🔥 {t('assignment.streak', { count: feedback.streak })}</span>
                  )}
                </div>
              )}

              {!feedback.isCorrect && feedback.correctAnswer && (
                <p className="text-gray-700">
                  {t('assignment.correctAnswer', { answer: feedback.correctAnswer })}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 flex gap-4">
            {!feedback?.show ? (
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || submitting}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? t('assignment.submitting') : `${t('assignment.submitButton')} →`}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                {currentIndex < assignment.questions.length - 1 ? `${t('assignment.nextButton')} →` : `${t('assignment.doneButton')} 🎉`}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
