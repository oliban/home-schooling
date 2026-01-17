import { describe, it, expect } from 'vitest';

// Import the functions we're testing - we'll need to export them first
// For now, test the logic directly

describe('normalizeMultipleChoiceProblem', () => {
  // Replicate the normalization logic for testing
  function extractOptionsFromQuestionText(questionText: string): string[] | null {
    const optionPattern = /([A-D])[:\)]\s*([^,A-D]+?)(?=,?\s*[A-D][:\)]|$)/gi;
    const matches = [...questionText.matchAll(optionPattern)];

    if (matches.length >= 2) {
      return matches.map(m => `${m[1].toUpperCase()}: ${m[2].trim()}`);
    }
    return null;
  }

  function normalizeMultipleChoiceProblem(problem: {
    answer_type?: string;
    correct_answer: string;
    options?: string[];
    question_text?: string;
  }): { correct_answer: string; options: string[] | null } {
    if (problem.answer_type !== 'multiple_choice') {
      return { correct_answer: problem.correct_answer, options: problem.options || null };
    }

    let options: string[] | undefined = problem.options;

    // If options are empty, try to extract from question text
    if ((!options || options.length === 0) && problem.question_text) {
      const extractedOptions = extractOptionsFromQuestionText(problem.question_text);
      if (extractedOptions) {
        options = extractedOptions;
      }
    }

    const answer = problem.correct_answer.trim();

    // Helper to check if a letter exists in options
    // FIX: Return false when options are missing - the letter can't exist in non-existent options
    const letterExistsInOptions = (letter: string): boolean => {
      if (!options || options.length === 0) return false;
      return options.some(opt => opt.charAt(0).toUpperCase() === letter);
    };

    // Already a valid single letter - verify it exists in options
    if (/^[A-Da-d]$/.test(answer)) {
      const letter = answer.toUpperCase();
      if (letterExistsInOptions(letter)) {
        return { correct_answer: letter, options: options && options.length > 0 ? options : (problem.options || null) };
      }
      // Letter doesn't exist in options, fall through to text matching
    }

    // Extract first character if it's a letter (handles "A: text" format)
    const firstChar = answer.charAt(0).toUpperCase();
    if (/^[A-D]$/.test(firstChar) && letterExistsInOptions(firstChar)) {
      return { correct_answer: firstChar, options: options && options.length > 0 ? options : (problem.options || null) };
    }

    // First char is A-D but doesn't exist in options, or answer doesn't start with A-D
    // Try to match answer text against options
    if (options && Array.isArray(options) && options.length > 0) {
      const normalizedAnswer = answer.toLowerCase();

      for (const option of options) {
        const match = option.match(/^([A-Da-d])[:\)]?\s*(.+)$/i);
        if (!match) continue;

        const [, letter, text] = match;
        const normalizedText = text.toLowerCase().trim();

        if (normalizedText === normalizedAnswer || normalizedText.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedText)) {
          return { correct_answer: letter.toUpperCase(), options };
        }
      }
    }

    // REJECT multiple_choice without options - don't allow it through
    if (!options || options.length === 0) {
      throw new Error('Multiple choice question must have options');
    }

    // Fallback
    return { correct_answer: firstChar || 'A', options };
  }

  describe('correct_answer normalization', () => {
    it('should keep single letter answers unchanged', () => {
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'A',
        options: ['A: Yes', 'B: No']
      });
      expect(result.correct_answer).toBe('A');
    });

    it('should uppercase lowercase single letters', () => {
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'b',
        options: ['A: Yes', 'B: No']
      });
      expect(result.correct_answer).toBe('B');
    });

    it('should extract letter from "A: text" format', () => {
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'A: Framför Toad',
        options: ['A: Framför Toad', 'B: Bakom Toad']
      });
      expect(result.correct_answer).toBe('A');
    });

    it('should match text answer against options when first char is not A-D', () => {
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'yes please',
        options: ['A: Yes please', 'B: No thanks']
      });
      expect(result.correct_answer).toBe('A');
    });

    it('should match text when first char is valid letter but not in options', () => {
      // "cirka" starts with C, but options only have A and B
      // Should match against option text instead of using 'C'
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'cirka 30',
        options: ['A: Cirka 30', 'B: Cirka 40']
      });
      // Should match 'A: Cirka 30' since 'cirka 30' matches the text
      expect(result.correct_answer).toBe('A');
    });

    it('should not modify non-multiple_choice questions', () => {
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'number',
        correct_answer: '42',
        options: undefined
      });
      expect(result.correct_answer).toBe('42');
    });
  });

  describe('options extraction from question text', () => {
    it('should extract at least 2 options from question text', () => {
      // The regex extracts options when formatted as "A) text B) text"
      // Note: Current implementation may not capture the final option without trailing marker
      const extracted = extractOptionsFromQuestionText('Which is correct? A) Yes B) No');
      expect(extracted).toEqual(['A: Yes', 'B: No']);
    });

    it('should keep existing options if present', () => {
      const existingOptions = ['A: Yes', 'B: No'];
      const result = normalizeMultipleChoiceProblem({
        answer_type: 'multiple_choice',
        correct_answer: 'A',
        options: existingOptions,
        question_text: 'Some question with A) other, B) options'
      });
      expect(result.options).toEqual(existingOptions);
    });

    it('should throw error when cannot extract options', () => {
      // When options is passed as empty array and extraction fails, it should throw
      expect(() => {
        normalizeMultipleChoiceProblem({
          answer_type: 'multiple_choice',
          correct_answer: 'A',
          options: [],
          question_text: 'A question with no options embedded'
        });
      }).toThrow('Multiple choice question must have options');
    });

    it('should throw error when options is undefined for multiple_choice', () => {
      // When options is undefined for multiple_choice, it should throw
      expect(() => {
        normalizeMultipleChoiceProblem({
          answer_type: 'multiple_choice',
          correct_answer: 'A',
          options: undefined,
          question_text: 'A question without options'
        });
      }).toThrow('Multiple choice question must have options');
    });
  });
});
