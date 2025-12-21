/**
 * Tests for parent dashboard assignment grouping logic
 *
 * These tests verify the logic for grouping assignments by child
 */

import { describe, it, expect } from 'vitest';

interface AssignmentData {
  id: string;
  child_id: string;
  child_name: string;
  assignment_type: 'math' | 'reading';
  title: string;
  status: string;
  created_at: string;
  correct_count: number;
  total_count: number;
}

/**
 * Group assignments by child
 * Returns an array of [childId, { childName, assignments }] sorted by child name
 */
function groupByChild(assignments: AssignmentData[]) {
  const grouped: Record<string, { childName: string; assignments: AssignmentData[] }> = {};
  for (const assignment of assignments) {
    if (!grouped[assignment.child_id]) {
      grouped[assignment.child_id] = {
        childName: assignment.child_name,
        assignments: [],
      };
    }
    grouped[assignment.child_id].assignments.push(assignment);
  }
  return Object.entries(grouped).sort((a, b) => a[1].childName.localeCompare(b[1].childName));
}

describe('Parent Dashboard - Assignment Grouping', () => {
  describe('groupByChild', () => {
    it('should return empty array for empty assignments', () => {
      expect(groupByChild([])).toEqual([]);
    });

    it('should group assignments by child_id', () => {
      const assignments: AssignmentData[] = [
        { id: '1', child_id: 'c1', child_name: 'Alice', assignment_type: 'math', title: 'Math 1', status: 'pending', created_at: '2024-01-01', correct_count: 0, total_count: 10 },
        { id: '2', child_id: 'c2', child_name: 'Bob', assignment_type: 'math', title: 'Math 2', status: 'pending', created_at: '2024-01-02', correct_count: 0, total_count: 10 },
        { id: '3', child_id: 'c1', child_name: 'Alice', assignment_type: 'reading', title: 'Reading 1', status: 'pending', created_at: '2024-01-03', correct_count: 0, total_count: 5 },
      ];

      const result = groupByChild(assignments);

      expect(result).toHaveLength(2);
      // Sorted alphabetically by child name
      expect(result[0][0]).toBe('c1'); // Alice
      expect(result[0][1].childName).toBe('Alice');
      expect(result[0][1].assignments).toHaveLength(2);
      expect(result[1][0]).toBe('c2'); // Bob
      expect(result[1][1].childName).toBe('Bob');
      expect(result[1][1].assignments).toHaveLength(1);
    });

    it('should sort groups alphabetically by child name', () => {
      const assignments: AssignmentData[] = [
        { id: '1', child_id: 'c1', child_name: 'Zebra', assignment_type: 'math', title: 'Math 1', status: 'pending', created_at: '2024-01-01', correct_count: 0, total_count: 10 },
        { id: '2', child_id: 'c2', child_name: 'Alice', assignment_type: 'math', title: 'Math 2', status: 'pending', created_at: '2024-01-02', correct_count: 0, total_count: 10 },
        { id: '3', child_id: 'c3', child_name: 'Mike', assignment_type: 'reading', title: 'Reading 1', status: 'pending', created_at: '2024-01-03', correct_count: 0, total_count: 5 },
      ];

      const result = groupByChild(assignments);

      expect(result).toHaveLength(3);
      expect(result[0][1].childName).toBe('Alice');
      expect(result[1][1].childName).toBe('Mike');
      expect(result[2][1].childName).toBe('Zebra');
    });

    it('should preserve assignment order within each child group', () => {
      const assignments: AssignmentData[] = [
        { id: '1', child_id: 'c1', child_name: 'Alice', assignment_type: 'math', title: 'First', status: 'pending', created_at: '2024-01-01', correct_count: 0, total_count: 10 },
        { id: '2', child_id: 'c1', child_name: 'Alice', assignment_type: 'math', title: 'Second', status: 'pending', created_at: '2024-01-02', correct_count: 0, total_count: 10 },
        { id: '3', child_id: 'c1', child_name: 'Alice', assignment_type: 'reading', title: 'Third', status: 'pending', created_at: '2024-01-03', correct_count: 0, total_count: 5 },
      ];

      const result = groupByChild(assignments);

      expect(result).toHaveLength(1);
      expect(result[0][1].assignments[0].title).toBe('First');
      expect(result[0][1].assignments[1].title).toBe('Second');
      expect(result[0][1].assignments[2].title).toBe('Third');
    });

    it('should handle single child with single assignment', () => {
      const assignments: AssignmentData[] = [
        { id: '1', child_id: 'c1', child_name: 'Alice', assignment_type: 'math', title: 'Math 1', status: 'completed', created_at: '2024-01-01', correct_count: 8, total_count: 10 },
      ];

      const result = groupByChild(assignments);

      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('c1');
      expect(result[0][1].childName).toBe('Alice');
      expect(result[0][1].assignments).toHaveLength(1);
      expect(result[0][1].assignments[0].id).toBe('1');
    });

    it('should handle Swedish names with special characters', () => {
      const assignments: AssignmentData[] = [
        { id: '1', child_id: 'c1', child_name: 'Åsa', assignment_type: 'math', title: 'Math 1', status: 'pending', created_at: '2024-01-01', correct_count: 0, total_count: 10 },
        { id: '2', child_id: 'c2', child_name: 'Örjan', assignment_type: 'math', title: 'Math 2', status: 'pending', created_at: '2024-01-02', correct_count: 0, total_count: 10 },
        { id: '3', child_id: 'c3', child_name: 'Anders', assignment_type: 'reading', title: 'Reading 1', status: 'pending', created_at: '2024-01-03', correct_count: 0, total_count: 5 },
      ];

      const result = groupByChild(assignments);

      expect(result).toHaveLength(3);
      // localeCompare should handle Swedish characters
      expect(result[0][1].childName).toBe('Anders');
    });
  });
});
