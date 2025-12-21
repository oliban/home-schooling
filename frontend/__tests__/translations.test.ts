/**
 * Translation completeness tests
 * Ensures all translation keys used in the app exist in both languages
 */

import { describe, it, expect } from 'vitest';
import svMessages from '../messages/sv.json';
import enMessages from '../messages/en.json';

// Helper to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe('Translation files', () => {
  describe('Assignment Preview Page translations', () => {
    const requiredKeys = [
      'common.loading',
      'common.back',
      'parent.dashboard.grade',
      'parent.dashboard.completed',
      'parent.dashboard.inProgress',
      'parent.dashboard.pending',
      'parent.assignmentPreview.notFound',
      'parent.assignmentPreview.backToDashboard',
      'parent.assignmentPreview.questionCount',
      'parent.assignmentPreview.results',
      'parent.assignmentPreview.totalQuestions',
      'parent.assignmentPreview.correct',
      'parent.assignmentPreview.incorrect',
      'parent.assignmentPreview.score',
      'parent.assignmentPreview.questions',
      'parent.assignmentPreview.question',
      'parent.assignmentPreview.answer',
      'parent.assignmentPreview.childAnswered',
      'parent.assignmentPreview.type',
      'parent.assignmentPreview.hint',
      'parent.assignmentPreview.explanation',
      'parent.assignmentPreview.difficulty.easy',
      'parent.assignmentPreview.difficulty.medium',
      'parent.assignmentPreview.difficulty.hard',
    ];

    it('should have all required Swedish translations', () => {
      for (const key of requiredKeys) {
        const value = getNestedValue(svMessages, key);
        expect(value, `Missing Swedish translation for: ${key}`).toBeDefined();
        expect(typeof value, `Swedish translation for ${key} should be a string`).toBe('string');
      }
    });

    it('should have all required English translations', () => {
      for (const key of requiredKeys) {
        const value = getNestedValue(enMessages, key);
        expect(value, `Missing English translation for: ${key}`).toBeDefined();
        expect(typeof value, `English translation for ${key} should be a string`).toBe('string');
      }
    });
  });

  describe('In-Progress status translations', () => {
    const inProgressKeys = [
      'childDashboard.inProgress',
      'childDashboard.continueButton',
      'parent.dashboard.inProgress',
    ];

    it('should have in-progress translations in Swedish', () => {
      for (const key of inProgressKeys) {
        const value = getNestedValue(svMessages, key);
        expect(value, `Missing Swedish translation for: ${key}`).toBeDefined();
        expect(typeof value, `Swedish translation for ${key} should be a string`).toBe('string');
      }
    });

    it('should have in-progress translations in English', () => {
      for (const key of inProgressKeys) {
        const value = getNestedValue(enMessages, key);
        expect(value, `Missing English translation for: ${key}`).toBeDefined();
        expect(typeof value, `English translation for ${key} should be a string`).toBe('string');
      }
    });
  });

  describe('SketchPad translations', () => {
    const sketchPadKeys = [
      'sketchPad.title',
      'sketchPad.clear',
      'sketchPad.eraser',
      'sketchPad.pen',
      'sketchPad.text',
      'sketchPad.move',
      'sketchPad.typeHere',
    ];

    it('should have all SketchPad translations in Swedish', () => {
      for (const key of sketchPadKeys) {
        const value = getNestedValue(svMessages, key);
        expect(value, `Missing Swedish translation for: ${key}`).toBeDefined();
        expect(typeof value, `Swedish translation for ${key} should be a string`).toBe('string');
      }
    });

    it('should have all SketchPad translations in English', () => {
      for (const key of sketchPadKeys) {
        const value = getNestedValue(enMessages, key);
        expect(value, `Missing English translation for: ${key}`).toBeDefined();
        expect(typeof value, `English translation for ${key} should be a string`).toBe('string');
      }
    });
  });

  describe('Translation parity', () => {
    it('should have the same top-level keys in both languages', () => {
      const svKeys = Object.keys(svMessages).sort();
      const enKeys = Object.keys(enMessages).sort();
      expect(svKeys).toEqual(enKeys);
    });
  });
});
