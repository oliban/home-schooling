/**
 * Tests for parent assignment preview page
 *
 * These tests verify:
 * - Story text display logic for reading assignments
 * - Story text paragraph formatting
 */

import { describe, it, expect } from 'vitest';

interface AssignmentDetail {
  id: string;
  parent_id: string;
  child_id: string;
  assignment_type: 'math' | 'reading';
  title: string;
  grade_level: number;
  status: string;
  package_id: string | null;
  created_at: string;
  completed_at: string | null;
  story_text?: string | null;
}

/**
 * Determine if story text should be displayed
 * Only show for reading assignments that have story_text
 */
function shouldShowStoryText(assignment: AssignmentDetail): boolean {
  return assignment.assignment_type === 'reading' && !!assignment.story_text;
}

/**
 * Split story text into paragraphs for display
 */
function splitIntoParagraphs(storyText: string): string[] {
  return storyText.split('\n\n');
}

describe('Parent Assignment Preview - Story Text Display', () => {
  describe('shouldShowStoryText', () => {
    it('should return true for reading assignment with story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'reading',
        title: 'Reading Comprehension',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
        story_text: 'Once upon a time...',
      };

      expect(shouldShowStoryText(assignment)).toBe(true);
    });

    it('should return false for reading assignment without story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'reading',
        title: 'Reading Comprehension',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
        story_text: null,
      };

      expect(shouldShowStoryText(assignment)).toBe(false);
    });

    it('should return false for reading assignment with undefined story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'reading',
        title: 'Reading Comprehension',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
      };

      expect(shouldShowStoryText(assignment)).toBe(false);
    });

    it('should return false for reading assignment with empty story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'reading',
        title: 'Reading Comprehension',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
        story_text: '',
      };

      expect(shouldShowStoryText(assignment)).toBe(false);
    });

    it('should return false for math assignment even with story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'math',
        title: 'Math Quiz',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
        story_text: 'Some story text that should not show',
      };

      expect(shouldShowStoryText(assignment)).toBe(false);
    });

    it('should return false for math assignment without story_text', () => {
      const assignment: AssignmentDetail = {
        id: '1',
        parent_id: 'p1',
        child_id: 'c1',
        assignment_type: 'math',
        title: 'Math Quiz',
        grade_level: 3,
        status: 'completed',
        package_id: 'pkg1',
        created_at: '2024-01-01',
        completed_at: '2024-01-02',
      };

      expect(shouldShowStoryText(assignment)).toBe(false);
    });
  });

  describe('splitIntoParagraphs', () => {
    it('should split story text by double newlines', () => {
      const storyText = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = splitIntoParagraphs(storyText);

      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    it('should return single paragraph for text without double newlines', () => {
      const storyText = 'Just one paragraph with single\nnewline inside.';
      const paragraphs = splitIntoParagraphs(storyText);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe('Just one paragraph with single\nnewline inside.');
    });

    it('should handle empty string', () => {
      const paragraphs = splitIntoParagraphs('');
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe('');
    });

    it('should handle Swedish text with special characters', () => {
      const storyText = 'Det var en gång en flicka som hette Åsa.\n\nHon bodde i Örnsköldsvik.';
      const paragraphs = splitIntoParagraphs(storyText);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toBe('Det var en gång en flicka som hette Åsa.');
      expect(paragraphs[1]).toBe('Hon bodde i Örnsköldsvik.');
    });
  });
});
