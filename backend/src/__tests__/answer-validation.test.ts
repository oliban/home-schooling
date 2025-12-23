/**
 * Answer validation tests
 * Tests for: coordinate formatting, number normalization, various answer formats
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Helper function to test normalization (same logic as in assignments.ts)
function normalizeAnswer(val: string): string {
  return val.trim()
    .toLowerCase()
    .replace(/\s+/g, '')      // Remove all whitespace
    .replace(/[()]/g, '')     // Remove parentheses
    .replace(/,/g, '.')       // Replace all commas with periods
    .replace(/%/g, '');       // Remove percentage signs
}

describe('Answer Validation', () => {
  describe('Normalization Function', () => {
    it('should normalize coordinate with parentheses "(5,6)" to "5.6"', () => {
      expect(normalizeAnswer('(5,6)')).toBe('5.6');
    });

    it('should normalize coordinate without parentheses "5,6" to "5.6"', () => {
      expect(normalizeAnswer('5,6')).toBe('5.6');
    });

    it('should normalize coordinate with spaces "5, 6" to "5.6"', () => {
      expect(normalizeAnswer('5, 6')).toBe('5.6');
    });

    it('should normalize coordinate with spaces and parentheses "(5, 6)" to "5.6"', () => {
      expect(normalizeAnswer('(5, 6)')).toBe('5.6');
    });

    it('should normalize coordinate with period "5.6" to "5.6"', () => {
      expect(normalizeAnswer('5.6')).toBe('5.6');
    });

    it('should normalize decimal with comma "3,5" to "3.5"', () => {
      expect(normalizeAnswer('3,5')).toBe('3.5');
    });

    it('should normalize percentage "50%" to "50"', () => {
      expect(normalizeAnswer('50%')).toBe('50');
    });

    it('should trim leading and trailing spaces "  10  " to "10"', () => {
      expect(normalizeAnswer('  10  ')).toBe('10');
    });

    it('should handle multiple spaces in coordinates "( 5 , 6 )" to "5.6"', () => {
      expect(normalizeAnswer('( 5 , 6 )')).toBe('5.6');
    });
  });

  describe('Coordinate Answer Matching', () => {
    it('should match coordinates in different formats', () => {
      const correctAnswer = '(5,6)';
      const childAnswers = ['5,6', '(5,6)', '5.6', '(5.6)', '5, 6', '(5, 6)', '( 5 , 6 )'];

      childAnswers.forEach(answer => {
        expect(normalizeAnswer(answer)).toBe(normalizeAnswer(correctAnswer));
      });
    });

    it('should not match incorrect coordinates', () => {
      const correctAnswer = '(5,6)';
      const wrongAnswers = ['4,6', '(4,6)', '5,7'];

      wrongAnswers.forEach(answer => {
        expect(normalizeAnswer(answer)).not.toBe(normalizeAnswer(correctAnswer));
      });
    });
  });

  describe('Number Answer Matching', () => {
    it('should match numbers with different decimal separators', () => {
      const correctAnswer = '3.5';
      expect(normalizeAnswer('3,5')).toBe(normalizeAnswer(correctAnswer));
      expect(normalizeAnswer('3.5')).toBe(normalizeAnswer(correctAnswer));
    });

    it('should match percentages with and without % sign', () => {
      const correctAnswer = '50';
      expect(normalizeAnswer('50%')).toBe(normalizeAnswer(correctAnswer));
      expect(normalizeAnswer('50')).toBe(normalizeAnswer(correctAnswer));
    });
  });
});
