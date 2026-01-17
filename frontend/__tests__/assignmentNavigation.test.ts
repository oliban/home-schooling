/**
 * Tests for assignment navigation logic
 *
 * These tests verify the logic for finding incomplete questions:
 * - Unanswered questions (child_answer === null)
 * - For MATH: Wrong answers with retries remaining (is_correct !== 1 && attempts < 3)
 * - For READING: Only unanswered questions count as incomplete (single attempt)
 */

import { describe, it, expect } from 'vitest';

interface Question {
  id: string;
  child_answer: string | null;
  is_correct: number | null;
  attempts_count?: number;
  answer_type?: string;
  options?: string | null;
}

const MAX_ATTEMPTS = 3;

/**
 * Check if a question is valid and can be answered
 * Multiple choice questions require valid options array with at least 2 items
 * Other answer types (number, text) are always answerable
 */
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

/**
 * Find the first incomplete question index for MATH assignments
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
 * Find the first incomplete question index, considering assignment type
 * For READING: only unanswered questions are incomplete (no retries)
 */
function findIncompleteQuestionIndexWithType(questions: Question[], isReading: boolean): number {
  return questions.findIndex(q =>
    q.child_answer === null ||
    (!isReading && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
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

/**
 * Find the next incomplete question index, considering assignment type
 */
function findNextIncompleteQuestionIndexWithType(questions: Question[], currentIndex: number, isReading: boolean): number {
  return questions.findIndex((q, i) =>
    i > currentIndex && (
      q.child_answer === null ||
      (!isReading && q.is_correct !== 1 && (q.attempts_count || 0) < MAX_ATTEMPTS)
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

  describe('Reading Assignment Navigation (single attempt)', () => {
    it('should treat wrong answers as complete for reading assignments', () => {
      const questions: Question[] = [
        { id: '1', child_answer: 'A', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'B', is_correct: 0, attempts_count: 1 }, // wrong, but complete for reading
        { id: '3', child_answer: null, is_correct: null },
      ];

      // Math: Q2 has retries left, so it's incomplete
      expect(findIncompleteQuestionIndexWithType(questions, false)).toBe(1);

      // Reading: Q2 is answered (even if wrong), so only Q3 is incomplete
      expect(findIncompleteQuestionIndexWithType(questions, true)).toBe(2);
    });

    it('should complete reading assignment when all questions answered, even if wrong', () => {
      const questions: Question[] = [
        { id: '1', child_answer: 'B', is_correct: 0, attempts_count: 1 },
        { id: '2', child_answer: 'C', is_correct: 0, attempts_count: 1 },
        { id: '3', child_answer: 'A', is_correct: 0, attempts_count: 1 },
      ];

      // Math: all wrong with retries, so first is incomplete
      expect(findIncompleteQuestionIndexWithType(questions, false)).toBe(0);

      // Reading: all answered, so assignment is complete
      expect(findIncompleteQuestionIndexWithType(questions, true)).toBe(-1);
    });

    it('should find next unanswered question for reading, ignoring wrong answers', () => {
      const questions: Question[] = [
        { id: '1', child_answer: 'B', is_correct: 0, attempts_count: 1 }, // current, just answered wrong
        { id: '2', child_answer: 'C', is_correct: 0, attempts_count: 1 }, // also wrong
        { id: '3', child_answer: null, is_correct: null }, // unanswered
      ];

      // Math: Q1 has retries, but we're looking for next after index 0
      expect(findNextIncompleteQuestionIndexWithType(questions, 0, false)).toBe(1);

      // Reading: skip Q1 and Q2 (both answered), go to Q3
      expect(findNextIncompleteQuestionIndexWithType(questions, 0, true)).toBe(2);
    });

    it('should handle Nils bug: reading assignment not completing with wrong answers', () => {
      // Nils answered all 5 Harry Potter questions, some wrong
      const questions: Question[] = [
        { id: '1', child_answer: 'C', is_correct: 1, attempts_count: 1 },
        { id: '2', child_answer: 'B', is_correct: 0, attempts_count: 1 }, // wrong
        { id: '3', child_answer: 'D', is_correct: 0, attempts_count: 1 }, // wrong
        { id: '4', child_answer: 'A', is_correct: 1, attempts_count: 1 },
        { id: '5', child_answer: 'B', is_correct: 1, attempts_count: 1 },
      ];

      // For reading: all answered, should complete (-1)
      expect(findIncompleteQuestionIndexWithType(questions, true)).toBe(-1);

      // For math: Q2 has retries (wrong, 1 attempt), so incomplete
      expect(findIncompleteQuestionIndexWithType(questions, false)).toBe(1);
    });
  });

  describe('isQuestionAnswerable - Corrupted Question Handling', () => {
    it('should return true for number answer type questions', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'number',
        options: null,
      };
      expect(isQuestionAnswerable(question)).toBe(true);
    });

    it('should return true for text answer type questions', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'text',
        options: null,
      };
      expect(isQuestionAnswerable(question)).toBe(true);
    });

    it('should return true for multiple_choice with valid options', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: JSON.stringify(['A: Yes', 'B: No']),
      };
      expect(isQuestionAnswerable(question)).toBe(true);
    });

    it('should return true for multiple_choice with 4 options', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: JSON.stringify(['A: Option A', 'B: Option B', 'C: Option C', 'D: Option D']),
      };
      expect(isQuestionAnswerable(question)).toBe(true);
    });

    it('should return false for multiple_choice with null options', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: null,
      };
      expect(isQuestionAnswerable(question)).toBe(false);
    });

    it('should return false for multiple_choice with empty array', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: JSON.stringify([]),
      };
      expect(isQuestionAnswerable(question)).toBe(false);
    });

    it('should return false for multiple_choice with only one option', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: JSON.stringify(['A: Only option']),
      };
      expect(isQuestionAnswerable(question)).toBe(false);
    });

    it('should return false for multiple_choice with invalid JSON', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: 'not valid json',
      };
      expect(isQuestionAnswerable(question)).toBe(false);
    });

    it('should return false for multiple_choice with "null" string', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
        answer_type: 'multiple_choice',
        options: 'null',
      };
      expect(isQuestionAnswerable(question)).toBe(false);
    });

    it('should return true for questions without answer_type (defaults to answerable)', () => {
      const question: Question = {
        id: '1',
        child_answer: null,
        is_correct: null,
      };
      expect(isQuestionAnswerable(question)).toBe(true);
    });

    it('should skip corrupted questions when finding incomplete', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1, answer_type: 'number' },
        { id: '2', child_answer: null, is_correct: null, answer_type: 'multiple_choice', options: null }, // corrupted
        { id: '3', child_answer: null, is_correct: null, answer_type: 'number' }, // valid incomplete
      ];

      // Find first incomplete AND answerable
      const incompleteIndex = questions.findIndex(q =>
        isQuestionAnswerable(q) && q.child_answer === null
      );

      // Should skip Q2 (corrupted) and find Q3
      expect(incompleteIndex).toBe(2);
    });

    it('should mark assignment complete if only corrupted questions remain', () => {
      const questions: Question[] = [
        { id: '1', child_answer: '10', is_correct: 1, attempts_count: 1, answer_type: 'number' },
        { id: '2', child_answer: null, is_correct: null, answer_type: 'multiple_choice', options: null }, // corrupted
        { id: '3', child_answer: null, is_correct: null, answer_type: 'multiple_choice', options: '[]' }, // also corrupted
      ];

      // Find first incomplete AND answerable
      const incompleteIndex = questions.findIndex(q =>
        isQuestionAnswerable(q) && q.child_answer === null
      );

      // No valid incomplete questions, should complete
      expect(incompleteIndex).toBe(-1);
    });
  });
});
