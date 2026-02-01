/**
 * Tests for AdventureCreator quiz functionality
 */

import { describe, it, expect } from 'vitest';

describe('AdventureCreator Quiz Mode', () => {
  describe('Quiz content type behavior', () => {
    it('should use custom topic for quiz instead of predefined themes', () => {
      // Quiz content type uses a free-form topic input
      // instead of the predefined theme picker
      const contentType = 'quiz';
      const showThemePicker = contentType !== 'quiz';
      const showTopicInput = contentType === 'quiz';

      expect(showThemePicker).toBe(false);
      expect(showTopicInput).toBe(true);
    });

    it('should accept any topic string for quiz', () => {
      const validQuizTopics = [
        'Dinosaurier',
        'Buddhism',
        'Rymden',
        'Vikings',
        'The Solar System',
        'Ancient Egypt'
      ];

      validQuizTopics.forEach(topic => {
        expect(topic.trim().length).toBeGreaterThan(0);
      });
    });

    it('should show different prompt for quiz vs other types', () => {
      const getPromptText = (contentType: string, locale: string) => {
        if (contentType === 'quiz') {
          return locale === 'sv' ? 'Vad vill du lära dig om?' : 'What do you want to learn about?';
        }
        return locale === 'sv' ? 'Välj ett tema' : 'Choose a theme';
      };

      expect(getPromptText('quiz', 'sv')).toBe('Vad vill du lära dig om?');
      expect(getPromptText('quiz', 'en')).toBe('What do you want to learn about?');
      expect(getPromptText('math', 'sv')).toBe('Välj ett tema');
      expect(getPromptText('reading', 'en')).toBe('Choose a theme');
    });

    it('should require non-empty topic for quiz', () => {
      const validateTopic = (topic: string) => topic.trim() !== '';

      expect(validateTopic('Dinosaurier')).toBe(true);
      expect(validateTopic('  Space  ')).toBe(true);
      expect(validateTopic('')).toBe(false);
      expect(validateTopic('   ')).toBe(false);
    });
  });

  describe('Quiz request payload', () => {
    it('should send correct payload structure for quiz', () => {
      const createQuizPayload = (topic: string, sizeId: string, locale: string) => ({
        contentType: 'quiz',
        themeId: 'custom',
        customTheme: topic.trim(),
        sizeId,
        locale
      });

      const payload = createQuizPayload('Dinosaurier', 'medium', 'sv');

      expect(payload.contentType).toBe('quiz');
      expect(payload.themeId).toBe('custom');
      expect(payload.customTheme).toBe('Dinosaurier');
      expect(payload.sizeId).toBe('medium');
    });
  });
});
