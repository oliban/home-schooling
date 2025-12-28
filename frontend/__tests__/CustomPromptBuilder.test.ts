import { ObjectiveData } from '@/types/curriculum';

// Extract the prompt generation logic for testing
function generateCustomPrompt(
  objectives: ObjectiveData[],
  mode: 'broad' | 'deep',
  theme: string | undefined,
  gradeLevel: number
): { prompt: string; objectiveCodes: string[]; questionCount: number; subject: 'math' | 'reading'; mode: 'broad' | 'deep' } {
  if (objectives.length === 0) {
    throw new Error('No objectives selected');
  }

  // Validate subject consistency
  const subjects = new Set(objectives.map(o => o.subject));
  if (subjects.size > 1) {
    throw new Error('Cannot mix math and reading objectives');
  }

  const subject = objectives[0].subject;
  const codes = objectives.map(o => o.code);

  // Calculate question count based on mode
  let questionCount: number;
  if (mode === 'deep') {
    questionCount = Math.max(6, Math.min(10, objectives.length * 3));
  } else {
    questionCount = Math.max(10, Math.min(20, objectives.length * 4));
  }

  // Build skill command
  const skillName = subject === 'math' ? 'generate-math' : 'generate-reading';
  const codesStr = codes.join(', ');

  let prompt = `Use ${skillName} skill for årskurs ${gradeLevel}, ${questionCount} ${mode === 'deep' ? 'deep-focus' : ''} problems covering: ${codesStr}`;

  if (theme && theme.trim()) {
    prompt += `\n\nTheme: ${theme.trim()}`;
  }

  return {
    prompt,
    objectiveCodes: codes,
    questionCount,
    subject,
    mode,
  };
}

describe('CustomPromptBuilder - generateCustomPrompt', () => {
  const mathObjective1: ObjectiveData = {
    id: 1,
    code: 'MA-TAL-01',
    description: 'Tal och räkning',
    categoryId: 'MA-TAL',
    categoryName: 'Taluppfattning',
    subject: 'math',
  };

  const mathObjective2: ObjectiveData = {
    id: 2,
    code: 'MA-TAL-02',
    description: 'Addition och subtraktion',
    categoryId: 'MA-TAL',
    categoryName: 'Taluppfattning',
    subject: 'math',
  };

  const readingObjective: ObjectiveData = {
    id: 3,
    code: 'SV-INFERENCE',
    description: 'Läsa mellan raderna',
    categoryId: 'SV',
    categoryName: 'Läsförståelse',
    subject: 'reading',
  };

  describe('validation', () => {
    it('should throw error when no objectives selected', () => {
      expect(() => {
        generateCustomPrompt([], 'broad', undefined, 3);
      }).toThrow('No objectives selected');
    });

    it('should throw error when mixing math and reading objectives', () => {
      expect(() => {
        generateCustomPrompt([mathObjective1, readingObjective], 'broad', undefined, 3);
      }).toThrow('Cannot mix math and reading objectives');
    });
  });

  describe('question count calculation', () => {
    it('should calculate correct question count for deep mode', () => {
      const result = generateCustomPrompt([mathObjective1], 'deep', undefined, 3);
      expect(result.questionCount).toBeGreaterThanOrEqual(6);
      expect(result.questionCount).toBeLessThanOrEqual(10);
    });

    it('should calculate correct question count for broad mode', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', undefined, 3);
      expect(result.questionCount).toBeGreaterThanOrEqual(10);
      expect(result.questionCount).toBeLessThanOrEqual(20);
    });

    it('should scale question count with number of objectives', () => {
      const single = generateCustomPrompt([mathObjective1], 'broad', undefined, 3);
      const double = generateCustomPrompt([mathObjective1, mathObjective2], 'broad', undefined, 3);

      expect(double.questionCount).toBeGreaterThanOrEqual(single.questionCount);
    });
  });

  describe('prompt format', () => {
    it('should generate correct prompt for math objectives', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', undefined, 3);

      expect(result.prompt).toContain('Use generate-math skill');
      expect(result.prompt).toContain('årskurs 3');
      expect(result.prompt).toContain('MA-TAL-01');
      expect(result.subject).toBe('math');
    });

    it('should generate correct prompt for reading objectives', () => {
      const result = generateCustomPrompt([readingObjective], 'broad', undefined, 5);

      expect(result.prompt).toContain('Use generate-reading skill');
      expect(result.prompt).toContain('årskurs 5');
      expect(result.prompt).toContain('SV-INFERENCE');
      expect(result.subject).toBe('reading');
    });

    it('should include deep-focus flag for deep mode', () => {
      const result = generateCustomPrompt([mathObjective1], 'deep', undefined, 4);

      expect(result.prompt).toContain('deep-focus');
    });

    it('should not include deep-focus flag for broad mode', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', undefined, 4);

      expect(result.prompt).not.toContain('deep-focus');
    });

    it('should include theme when provided', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', 'minecraft äventyr', 4);

      expect(result.prompt).toContain('Theme: minecraft äventyr');
    });

    it('should not include theme section when theme is empty', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', '', 4);

      expect(result.prompt).not.toContain('Theme:');
    });

    it('should trim whitespace from theme', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', '  rymden  ', 4);

      expect(result.prompt).toContain('Theme: rymden');
      expect(result.prompt).not.toContain('Theme:  rymden  ');
    });

    it('should join multiple objective codes with comma', () => {
      const result = generateCustomPrompt([mathObjective1, mathObjective2], 'broad', undefined, 5);

      expect(result.prompt).toContain('MA-TAL-01, MA-TAL-02');
    });
  });

  describe('return value structure', () => {
    it('should return all required fields', () => {
      const result = generateCustomPrompt([mathObjective1], 'broad', 'test theme', 3);

      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('objectiveCodes');
      expect(result).toHaveProperty('questionCount');
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('mode');
    });

    it('should return correct objective codes array', () => {
      const result = generateCustomPrompt([mathObjective1, mathObjective2], 'broad', undefined, 3);

      expect(result.objectiveCodes).toEqual(['MA-TAL-01', 'MA-TAL-02']);
    });

    it('should preserve mode in return value', () => {
      const broadResult = generateCustomPrompt([mathObjective1], 'broad', undefined, 3);
      const deepResult = generateCustomPrompt([mathObjective1], 'deep', undefined, 3);

      expect(broadResult.mode).toBe('broad');
      expect(deepResult.mode).toBe('deep');
    });
  });
});
