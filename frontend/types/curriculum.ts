/**
 * Type definitions for curriculum objectives and custom prompt builder
 */

export interface ObjectiveData {
  id: number;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
  subject: 'math' | 'reading';
  gradeLevel?: number; // Optional, for grade-specific objectives
}

/**
 * Curriculum objective with coverage data (from API)
 */
export interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  extendedDescription: string | null;
  requiresWorkShown: boolean;
  exampleProblems: string[] | null;
  keyConcepts: string[] | null;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  score: number;
}

/**
 * Category with objectives and coverage statistics
 */
export interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  totalObjectives: number;
  coveredObjectives: number;
  totalCorrect: number;
  totalQuestions: number;
  coveragePercentage: number;
  objectives: ObjectiveCoverage[];
}

/**
 * Full coverage data for a child
 */
export interface CoverageData {
  childId: string;
  childGradeLevel: number;
  categories: CategoryCoverage[];
  totalObjectives: number;
  coveredObjectives: number;
  totalCorrect: number;
  totalQuestions: number;
  coveragePercentage: number;
}

export interface PromptConfig {
  selectedObjectives: ObjectiveData[];
  mode: 'broad' | 'deep';
  theme?: string;
  gradeLevel: number;
}

export interface GeneratedPrompt {
  prompt: string;
  objectiveCodes: string[];
  questionCount: number;
  subject: 'math' | 'reading';
  mode: 'broad' | 'deep';
}

export type PromptMode = 'broad' | 'deep';
export type Subject = 'math' | 'reading';
