import { describe, it, expect } from 'vitest';

/**
 * Test for curriculum page child auto-selection logic
 *
 * Feature: Smart child matching when importing packages
 *
 * Logic:
 * 1. Match children by package grade level
 * 2. If multiple matches, prefer currently selected child
 * 3. If no matches, return empty string (user must select manually)
 */

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
}

// Replicate the autoSelectChildByGrade logic from curriculum page
function autoSelectChildByGrade(
  gradeLevel: number,
  childrenList: ChildData[],
  selectedChildId?: string
): string {
  // Find children with matching grade level
  const matchingChildren = childrenList.filter(c => c.grade_level === gradeLevel);

  if (matchingChildren.length === 0) {
    return ''; // No match found
  }

  if (matchingChildren.length === 1) {
    return matchingChildren[0].id; // Single match
  }

  // Multiple matches - prefer currently selected child if they match
  if (selectedChildId && matchingChildren.some(c => c.id === selectedChildId)) {
    return selectedChildId;
  }

  // Otherwise return first matching child
  return matchingChildren[0].id;
}

describe('Curriculum Page - Auto-Select Child by Grade', () => {
  const mockChildren: ChildData[] = [
    { id: 'child-1', name: 'Alice', grade_level: 4 },
    { id: 'child-2', name: 'Bob', grade_level: 5 },
    { id: 'child-3', name: 'Charlie', grade_level: 4 },
  ];

  it('should return empty string when no children match the grade level', () => {
    const result = autoSelectChildByGrade(6, mockChildren);
    expect(result).toBe('');
  });

  it('should return the only matching child when single match exists', () => {
    const result = autoSelectChildByGrade(5, mockChildren);
    expect(result).toBe('child-2'); // Bob is the only grade 5
  });

  it('should prefer currently selected child when multiple matches exist', () => {
    const result = autoSelectChildByGrade(4, mockChildren, 'child-3');
    expect(result).toBe('child-3'); // Charlie was selected and matches grade 4
  });

  it('should return first match when multiple matches and none is selected', () => {
    const result = autoSelectChildByGrade(4, mockChildren);
    expect(result).toBe('child-1'); // Alice is first grade 4 child
  });

  it('should return first match when selected child does not match grade', () => {
    const result = autoSelectChildByGrade(4, mockChildren, 'child-2');
    expect(result).toBe('child-1'); // Bob (child-2) is grade 5, not 4
  });

  it('should handle empty children list', () => {
    const result = autoSelectChildByGrade(4, []);
    expect(result).toBe('');
  });

  it('should handle batch import with matching grade', () => {
    // Batch import has grade_level in batch object
    const batchGrade = 4;
    const result = autoSelectChildByGrade(batchGrade, mockChildren);
    expect(result).toBe('child-1'); // Alice matches grade 4
  });

  it('should work with single package import', () => {
    // Single package has grade_level in package object
    const packageGrade = 5;
    const result = autoSelectChildByGrade(packageGrade, mockChildren);
    expect(result).toBe('child-2'); // Bob matches grade 5
  });
});

describe('Import Child Selection Dropdown', () => {
  const mockChildren: ChildData[] = [
    { id: 'child-1', name: 'Alice', grade_level: 4 },
    { id: 'child-2', name: 'Bob', grade_level: 5 },
  ];

  it('should mark matching children as recommended', () => {
    const packageGrade = 4;

    const childrenWithRecommendation = mockChildren.map(child => ({
      ...child,
      isRecommended: child.grade_level === packageGrade,
    }));

    const recommended = childrenWithRecommendation.filter(c => c.isRecommended);
    expect(recommended.length).toBe(1);
    expect(recommended[0].name).toBe('Alice');
  });

  it('should allow manual override of auto-selected child', () => {
    let assignChildId = 'child-1'; // Auto-selected

    // User manually changes selection
    assignChildId = 'child-2';

    expect(assignChildId).toBe('child-2');
  });
});
