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
