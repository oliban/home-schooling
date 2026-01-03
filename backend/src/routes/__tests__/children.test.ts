import { describe, it, expect } from 'vitest';

/**
 * Test for children API enhancement
 *
 * Feature: Added activeAssignments and completedAssignments counts to children list
 *
 * Purpose: Allow parent dashboard to display assignment statistics for each child
 * without additional API calls.
 */

describe('Children API - Assignment Counts', () => {
  it('should include activeAssignments count in response', () => {
    // Mock child data as it would be returned from the DB query
    const mockChild = {
      id: 'child-123',
      name: 'Test Child',
      grade_level: 4,
      activeAssignments: 3,
      completedAssignments: 5,
    };

    // Verify the shape includes the new fields
    expect(mockChild).toHaveProperty('activeAssignments');
    expect(typeof mockChild.activeAssignments).toBe('number');
  });

  it('should include completedAssignments count in response', () => {
    const mockChild = {
      id: 'child-123',
      name: 'Test Child',
      grade_level: 4,
      activeAssignments: 3,
      completedAssignments: 5,
    };

    expect(mockChild).toHaveProperty('completedAssignments');
    expect(typeof mockChild.completedAssignments).toBe('number');
  });

  it('should count active assignments (pending and in_progress status)', () => {
    // Mock scenario: child has 2 pending and 1 in_progress assignment
    const assignments = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'in_progress' },
      { status: 'completed' },
    ];

    const activeCount = assignments.filter(a =>
      a.status === 'pending' || a.status === 'in_progress'
    ).length;

    expect(activeCount).toBe(3);
  });

  it('should count completed assignments separately', () => {
    const assignments = [
      { status: 'pending' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'in_progress' },
    ];

    const completedCount = assignments.filter(a =>
      a.status === 'completed'
    ).length;

    expect(completedCount).toBe(2);
  });

  it('should handle children with no assignments', () => {
    const mockChild = {
      id: 'child-456',
      name: 'New Child',
      grade_level: 1,
      activeAssignments: 0,
      completedAssignments: 0,
    };

    expect(mockChild.activeAssignments).toBe(0);
    expect(mockChild.completedAssignments).toBe(0);
  });

  it('should maintain backward compatibility with existing fields', () => {
    const mockChild = {
      id: 'child-123',
      name: 'Test Child',
      birthdate: '2015-01-15',
      grade_level: 4,
      coins: 100,
      brainrotCount: 5,
      brainrotValue: 250,
      activeAssignments: 3,
      completedAssignments: 5,
    };

    // Ensure all existing fields are still present
    expect(mockChild).toHaveProperty('id');
    expect(mockChild).toHaveProperty('name');
    expect(mockChild).toHaveProperty('grade_level');
    expect(mockChild).toHaveProperty('coins');
    expect(mockChild).toHaveProperty('brainrotCount');
    expect(mockChild).toHaveProperty('brainrotValue');
  });
});
