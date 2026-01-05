/**
 * Tests for CoverageChart curriculum coverage display logic
 *
 * These tests verify:
 * - Coverage color coding (green/yellow/red)
 * - Treemap data transformation
 * - Coverage percentage calculations
 */

import { describe, it, expect } from 'vitest';

// Coverage color functions (extracted from component)
const getCoverageColor = (coverage: number): string => {
  if (coverage === 0) return '#ef4444';   // red-500 - not covered
  if (coverage < 20) return '#fca5a5';    // red-300 - minimal coverage
  if (coverage < 40) return '#fde047';    // yellow-300 - low coverage
  if (coverage < 60) return '#bef264';    // lime-300 - moderate coverage
  if (coverage < 80) return '#4ade80';    // green-400 - good coverage
  if (coverage < 100) return '#22c55e';   // green-500 - high coverage
  return '#15803d';                        // green-700 - fully covered
};

const getCoverageColorLight = (coverage: number): string => {
  if (coverage === 0) return '#fee2e2';   // red-100 - not covered
  if (coverage < 20) return '#fecaca';    // red-200 - minimal coverage
  if (coverage < 40) return '#fef3c7';    // yellow-100 - low coverage
  if (coverage < 60) return '#ecfccb';    // lime-100 - moderate coverage
  if (coverage < 80) return '#dcfce7';    // green-100 - good coverage
  if (coverage < 100) return '#bbf7d0';   // green-200 - high coverage
  return '#86efac';                        // green-300 - fully covered
};

// API response types
interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  score: number;
}

interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
  objectives: ObjectiveCoverage[];
}

interface CoverageData {
  childId: string;
  childGradeLevel: number;
  categories: CategoryCoverage[];
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
}

// Treemap data transformation (extracted from component)
function transformToCategoryView(data: CoverageData) {
  return data.categories.map(category => ({
    name: category.categoryName,
    size: category.totalObjectives * 100,
    coverage: category.coveragePercentage,
    totalObjectives: category.totalObjectives,
    coveredObjectives: category.coveredObjectives,
    isCategory: true,
  }));
}

function transformToObjectiveView(data: CoverageData) {
  return data.categories.map(category => ({
    name: category.categoryName,
    coverage: category.coveragePercentage,
    totalObjectives: category.totalObjectives,
    coveredObjectives: category.coveredObjectives,
    children: category.objectives.map(obj => ({
      name: obj.code,
      size: 100, // Equal size for all objectives
      coverage: obj.isCovered ? 100 : 0,
      code: obj.code,
      description: obj.description,
      categoryName: category.categoryName,
      isCovered: obj.isCovered,
    })),
  }));
}

describe('CoverageChart - Color Coding', () => {
  describe('getCoverageColor', () => {
    it('should return darkest green for 100% coverage', () => {
      expect(getCoverageColor(100)).toBe('#15803d');
    });

    it('should return gradient colors based on coverage percentage', () => {
      expect(getCoverageColor(0)).toBe('#ef4444');    // red - not covered
      expect(getCoverageColor(10)).toBe('#fca5a5');   // light red - minimal
      expect(getCoverageColor(30)).toBe('#fde047');   // yellow - low
      expect(getCoverageColor(50)).toBe('#bef264');   // lime - moderate
      expect(getCoverageColor(70)).toBe('#4ade80');   // light green - good
      expect(getCoverageColor(90)).toBe('#22c55e');   // green - high
    });

    it('should return red for 0% coverage', () => {
      expect(getCoverageColor(0)).toBe('#ef4444');
    });
  });

  describe('getCoverageColorLight', () => {
    it('should return darkest green for 100% coverage', () => {
      expect(getCoverageColorLight(100)).toBe('#86efac');
    });

    it('should return lime for 50% coverage', () => {
      expect(getCoverageColorLight(50)).toBe('#ecfccb');
    });

    it('should return light red for 0% coverage', () => {
      expect(getCoverageColorLight(0)).toBe('#fee2e2');
    });
  });
});

