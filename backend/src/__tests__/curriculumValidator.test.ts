import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCurriculumCodesBatch } from '../utils/curriculumValidator';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

describe('CurriculumValidator', () => {
  let mockClient: {
    messages: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockClient = {
      messages: {
        create: vi.fn()
      }
    };
  });

  const createTestProblem = (text: string, code: string) => ({
    question_text: text,
    correct_answer: '42',
    answer_type: 'number' as const,
    explanation: 'Test explanation',
    hint: 'Test hint',
    difficulty: 'medium' as const,
    lgr22_codes: [code]
  });

  describe('validateCurriculumCodesBatch', () => {
    it('should skip validation for reading assignments', async () => {
      const problems = [createTestProblem('Test question', 'SV-LAS-01')];

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'reading'
      );

      expect(result).toEqual(problems);
      expect(mockClient.messages.create).not.toHaveBeenCalled();
    });

    it('should return problems unchanged when no corrections needed', async () => {
      const problems = [createTestProblem('Vad är 5 + 3?', 'MA-PRO-03')];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'math'
      );

      expect(result).toEqual(problems);
      expect(result[0].lgr22_codes).toEqual(['MA-PRO-03']);
    });

    it('should apply corrections when Claude suggests them', async () => {
      const problems = [
        createTestProblem('Dela 840 guldmynt mellan 6 pirater', 'MA-SAN-04')
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: '[{"index": 0, "currentCode": "MA-SAN-04", "correctCode": "MA-PRO-06", "reason": "division, not combinatorics"}]'
        }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        6,
        'math'
      );

      expect(result[0].lgr22_codes).toEqual(['MA-PRO-06']);
    });

    it('should handle multiple corrections', async () => {
      const problems = [
        createTestProblem('Dela 100 kr mellan 4 barn', 'MA-SAN-04'),
        createTestProblem('Rita en rektangel med area', 'MA-GEO-03')
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: `[
            {"index": 0, "currentCode": "MA-SAN-04", "correctCode": "MA-PRO-06", "reason": "division"},
            {"index": 1, "currentCode": "MA-GEO-03", "correctCode": "MA-GEO-07", "reason": "area calculation"}
          ]`
        }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        4,
        'math'
      );

      expect(result[0].lgr22_codes).toEqual(['MA-PRO-06']);
      expect(result[1].lgr22_codes).toEqual(['MA-GEO-07']);
    });

    it('should return problems unchanged on API error', async () => {
      const problems = [createTestProblem('Test', 'MA-PRO-03')];

      mockClient.messages.create.mockRejectedValue(new Error('API error'));

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'math'
      );

      // Should fail open - return unchanged
      expect(result).toEqual(problems);
    });

    it('should handle non-text response format', async () => {
      const problems = [createTestProblem('Test', 'MA-PRO-03')];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'image', source: {} }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'math'
      );

      expect(result).toEqual(problems);
    });

    it('should handle response without JSON array', async () => {
      const problems = [createTestProblem('Test', 'MA-PRO-03')];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Alla koder är korrekta.' }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'math'
      );

      expect(result).toEqual(problems);
    });

    it('should ignore corrections with invalid indices', async () => {
      const problems = [createTestProblem('Test', 'MA-PRO-03')];

      mockClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: '[{"index": 99, "currentCode": "MA-PRO-03", "correctCode": "MA-PRO-06", "reason": "out of bounds"}]'
        }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        3,
        'math'
      );

      // Should not apply invalid correction
      expect(result[0].lgr22_codes).toEqual(['MA-PRO-03']);
    });

    it('should validate English assignments with EN-* codes', async () => {
      const problems = [
        createTestProblem('What does "happy" mean?', 'EN-VOC'),
        createTestProblem('She ___ to school every day', 'EN-VOC')
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: '[{"index": 1, "currentCode": "EN-VOC", "correctCode": "EN-GRM", "reason": "tests verb conjugation, not vocabulary"}]'
        }]
      });

      const result = await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        4,
        'english'
      );

      expect(result[0].lgr22_codes).toEqual(['EN-VOC']);
      expect(result[1].lgr22_codes).toEqual(['EN-GRM']);
      expect(mockClient.messages.create).toHaveBeenCalled();
    });

    it('should use English-specific prompt for English assignments', async () => {
      const problems = [createTestProblem('Translate: Jag har en hund', 'EN-TRN')];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }]
      });

      await validateCurriculumCodesBatch(
        mockClient as unknown as Anthropic,
        problems,
        5,
        'english'
      );

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('engelska');
      expect(callArgs.messages[0].content).toContain('EN-VOC');
      expect(callArgs.messages[0].content).toContain('EN-GRM');
    });
  });
});
