'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { assignments } from '@/lib/api';
import { fireConfetti } from '@/components/ui/Confetti';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { useTranslation } from '@/lib/LanguageContext';
import type { SketchPadHandle } from '@/components/ui/SketchPad';

const SketchPad = dynamic(() => import('@/components/ui/SketchPad'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-100 rounded-xl animate-pulse" />
});

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
  attempts_count?: number;
  hint_purchased?: number;
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
  story_text?: string | null;
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
    // Multi-attempt fields
    attemptNumber: number;
    canRetry: boolean;
    maxAttempts: number;
    potentialReward: number;
    canBuyHint: boolean;
    hintCost: number;
    explanation?: string;
    questionComplete: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [purchasedHint, setPurchasedHint] = useState<string | null>(null);
  const [buyingHint, setBuyingHint] = useState(false);
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const sketchPadRef = useRef<SketchPadHandle>(null);

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

      // Find first incomplete question:
      // - Unanswered (child_answer === null), OR
      // - For MATH only: Wrong answer but can still retry (is_correct !== 1 AND attempts < 3)
      // Reading assignments are single-attempt, so wrong answers are NOT incomplete
      const MAX_ATTEMPTS = 3;
      const isReading = data.assignment_type === 'reading';
      const incompleteIndex = data.questions.findIndex(q =>
        q.child_answer === null ||
        (!isReading && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
      );
      if (incompleteIndex >= 0) {
        setCurrentIndex(incompleteIndex);
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

      // For math assignments: save current sketch and get all sketches for this question
      let scratchPadImages: string[] | undefined;
      if (assignment.assignment_type === 'math' && sketchPadRef.current) {
        // Save snapshot of current canvas before submitting
        sketchPadRef.current.saveSnapshot();
        // Get all sketches (including current)
        scratchPadImages = sketchPadRef.current.getAllSketches();
      }

      const result = await assignments.submit(token, assignmentId, {
        questionId: question.id,
        answer: answer.trim(),
        ...(scratchPadImages && scratchPadImages.length > 0 && { scratchPadImages }),
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
        attemptNumber: result.attemptNumber,
        canRetry: result.canRetry,
        maxAttempts: result.maxAttempts,
        potentialReward: result.potentialReward,
        canBuyHint: result.canBuyHint,
        hintCost: result.hintCost,
        explanation: result.explanation,
        questionComplete: result.questionComplete,
      });

      // Update local state
      const updatedQuestions = [...assignment.questions];
      updatedQuestions[currentIndex] = {
        ...question,
        child_answer: answer,
        is_correct: result.isCorrect ? 1 : 0,
        attempts_count: result.attemptNumber,
      };
      setAssignment({ ...assignment, questions: updatedQuestions });

    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyHint = async () => {
    const token = localStorage.getItem('childToken');
    if (!token || !assignment) return;

    setBuyingHint(true);
    try {
      const question = assignment.questions[currentIndex];
      const result = await assignments.buyHint(token, assignmentId, question.id);

      setPurchasedHint(result.hint);
      setTotalCoins(result.newBalance);

      // Update local state to mark hint as purchased
      const updatedQuestions = [...assignment.questions];
      updatedQuestions[currentIndex] = {
        ...question,
        hint_purchased: 1,
      };
      setAssignment({ ...assignment, questions: updatedQuestions });

      // Update feedback to reflect hint is no longer available
      if (feedback) {
        setFeedback({ ...feedback, canBuyHint: false });
      }
    } catch (err) {
      console.error('Failed to buy hint:', err);
    } finally {
      setBuyingHint(false);
    }
  };

  const handleRetry = () => {
    // Clear feedback but keep same question - allow retry
    setFeedback(null);
    setAnswer('');
    // Don't clear sketchpad - child might want to keep their work
  };

  const handleNext = () => {
    if (!assignment) return;

    setFeedback(null);
    setAnswer('');
    setPurchasedHint(null);

    // Reset sketch pad for new question (clears saved sketches array)
    sketchPadRef.current?.resetForNewQuestion();

    // Find next incomplete question (unanswered OR wrong with retries left for MATH only)
    // Reading assignments are single-attempt, so wrong answers are NOT incomplete
    const MAX_ATTEMPTS = 3;
    const isReading = assignment.assignment_type === 'reading';
    const nextIncompleteIndex = assignment.questions.findIndex((q, i) =>
      i > currentIndex && (
        q.child_answer === null ||
        (!isReading && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
      )
    );

    if (nextIncompleteIndex >= 0) {
      setCurrentIndex(nextIncompleteIndex);
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/child')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('common.back')}
            >
              ←
            </button>
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
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / assignment.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Story Text (for themed reading assignments) - Always visible, collapsible */}
      {assignment.assignment_type === 'reading' && assignment.story_text && (
        <div className="max-w-5xl mx-auto px-8 pt-6">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header with toggle button */}
            <button
              onClick={() => setStoryCollapsed(!storyCollapsed)}
              className="w-full flex items-center justify-between p-6 hover:bg-amber-100 transition-colors"
              aria-expanded={!storyCollapsed}
              aria-label={storyCollapsed ? t('assignment.story.show') : t('assignment.story.hide')}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <h2 className="text-xl font-bold text-amber-900">{t('assignment.story.title')}</h2>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <span className="text-sm font-medium">
                  {storyCollapsed ? t('assignment.story.showButton') : t('assignment.story.hideButton')}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${storyCollapsed ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Story content - collapsible */}
            {!storyCollapsed && (
              <div className="px-6 pb-6 prose max-w-none text-gray-800 leading-relaxed border-t border-amber-200 pt-4">
                {assignment.story_text.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-4">{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col lg:flex-row gap-6">
        <div className={`bg-white p-8 rounded-2xl shadow-sm flex-1 lg:max-w-[60%] ${feedback?.show && !feedback.isCorrect ? 'animate-shake' : ''}`}>
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
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isDisabled ? 'cursor-not-allowed opacity-75' : ''}`}
                  >
                    <span className="flex-1">{option}</span>
                    <SpeakButton
                      text={option}
                      lang="sv-SE"
                      size="sm"
                      label={t('assignment.listenToAnswer')}
                    />
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

              {/* Attempt indicator for wrong answers that can retry */}
              {!feedback.isCorrect && feedback.canRetry && (
                <div className="mt-2 text-gray-600">
                  <span>{t('assignment.attempt', { current: feedback.attemptNumber, max: feedback.maxAttempts })}</span>
                </div>
              )}

              {/* Buy Hint button */}
              {feedback.canBuyHint && !purchasedHint && (
                <button
                  onClick={handleBuyHint}
                  disabled={buyingHint || totalCoins < feedback.hintCost}
                  className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {buyingHint
                    ? t('assignment.buyingHint')
                    : t('assignment.buyHint', { cost: feedback.hintCost })}
                </button>
              )}

              {/* Purchased hint display */}
              {purchasedHint && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-semibold text-yellow-700">{t('assignment.hintLabel')}</div>
                  <p className="text-gray-700">{purchasedHint}</p>
                </div>
              )}

              {/* Show correct answer only when question is complete and wrong */}
              {!feedback.isCorrect && feedback.questionComplete && feedback.correctAnswer && (
                <p className="mt-2 text-gray-700">
                  {t('assignment.correctAnswer', { answer: feedback.correctAnswer })}
                </p>
              )}

              {/* Explanation (shown when question is complete) */}
              {feedback.questionComplete && feedback.explanation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-semibold text-blue-700">{t('assignment.explanationLabel')}</div>
                  <p className="text-gray-700">{feedback.explanation}</p>
                </div>
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
            ) : feedback.canRetry ? (
              <button
                onClick={handleRetry}
                className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                {t('assignment.tryAgain')} 🔄
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

        {/* Sketch Pad - only for math assignments */}
        {assignment.assignment_type === 'math' && (
          <div className="lg:w-[40%]">
            <SketchPad
              ref={sketchPadRef}
              height="400px"
              className="sticky top-4"
            />
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
