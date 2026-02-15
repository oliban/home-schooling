'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { assignments } from '@/lib/api';
import { fireConfetti } from '@/components/ui/Confetti';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { useTranslation, useLanguage } from '@/lib/LanguageContext';
import type { SketchPadHandle } from '@/components/ui/SketchPad';

const SketchPad = dynamic(() => import('@/components/ui/SketchPad'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-sunset-cream rounded-xl animate-pulse" />
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
  requires_sketch?: number;  // 0 = false, 1 = true (SQLite integer)
}

interface AssignmentData {
  id: string;
  parent_id: string;
  child_id: string;
  assignment_type: 'math' | 'reading' | 'english';
  title: string;
  grade_level: number;
  status: string;
  package_id: string | null;
  created_at: string;
  completed_at: string | null;
  questions: Question[];
  story_text?: string | null;
}

// Check if a question is valid and can be answered
function isQuestionAnswerable(question: Question): boolean {
  if (question.answer_type === 'multiple_choice') {
    // Multiple choice requires valid options array with at least 2 items
    if (!question.options) return false;
    try {
      const options = JSON.parse(question.options);
      return Array.isArray(options) && options.length >= 2;
    } catch {
      return false;
    }
  }
  // Other answer types (number, text) are always answerable
  return true;
}

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { locale } = useLanguage();
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
  const [sessionCoinsEarned, setSessionCoinsEarned] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [purchasedHint, setPurchasedHint] = useState<string | null>(null);
  const [buyingHint, setBuyingHint] = useState(false);
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const [hasSketchContent, setHasSketchContent] = useState(false);
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

      // Find first incomplete AND answerable question:
      // - Must be answerable (valid question structure)
      // - Unanswered (child_answer === null), OR
      // - For MATH and ENGLISH: Wrong answer but can still retry (is_correct !== 1 AND attempts < 3)
      // Reading assignments are single-attempt, so wrong answers are NOT incomplete
      // Corrupted questions (e.g., multiple_choice without options) are skipped automatically
      const MAX_ATTEMPTS = 3;
      // Math and English support multiple attempts, Reading is single-attempt
      const supportsMultipleAttempts = data.assignment_type !== 'reading';
      const incompleteIndex = data.questions.findIndex(q =>
        isQuestionAnswerable(q) && (
          q.child_answer === null ||
          (supportsMultipleAttempts && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
        )
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
      setSessionCoinsEarned(prev => prev + result.coinsEarned);

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

    // Find next incomplete AND answerable question (unanswered OR wrong with retries left for MATH and ENGLISH)
    // Reading assignments are single-attempt, so wrong answers are NOT incomplete
    // Corrupted questions (e.g., multiple_choice without options) are skipped automatically
    const MAX_ATTEMPTS = 3;
    // Math and English support multiple attempts, Reading is single-attempt
    const supportsMultipleAttempts = assignment.assignment_type !== 'reading';
    const nextIncompleteIndex = assignment.questions.findIndex((q, i) =>
      i > currentIndex && isQuestionAnswerable(q) && (
        q.child_answer === null ||
        (supportsMultipleAttempts && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-cream to-white">
        <div className="text-xl font-display text-sunset-twilight">{t('common.loading')}</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-cream to-white">
        <div className="text-xl text-sunset-coral">{t('common.error')}</div>
      </div>
    );
  }

  if (completed) {
    // Calculate score (only count answerable questions)
    const answerableQuestions = assignment.questions.filter(isQuestionAnswerable);
    const correct = answerableQuestions.filter(q => q.is_correct === 1).length;
    const total = answerableQuestions.length;

    return (
      <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-card-warm max-w-md w-full text-center">
          <div className="text-6xl mb-4 animate-float">🎉</div>
          <h1 className="text-3xl font-display font-bold text-sunset-twilight mb-2">{t('assignment.completed.title')}</h1>
          <div className="text-5xl font-bold text-sunset-gold mb-4">
            {'⭐'.repeat(Math.min(correct, 5))}
          </div>
          <p className="text-xl text-sunset-twilight/70 mb-6">
            {t('assignment.completed.score', { correct, total })}
          </p>

          <div className="bg-gradient-to-r from-sunset-amber/30 to-sunset-gold/30 p-4 rounded-xl mb-6">
            <div className="text-2xl font-display text-sunset-twilight">{t('assignment.completed.coinsEarned', { coins: sessionCoinsEarned })} 💰</div>
          </div>

          <div className="space-y-2 mb-8">
            {answerableQuestions.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between text-sm text-sunset-twilight/80">
                <span>{t('assignment.completed.questionLabel', { number: i + 1 })}</span>
                <span>{q.is_correct === 1 ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/child')}
            className="w-full py-3 bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral text-white rounded-xl font-display font-semibold hover:from-sunset-amber hover:via-sunset-gold hover:to-sunset-tangerine transition-all shadow-md hover:shadow-lg"
          >
            🏠 {t('assignment.completed.backButton')}
          </button>
        </div>
      </main>
    );
  }

  const question = assignment.questions[currentIndex];
  const options = question.options ? JSON.parse(question.options) : null;
  const isMultipleChoice = question.answer_type === 'multiple_choice' && options;

  // Determine speech language based on assignment type and UI locale
  // - Math and reading: always Swedish (content is in Swedish)
  // - English: matches UI locale (Swedish UI = Swedish instructions, English UI = English instructions)
  const speechLang = assignment.assignment_type === 'english'
    ? (locale === 'en' ? 'en-US' : 'sv-SE')
    : 'sv-SE';

  return (
    <main className="min-h-screen bg-gradient-to-b from-sunset-cream via-sunset-peach/20 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral shadow-md p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/child')}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title={t('common.back')}
            >
              ←
            </button>
            <span className="text-2xl">
              {assignment.assignment_type === 'math' ? '📐' : assignment.assignment_type === 'reading' ? '📖' : '🇬🇧'}
            </span>
            <span className="font-display font-semibold text-white">{assignment.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">
              {t('assignment.question', { current: currentIndex + 1, total: assignment.questions.length })}
            </span>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white font-medium">
              💰 {totalCoins}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="h-2 bg-sunset-peach/50 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-sunset-gold to-sunset-tangerine rounded-full transition-all"
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
        <div className={`bg-white p-8 rounded-2xl shadow-card-warm flex-1 lg:max-w-[60%] ${feedback?.show && !feedback.isCorrect ? 'animate-shake' : ''}`}>
          <div className="flex items-start gap-3 mb-8">
            <p className="text-xl flex-1 text-sunset-twilight">{question.question_text}</p>
            <SpeakButton
              text={question.question_text}
              lang={speechLang}
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
                  <div
                    key={i}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => !isDisabled && setAnswer(letter)}
                    onKeyDown={(e) => {
                      if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setAnswer(letter);
                      }
                    }}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-sunset-tangerine bg-sunset-amber/20'
                        : 'border-sunset-peach hover:border-sunset-tangerine/50'
                    } ${isDisabled ? 'cursor-not-allowed opacity-75 pointer-events-none' : ''}`}
                  >
                    <span className="flex-1 text-sunset-twilight">{option}</span>
                    <SpeakButton
                      text={option}
                      lang={speechLang}
                      size="sm"
                      label={t('assignment.listenToAnswer')}
                    />
                  </div>
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
              className="w-full p-4 text-xl border-2 border-sunset-peach rounded-xl focus:border-sunset-tangerine focus:outline-none text-sunset-twilight placeholder:text-sunset-twilight/40"
              onKeyDown={(e) => e.key === 'Enter' && !feedback?.show && handleSubmit()}
            />
          )}

          {/* Feedback */}
          {feedback?.show && (
            <div className={`mt-6 p-4 rounded-xl ${feedback.isCorrect ? 'bg-green-100' : 'bg-sunset-coral/10'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{feedback.isCorrect ? '✅' : '❌'}</span>
                <span className="text-xl font-display font-bold text-sunset-twilight">
                  {feedback.isCorrect ? t('assignment.correct') : t('assignment.incorrect')}
                </span>
              </div>

              {feedback.isCorrect && (
                <div className="flex items-center gap-2 text-sunset-gold font-medium">
                  <span>+{feedback.coinsEarned} 💰</span>
                  {feedback.streak > 1 && (
                    <span className="fire-glow">🔥 {t('assignment.streak', { count: feedback.streak })}</span>
                  )}
                </div>
              )}

              {/* Attempt indicator for wrong answers that can retry */}
              {!feedback.isCorrect && feedback.canRetry && (
                <div className="mt-2 text-sunset-twilight/70">
                  <span>{t('assignment.attempt', { current: feedback.attemptNumber, max: feedback.maxAttempts })}</span>
                </div>
              )}

              {/* Buy Hint button */}
              {feedback.canBuyHint && !purchasedHint && (
                <button
                  onClick={handleBuyHint}
                  disabled={buyingHint || totalCoins < feedback.hintCost}
                  className="mt-3 px-4 py-2 bg-sunset-amber text-white rounded-lg hover:bg-sunset-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {buyingHint
                    ? t('assignment.buyingHint')
                    : t('assignment.buyHint', { cost: feedback.hintCost })}
                </button>
              )}

              {/* Purchased hint display */}
              {purchasedHint && (
                <div className="mt-3 p-3 bg-sunset-amber/20 border border-sunset-gold/30 rounded-lg">
                  <div className="font-semibold text-sunset-gold">{t('assignment.hintLabel')}</div>
                  <p className="text-sunset-twilight">{purchasedHint}</p>
                </div>
              )}

              {/* Show correct answer only when question is complete and wrong */}
              {!feedback.isCorrect && feedback.questionComplete && feedback.correctAnswer && (
                <p className="mt-2 text-sunset-twilight/80">
                  {t('assignment.correctAnswer', { answer: feedback.correctAnswer })}
                </p>
              )}

              {/* Explanation (shown when question is complete) */}
              {feedback.questionComplete && feedback.explanation && (
                <div className="mt-3 p-3 bg-sunset-peach/30 border border-sunset-peach rounded-lg">
                  <div className="font-semibold text-sunset-tangerine">{t('assignment.explanationLabel')}</div>
                  <p className="text-sunset-twilight">{feedback.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 flex flex-col gap-2">
            {/* Sketch requirement message */}
            {!feedback?.show && question.requires_sketch === 1 && !hasSketchContent && (
              <p className="text-center text-sunset-tangerine font-medium">
                {t('assignment.sketchRequired')}
              </p>
            )}
            <div className="flex gap-4">
            {!feedback?.show ? (
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || submitting || (question.requires_sketch === 1 && !hasSketchContent)}
                className="flex-1 py-4 bg-gradient-to-r from-sunset-gold via-sunset-tangerine to-sunset-coral text-white rounded-xl font-display font-semibold hover:from-sunset-amber hover:via-sunset-gold hover:to-sunset-tangerine disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {submitting
                  ? t('assignment.submitting')
                  : question.requires_sketch === 1 && !hasSketchContent
                    ? t('assignment.sketchFirst')
                    : `${t('assignment.submitButton')} →`}
              </button>
            ) : feedback.canRetry ? (
              <button
                onClick={handleRetry}
                className="flex-1 py-4 bg-sunset-tangerine text-white rounded-xl font-display font-semibold hover:bg-sunset-coral transition-colors shadow-md"
              >
                {t('assignment.tryAgain')} 🔄
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-display font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
              >
                {currentIndex < assignment.questions.length - 1 ? `${t('assignment.nextButton')} →` : `${t('assignment.doneButton')} 🎉`}
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Sketch Pad - only for math assignments */}
        {assignment.assignment_type === 'math' && (
          <div className="lg:w-[40%]">
            <SketchPad
              ref={sketchPadRef}
              height="400px"
              className="sticky top-4"
              onContentChange={setHasSketchContent}
            />
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
