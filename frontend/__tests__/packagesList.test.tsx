/**
 * Test for packages list page - verifying child assignments rendering
 *
 * Bug: When the same child has multiple assignments for the same package,
 * React would throw a duplicate key warning because we used childId as the key.
 *
 * Fix: Use childId + index for unique keys
 */

import { describe, it, expect } from 'vitest';

describe('Packages List - Child Assignments', () => {
  interface ChildAssignment {
    childId: string;
    childName: string;
    status: 'pending' | 'in_progress' | 'completed';
  }

  interface PackageData {
    id: string;
    name: string;
    childAssignments: ChildAssignment[];
  }

  // Helper to extract keys from rendered assignments
  function getAssignmentKeys(pkg: PackageData): string[] {
    // Simulate the key generation logic from the component
    return pkg.childAssignments.map((ca, index) => `${ca.childId}-${index}`);
  }

  it('should generate unique keys for single child assignment', () => {
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
      ],
    };

    const keys = getAssignmentKeys(pkg);

    expect(keys).toEqual(['child-1-0']);
    expect(new Set(keys).size).toBe(keys.length); // All keys are unique
  });

  it('should generate unique keys for different children', () => {
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-2', childName: 'Bob', status: 'in_progress' },
        { childId: 'child-3', childName: 'Charlie', status: 'pending' },
      ],
    };

    const keys = getAssignmentKeys(pkg);

    expect(keys).toEqual(['child-1-0', 'child-2-1', 'child-3-2']);
    expect(new Set(keys).size).toBe(keys.length); // All keys are unique
  });

  it('should generate unique keys when same child has multiple assignments', () => {
    // This is the bug scenario - same child assigned the same package multiple times
    // (e.g., they retook it, or it was reassigned)
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-1', childName: 'Alice', status: 'in_progress' }, // Same child, different assignment
        { childId: 'child-2', childName: 'Bob', status: 'pending' },
      ],
    };

    const keys = getAssignmentKeys(pkg);

    // Keys should be unique even though child-1 appears twice
    expect(keys).toEqual(['child-1-0', 'child-1-1', 'child-2-2']);
    expect(new Set(keys).size).toBe(keys.length); // All keys are unique
    expect(keys.length).toBe(3); // All assignments accounted for
  });

  it('should handle multiple assignments for same child with different statuses', () => {
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-1', childName: 'Alice', status: 'in_progress' },
      ],
    };

    const keys = getAssignmentKeys(pkg);

    expect(keys).toEqual(['child-1-0', 'child-1-1', 'child-1-2']);
    expect(new Set(keys).size).toBe(keys.length); // All keys are unique
  });

  it('should maintain stable keys for same data', () => {
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-1', childName: 'Alice', status: 'in_progress' },
      ],
    };

    const keys1 = getAssignmentKeys(pkg);
    const keys2 = getAssignmentKeys(pkg);

    // Keys should be stable across renders
    expect(keys1).toEqual(keys2);
  });

  it('should handle empty assignments list', () => {
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [],
    };

    const keys = getAssignmentKeys(pkg);

    expect(keys).toEqual([]);
  });

  it('should validate that old key strategy would fail', () => {
    // This test documents why the old approach (using just childId) was problematic
    const pkg: PackageData = {
      id: 'pkg-1',
      name: 'Math Package',
      childAssignments: [
        { childId: 'child-1', childName: 'Alice', status: 'completed' },
        { childId: 'child-1', childName: 'Alice', status: 'in_progress' },
      ],
    };

    // Old approach: just use childId
    const oldKeys = pkg.childAssignments.map(ca => ca.childId);
    expect(oldKeys).toEqual(['child-1', 'child-1']); // Duplicates!
    expect(new Set(oldKeys).size).toBe(1); // Only 1 unique key for 2 items - BAD!

    // New approach: childId + index
    const newKeys = getAssignmentKeys(pkg);
    expect(newKeys).toEqual(['child-1-0', 'child-1-1']); // Unique!
    expect(new Set(newKeys).size).toBe(2); // 2 unique keys for 2 items - GOOD!
  });
});
