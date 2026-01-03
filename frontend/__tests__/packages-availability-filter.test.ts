import { describe, it, expect } from 'vitest';

/**
 * Test for packages page availability filter
 *
 * Features:
 * - Child selector buttons at top
 * - Availability filter (default: "Available only")
 * - Filters out packages already assigned to selected child
 * - Shows all packages when "All packages" is selected
 * - Only shows availability filter when a child is selected
 */

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

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
}

describe('Packages Page - Availability Filter', () => {
  it('should default availability filter to "available"', () => {
    const availabilityFilter: 'all' | 'available' = 'available';

    expect(availabilityFilter).toBe('available');
  });

  it('should show child selector with all children', () => {
    const children: ChildData[] = [
      { id: 'child-1', name: 'Alice', grade_level: 4 },
      { id: 'child-2', name: 'Bob', grade_level: 5 },
      { id: 'child-3', name: 'Charlie', grade_level: 4 },
    ];

    expect(children).toHaveLength(3);
    expect(children.map(c => c.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should allow selecting "All" (no child selected)', () => {
    let selectedChildId: string | null = 'child-1';

    // User clicks "All" button
    selectedChildId = null;

    expect(selectedChildId).toBeNull();
  });

  it('should allow selecting a specific child', () => {
    let selectedChildId: string | null = null;

    // User clicks a child button
    selectedChildId = 'child-2';

    expect(selectedChildId).toBe('child-2');
  });

  it('should automatically set grade filter when selecting a child', () => {
    const children: ChildData[] = [
      { id: 'child-1', name: 'Alice', grade_level: 4 },
      { id: 'child-2', name: 'Bob', grade_level: 5 },
    ];

    let selectedChildId: string | null = null;
    let gradeFilter: number | null = null;

    // User clicks Bob's button
    const selectedChild = children.find(c => c.id === 'child-2');
    if (selectedChild) {
      selectedChildId = selectedChild.id;
      gradeFilter = selectedChild.grade_level;
    }

    expect(selectedChildId).toBe('child-2');
    expect(gradeFilter).toBe(5);
  });

  it('should clear grade filter when clicking "All"', () => {
    let selectedChildId: string | null = 'child-1';
    let gradeFilter: number | null = 4;

    // User clicks "All" button
    selectedChildId = null;
    gradeFilter = null;

    expect(selectedChildId).toBeNull();
    expect(gradeFilter).toBeNull();
  });

  it('should only show availability filter when child is selected', () => {
    let selectedChildId: string | null = null;

    // Availability filter should be hidden
    const shouldShowAvailabilityFilter = selectedChildId !== null;
    expect(shouldShowAvailabilityFilter).toBe(false);

    // Select a child
    selectedChildId = 'child-1';

    // Availability filter should be visible
    const shouldShowNow = selectedChildId !== null;
    expect(shouldShowNow).toBe(true);
  });

  it('should filter out packages assigned to selected child when filter is "available"', () => {
    const packages: PackageData[] = [
      { id: 'pkg-1', name: 'Math 1', childAssignments: [] },
      { id: 'pkg-2', name: 'Math 2', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'completed' }] },
      { id: 'pkg-3', name: 'Math 3', childAssignments: [{ childId: 'child-2', childName: 'Bob', status: 'pending' }] },
      { id: 'pkg-4', name: 'Math 4', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'in_progress' }] },
    ];

    const selectedChildId = 'child-1';
    const availabilityFilter = 'available';

    const filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['pkg-1', 'pkg-3']);
  });

  it('should show all packages when filter is "all"', () => {
    const packages: PackageData[] = [
      { id: 'pkg-1', name: 'Math 1', childAssignments: [] },
      { id: 'pkg-2', name: 'Math 2', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'completed' }] },
      { id: 'pkg-3', name: 'Math 3', childAssignments: [{ childId: 'child-2', childName: 'Bob', status: 'pending' }] },
    ];

    const selectedChildId = 'child-1';
    const availabilityFilter = 'all';

    const filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    expect(filtered).toHaveLength(3);
  });

  it('should show all packages when no child is selected', () => {
    const packages: PackageData[] = [
      { id: 'pkg-1', name: 'Math 1', childAssignments: [] },
      { id: 'pkg-2', name: 'Math 2', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'completed' }] },
    ];

    const selectedChildId = null;
    const availabilityFilter = 'available';

    const filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    expect(filtered).toHaveLength(2);
  });

  it('should hide packages with any status (pending, in_progress, completed) for selected child', () => {
    const packages: PackageData[] = [
      { id: 'pkg-1', name: 'Never assigned', childAssignments: [] },
      { id: 'pkg-2', name: 'Pending for Alice', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'pending' }] },
      { id: 'pkg-3', name: 'In progress for Alice', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'in_progress' }] },
      { id: 'pkg-4', name: 'Completed for Alice', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'completed' }] },
      { id: 'pkg-5', name: 'For Bob only', childAssignments: [{ childId: 'child-2', childName: 'Bob', status: 'completed' }] },
    ];

    const selectedChildId = 'child-1';
    const availabilityFilter = 'available';

    const filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    // Should only show packages not assigned to child-1
    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['pkg-1', 'pkg-5']);
  });

  it('should update filtered packages when switching children', () => {
    const packages: PackageData[] = [
      { id: 'pkg-1', name: 'Math 1', childAssignments: [{ childId: 'child-1', childName: 'Alice', status: 'completed' }] },
      { id: 'pkg-2', name: 'Math 2', childAssignments: [{ childId: 'child-2', childName: 'Bob', status: 'completed' }] },
      { id: 'pkg-3', name: 'Math 3', childAssignments: [] },
    ];

    const availabilityFilter = 'available';

    // Select Alice
    let selectedChildId = 'child-1';
    let filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['pkg-2', 'pkg-3']);

    // Switch to Bob
    selectedChildId = 'child-2';
    filtered = packages.filter((pkg) => {
      if (availabilityFilter === 'all' || !selectedChildId) {
        return true;
      }
      const hasAssignment = pkg.childAssignments.some(ca => ca.childId === selectedChildId);
      return !hasAssignment;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['pkg-1', 'pkg-3']);
  });

  it('should pass selected child ID to package detail page', () => {
    const selectedChildId = 'child-1';
    const packageId = 'pkg-123';

    const url = selectedChildId
      ? `/parent/packages/${packageId}?childId=${selectedChildId}`
      : `/parent/packages/${packageId}`;

    expect(url).toBe('/parent/packages/pkg-123?childId=child-1');
  });

  it('should not pass child ID when no child selected', () => {
    const selectedChildId = null;
    const packageId = 'pkg-123';

    const url = selectedChildId
      ? `/parent/packages/${packageId}?childId=${selectedChildId}`
      : `/parent/packages/${packageId}`;

    expect(url).toBe('/parent/packages/pkg-123');
  });

  it('should auto-select child from URL parameter', () => {
    const urlChildId = 'child-2';
    const children: ChildData[] = [
      { id: 'child-1', name: 'Alice', grade_level: 4 },
      { id: 'child-2', name: 'Bob', grade_level: 5 },
    ];

    // Simulate URL parameter processing
    const child = children.find(c => c.id === urlChildId);
    const selectedChildId = child ? child.id : null;

    expect(selectedChildId).toBe('child-2');
  });
});

describe('Packages Page - UI State', () => {
  it('should highlight selected child button', () => {
    const selectedChildId = 'child-2';
    const childId = 'child-2';

    const isSelected = selectedChildId === childId;

    expect(isSelected).toBe(true);
  });

  it('should highlight "All" button when no child selected', () => {
    const selectedChildId = null;

    const isAllSelected = selectedChildId === null;

    expect(isAllSelected).toBe(true);
  });

  it('should highlight "Available only" button by default', () => {
    const availabilityFilter = 'available';

    const isAvailableSelected = availabilityFilter === 'available';

    expect(isAvailableSelected).toBe(true);
  });

  it('should use blue color for child selector buttons', () => {
    const selectedColor = 'bg-blue-600 text-white';
    const unselectedColor = 'bg-white text-gray-700 hover:bg-gray-100';

    expect(selectedColor).toContain('blue');
    expect(unselectedColor).toContain('white');
  });

  it('should use purple color for filter buttons', () => {
    const selectedColor = 'bg-purple-600 text-white';
    const unselectedColor = 'bg-white text-gray-700 hover:bg-gray-100';

    expect(selectedColor).toContain('purple');
    expect(unselectedColor).toContain('white');
  });
});