describe('CoverageChart - Data Transformation', () => {
  const mockCoverageData: CoverageData = {
    childId: 'child-1',
    childGradeLevel: 3,
    categories: [
      {
        categoryId: '1',
        categoryName: 'Taluppfattning',
        totalObjectives: 10,
        coveredObjectives: 5,
        coveragePercentage: 50,
        objectives: [
          { id: 1, code: 'MA1-1A', description: 'Hela tal', isCovered: true, completedAt: '2024-01-01' },
          { id: 2, code: 'MA1-1B', description: 'Decimaltal', isCovered: false, completedAt: null },
        ],
      },
      {
        categoryId: '2',
        categoryName: 'Algebra',
        totalObjectives: 8,
        coveredObjectives: 8,
        coveragePercentage: 100,
        objectives: [
          { id: 3, code: 'MA1-2A', description: 'Uttryck', isCovered: true, completedAt: '2024-01-02' },
        ],
      },
    ],
    totalObjectives: 18,
    coveredObjectives: 13,
    coveragePercentage: 72,
  };

  describe('transformToCategoryView', () => {
    it('should transform categories to flat treemap data', () => {
      const result = transformToCategoryView(mockCoverageData);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Taluppfattning');
      expect(result[0].size).toBe(1000); // 10 objectives * 100
      expect(result[0].coverage).toBe(50);
      expect(result[0].isCategory).toBe(true);
    });

    it('should include all category metadata', () => {
      const result = transformToCategoryView(mockCoverageData);

      expect(result[0].totalObjectives).toBe(10);
      expect(result[0].coveredObjectives).toBe(5);
      expect(result[1].coverage).toBe(100);
    });
  });

  describe('transformToObjectiveView', () => {
    it('should transform categories with nested objectives', () => {
      const result = transformToObjectiveView(mockCoverageData);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Taluppfattning');
      expect(result[0].children).toHaveLength(2);
    });

    it('should include objective details in children', () => {
      const result = transformToObjectiveView(mockCoverageData);

      const firstObjective = result[0].children[0];
      expect(firstObjective.name).toBe('MA1-1A');
      expect(firstObjective.code).toBe('MA1-1A');
      expect(firstObjective.description).toBe('Hela tal');
      expect(firstObjective.isCovered).toBe(true);
      expect(firstObjective.coverage).toBe(100);
    });

    it('should set coverage to 0 for uncovered objectives', () => {
      const result = transformToObjectiveView(mockCoverageData);

      const uncoveredObjective = result[0].children[1];
      expect(uncoveredObjective.isCovered).toBe(false);
      expect(uncoveredObjective.coverage).toBe(0);
    });

    it('should include category name in objective data', () => {
      const result = transformToObjectiveView(mockCoverageData);

      expect(result[0].children[0].categoryName).toBe('Taluppfattning');
    });
  });
});

describe('CoverageChart - Edge Cases', () => {
  it('should handle empty categories array', () => {
    const emptyData: CoverageData = {
      childId: 'child-1',
      childGradeLevel: 1,
      categories: [],
      totalObjectives: 0,
      coveredObjectives: 0,
      coveragePercentage: 0,
    };

    const categoryResult = transformToCategoryView(emptyData);
    const objectiveResult = transformToObjectiveView(emptyData);

    expect(categoryResult).toHaveLength(0);
    expect(objectiveResult).toHaveLength(0);
  });

  it('should handle category with no objectives', () => {
    const noObjectivesData: CoverageData = {
      childId: 'child-1',
      childGradeLevel: 1,
      categories: [
        {
          categoryId: '1',
          categoryName: 'Empty Category',
          totalObjectives: 0,
          coveredObjectives: 0,
          coveragePercentage: 0,
          objectives: [],
        },
      ],
      totalObjectives: 0,
      coveredObjectives: 0,
      coveragePercentage: 0,
    };

    const result = transformToObjectiveView(noObjectivesData);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(0);
  });

  it('should handle Swedish category names', () => {
    const swedishData: CoverageData = {
      childId: 'child-1',
      childGradeLevel: 1,
      categories: [
        {
          categoryId: '1',
          categoryName: 'Sannolikhet och statistik',
          totalObjectives: 5,
          coveredObjectives: 2,
          coveragePercentage: 40,
          objectives: [
            { id: 1, code: 'MA1-4A', description: 'Sannolikhet i vardagen', isCovered: true, completedAt: '2024-01-01' },
          ],
        },
      ],
      totalObjectives: 5,
      coveredObjectives: 2,
      coveragePercentage: 40,
    };

    const result = transformToCategoryView(swedishData);

    expect(result[0].name).toBe('Sannolikhet och statistik');
  });
});
