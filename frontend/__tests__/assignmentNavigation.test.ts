/**
 * Tests for assignment navigation logic
 *
 * These tests verify the logic for finding incomplete questions:
 * - Unanswered questions (child_answer === null)
 * - Wrong answers with retries remaining (is_correct !== 1 && attempts < 3)
 */

import { describe, it, expect } from 'vitest';

interface Question {
  id: string;
  child_answer: string | null;
  is_correct: number | null;
  attempts_count?: number;
}

const MAX_ATTEMPTS = 3;

/**
 * Find the first incomplete question index
 * A question is incomplete if:
 * - It has no answer (child_answer === null), OR
 * - It's wrong (is_correct !== 1) AND has retries left (attempts < 3)
 */
function findIncompleteQuestionIndex(questions: Question[]): number {
  return questions.findIndex(q =>
    q.child_answer === null ||
    (q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
  );
}

/**
 * Find the next incomplete question index after the current index
 */
function findNextIncompleteQuestionIndex(questions: Question[], currentIndex: number): number {
  return questions.findIndex((q, i) =>
    i > currentIndex && (
      q.child_answer === null ||
      (q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
    )
  );
}

describe('Assignment Navigation Logic', () => {
  describe('findIncompleteQuestionIndex', () => {
    it('should return -1 when all questions are correct', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: '20', is_correct: 1, attempts_count: 1 },
        { id: '3', child_answer: '30', is_correct: 1, attempts_count: 2 },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(-1);
    });

    it('should return index of first unanswered question', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: null, is_correct: null },
        { id: '3', child_answer: null, is_correct: null },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(1);
    });

    it('should return index of wrong answer with retries remaining', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'wrong', is_correct: 0, attempts_count: 2 }, // 1 retry left
        { id: '3', child_answer: '30', is_correct: 1, attempts_count: 1 },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(1);
    });

    it('should skip wrong answers that exhausted all retries', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'wrong', is_correct: 0, attempts_count: 3 }, // no retries left
        { id: '3', child_answer: null, is_correct: null },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(2);
    });

    it('should return -1 when all wrong answers exhausted retries', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'wrong', is_correct: 0, attempts_count: 3 },
        { id: '3', child_answer: 'also wrong', is_correct: 0, attempts_count: 3 },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(-1);
    });

    it('should handle questions with no attempts_count (defaults to 0)', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'wrong', is_correct: 0 }, // no attempts_count, should default to 0
        { id: '3', child_answer: '30', is_correct: 1, attempts_count: 1 },
      ];
      expect(findIncompleteQuestionIndex(questions)).toBe(1);
    });
  });

  describe('findNextIncompleteQuestionIndex', () => {
    it('should find next incomplete question after current index', () => {
      const questions: Question[] = [
        { id: '1', child_answer: null, is_correct: null },
        { id: '2', child_answer: '20', is_correct: 1, attempts_count: 1 },
        { id: '3', child_answer: null, is_correct: null },
      ];
      expect(findNextIncompleteQuestionIndex(questions, 0)).toBe(2);
    });

    it('should return -1 when no incomplete questions after current', () => {
      const questions: Question[] = [
        { id: '1', child_answer: null, is_correct: null },
        { id: '2', child_answer: '20', is_correct: 1, attempts_count: 1 },
        { id: '3', child_answer: '30', is_correct: 1, attempts_count: 1 },
      ];
      expect(findNextIncompleteQuestionIndex(questions, 0)).toBe(-1);
    });

    it('should skip already-complete questions when finding next', () => {
      const questions: Question[] = [
        { id: '1', child_answer: 'wrong', is_correct: 0, attempts_count: 2 }, // current, just answered
        { id: '2', child_answer: '20', is_correct: 1, attempts_count: 1 }, // complete
        { id: '3', child_answer: '30', is_correct: 1, attempts_count: 1 }, // complete
        { id: '4', child_answer: 'wrong', is_correct: 0, attempts_count: 1 }, // incomplete - has retries
      ];
      expect(findNextIncompleteQuestionIndex(questions, 0)).toBe(3);
    });

    it('should return -1 when remaining questions are wrong but exhausted retries', () => {
      const questions: Question[] = [
        { id: '1', child_answer: 'wrong', is_correct: 0, attempts_count: 3 },
        { id: '2', child_answer: '20', is_correct: 1, attempts_count: 1 },
        { id: '3', child_answer: 'wrong', is_correct: 0, attempts_count: 3 },
      ];
      expect(findNextIncompleteQuestionIndex(questions, 0)).toBe(-1);
    });

    it('should handle the real bug scenario: all answered but one has retries', () => {
      // This is Harry's scenario: 10 questions, all answered, but Q3 was wrong with 2 attempts
      const questions: Question[] = [
        { id: '1', child_answer: '30', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'd', is_correct: 0, attempts_count: 3 },
        { id: '3', child_answer: '56', is_correct: 0, attempts_count: 2 }, // wrong, 1 retry left
        { id: '4', child_answer: '35', is_correct: 1, attempts_count: 1 },
        { id: '5', child_answer: '8', is_correct: 1, attempts_count: 2 },
        { id: '6', child_answer: '135', is_correct: 1, attempts_count: 1 },
        { id: '7', child_answer: 'C', is_correct: 1, attempts_count: 1 },
        { id: '8', child_answer: '95', is_correct: 1, attempts_count: 1 },
        { id: '9', child_answer: '6', is_correct: 1, attempts_count: 1 },
        { id: '10', child_answer: 'B', is_correct: 1, attempts_count: 1 },
      ];

      // On page load, should go to Q3 (index 2)
      expect(findIncompleteQuestionIndex(questions)).toBe(2);

      // After answering Q3, should show summary (no more incomplete)
      questions[2] = { id: '3', child_answer: 'w', is_correct: 0, attempts_count: 3 };
      expect(findNextIncompleteQuestionIndex(questions, 2)).toBe(-1);
    });
  });
});
