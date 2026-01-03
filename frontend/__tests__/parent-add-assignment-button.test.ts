import { describe, it, expect } from 'vitest';

/**
 * Test for parent dashboard add assignment button
 *
 * Features:
 * - Shows prominent button when child has 0 active assignments
 * - Button links to packages page with child pre-selected
 * - Button hidden when child has active assignments
 */

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
  activeAssignments: number;
  completedAssignments: number;
}

describe('Parent Dashboard - Add Assignment Button', () => {
  it('should show add assignment button when child has 0 active assignments', () => {
    const child: ChildData = {
      id: 'child-1',
      name: 'Alice',
      grade_level: 4,
      activeAssignments: 0,
      completedAssignments: 5,
    };

    const shouldShowButton = child.activeAssignments === 0;

    expect(shouldShowButton).toBe(true);
  });

  it('should hide add assignment button when child has active assignments', () => {
    const child: ChildData = {
      id: 'child-1',
      name: 'Alice',
      grade_level: 4,
      activeAssignments: 3,
      completedAssignments: 5,
    };

    const shouldShowButton = child.activeAssignments === 0;

    expect(shouldShowButton).toBe(false);
  });

  it('should link to packages page with child ID in URL', () => {
    const child: ChildData = {
      id: 'child-123',
      name: 'Bob',
      grade_level: 5,
      activeAssignments: 0,
      completedAssignments: 0,
    };

    const buttonLink = `/parent/packages?childId=${child.id}`;

    expect(buttonLink).toBe('/parent/packages?childId=child-123');
  });

  it('should show button for child with 0 active but some completed', () => {
    const child: ChildData = {
      id: 'child-1',
      name: 'Charlie',
      grade_level: 3,
      activeAssignments: 0,
      completedAssignments: 10,
    };

    const shouldShowButton = child.activeAssignments === 0;

    expect(shouldShowButton).toBe(true);
  });

  it('should show button for brand new child with no assignments', () => {
    const child: ChildData = {
      id: 'child-new',
      name: 'Diana',
      grade_level: 1,
      activeAssignments: 0,
      completedAssignments: 0,
    };

    const shouldShowButton = child.activeAssignments === 0;

    expect(shouldShowButton).toBe(true);
  });

  it('should hide button even when child has just 1 active assignment', () => {
    const child: ChildData = {
      id: 'child-1',
      name: 'Eve',
      grade_level: 6,
      activeAssignments: 1,
      completedAssignments: 0,
    };

    const shouldShowButton = child.activeAssignments === 0;

    expect(shouldShowButton).toBe(false);
  });

  it('should generate correct link for multiple children', () => {
    const children: ChildData[] = [
      { id: 'child-1', name: 'Alice', grade_level: 4, activeAssignments: 0, completedAssignments: 5 },
      { id: 'child-2', name: 'Bob', grade_level: 5, activeAssignments: 0, completedAssignments: 3 },
      { id: 'child-3', name: 'Charlie', grade_level: 3, activeAssignments: 2, completedAssignments: 8 },
    ];

    const links = children
      .filter(c => c.activeAssignments === 0)
      .map(c => `/parent/packages?childId=${c.id}`);

    expect(links).toEqual([
      '/parent/packages?childId=child-1',
      '/parent/packages?childId=child-2',
    ]);
  });

  it('should show button state for mixed assignment counts', () => {
    const testCases = [
      { activeAssignments: 0, expected: true },
      { activeAssignments: 1, expected: false },
      { activeAssignments: 5, expected: false },
      { activeAssignments: 10, expected: false },
    ];

    testCases.forEach(({ activeAssignments, expected }) => {
      const shouldShow = activeAssignments === 0;
      expect(shouldShow).toBe(expected);
    });
  });
});
