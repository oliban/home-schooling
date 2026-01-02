/**
 * Text answer normalization tests
 * Tests for coordinate formatting and other text answer variations
 */

import { describe, it, expect } from 'vitest';

// Helper function (same logic as in assignments.ts)
function normalizeTextAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')      // Remove all whitespace
    .replace(/[()]/g, '')     // Remove parentheses (for coordinates)
    .replace(/,/g, '.');      // Replace commas with periods (for coordinates like "7,9" vs "7.9")
}

describe('Text Answer Normalization', () => {
  describe('Coordinate formatting', () => {
    it('should accept "7,9" as equivalent to "(7, 9)"', () => {
      const correctAnswer = '(7, 9)';
      const childAnswer = '7,9';

      expect(normalizeTextAnswer(childAnswer)).toBe(normalizeTextAnswer(correctAnswer));
    });

    it('should accept various coordinate formats', () => {
      const correctAnswer = '(7, 9)';
      const validAnswers = [
        '7,9',
        '(7,9)',
        '7.9',
        '(7.9)',
        '7, 9',
        '(7, 9)',
        '( 7 , 9 )',
        ' (7, 9) ',
      ];

      validAnswers.forEach(answer => {
        expect(normalizeTextAnswer(answer)).toBe(normalizeTextAnswer(correctAnswer));
      });
    });

    it('should reject incorrect coordinates', () => {
      const correctAnswer = '(7, 9)';
      const wrongAnswers = [
        '7,8',
        '(8,9)',
        '9,7',
        '(7, 10)',
      ];

      wrongAnswers.forEach(answer => {
        expect(normalizeTextAnswer(answer)).not.toBe(normalizeTextAnswer(correctAnswer));
      });
    });

    it('should handle coordinates with different spacing', () => {
      const correctAnswer = '(5, 6)';
      expect(normalizeTextAnswer('5,6')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('(5,6)')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('( 5 , 6 )')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('  5  ,  6  ')).toBe(normalizeTextAnswer(correctAnswer));
    });

    it('should handle period vs comma as separator', () => {
      const correctWithComma = '(7, 9)';
      const correctWithPeriod = '(7. 9)';

      // Both should normalize to "7.9"
      expect(normalizeTextAnswer(correctWithComma)).toBe('7.9');
      expect(normalizeTextAnswer(correctWithPeriod)).toBe('7.9');
      expect(normalizeTextAnswer('7,9')).toBe('7.9');
      expect(normalizeTextAnswer('7.9')).toBe('7.9');
    });
  });

  describe('Regular text answers', () => {
    it('should handle case-insensitive matching', () => {
      const correctAnswer = 'Stockholm';
      expect(normalizeTextAnswer('stockholm')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('STOCKHOLM')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('StOcKhOlM')).toBe(normalizeTextAnswer(correctAnswer));
    });

    it('should trim whitespace', () => {
      const correctAnswer = 'answer';
      expect(normalizeTextAnswer('  answer  ')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('answer ')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer(' answer')).toBe(normalizeTextAnswer(correctAnswer));
    });

    it('should remove internal whitespace', () => {
      const correctAnswer = 'two words';
      expect(normalizeTextAnswer('twowords')).toBe(normalizeTextAnswer(correctAnswer));
      expect(normalizeTextAnswer('two  words')).toBe(normalizeTextAnswer(correctAnswer));
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(normalizeTextAnswer('')).toBe('');
      expect(normalizeTextAnswer('   ')).toBe('');
    });

    it('should handle single characters', () => {
      expect(normalizeTextAnswer('A')).toBe('a');
      expect(normalizeTextAnswer('5')).toBe('5');
    });

    it('should handle numbers', () => {
      expect(normalizeTextAnswer('123')).toBe('123');
      expect(normalizeTextAnswer('  123  ')).toBe('123');
    });
  });
});
