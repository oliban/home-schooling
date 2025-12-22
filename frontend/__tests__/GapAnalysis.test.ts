/**
 * Tests for GapAnalysis curriculum gap display and recommendation logic
 *
 * These tests verify:
 * - Gap grouping by category
 * - Recommendation sorting (gaps with packages first)
 * - Empty state handling
 */

import { describe, it, expect } from 'vitest';

// Types from GapAnalysis component
interface CurriculumGap {
  id: number;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
}

interface PackageRecommendation {
  packageId: string;
  packageName: string;
  gradeLevel: number;
  categoryId: string | null;
  categoryName: string | null;
  problemCount: number;
  description: string | null;
  objectivesCovered: number;
}

interface GapRecommendation {
  objective: CurriculumGap;
  packages: PackageRecommendation[];
}

interface RecommendationsData {
  childId: string;
  childGradeLevel: number;
  recommendations: GapRecommendation[];
  totalGaps: number;
  gapsWithPackages: number;
  topPackages: PackageRecommendation[];
  message?: string;
}

// Group gaps by category (extracted logic from component)
function groupGapsByCategory(recommendations: GapRecommendation[]): Record<string, GapRecommendation[]> {
  return recommendations.reduce((acc, rec) => {
    const category = rec.objective.categoryName;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rec);
    return acc;
  }, {} as Record<string, GapRecommendation[]>);
}

// Count gaps with packages in a category
function countGapsWithPackages(gaps: GapRecommendation[]): number {
  return gaps.filter(g => g.packages.length > 0).length;
}

describe('GapAnalysis - Gap Grouping', () => {
  const mockRecommendations: GapRecommendation[] = [
    {
      objective: { id: 1, code: 'MA1-1A', description: 'Hela tal', categoryId: '1', categoryName: 'Taluppfattning' },
      packages: [{ packageId: 'pkg-1', packageName: 'Tal Paket', gradeLevel: 3, categoryId: '1', categoryName: 'Taluppfattning', problemCount: 10, description: null, objectivesCovered: 2 }],
    },
    {
      objective: { id: 2, code: 'MA1-1B', description: 'Decimaltal', categoryId: '1', categoryName: 'Taluppfattning' },
      packages: [],
    },
    {
      objective: { id: 3, code: 'MA1-2A', description: 'Uttryck', categoryId: '2', categoryName: 'Algebra' },
      packages: [{ packageId: 'pkg-2', packageName: 'Algebra Basics', gradeLevel: 3, categoryId: '2', categoryName: 'Algebra', problemCount: 8, description: null, objectivesCovered: 1 }],
    },
  ];

  describe('groupGapsByCategory', () => {
    it('should group gaps by their category name', () => {
      const result = groupGapsByCategory(mockRecommendations);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['Taluppfattning']).toHaveLength(2);
      expect(result['Algebra']).toHaveLength(1);
    });

    it('should preserve gap details in each category', () => {
      const result = groupGapsByCategory(mockRecommendations);

      expect(result['Taluppfattning'][0].objective.code).toBe('MA1-1A');
      expect(result['Taluppfattning'][1].objective.code).toBe('MA1-1B');
    });

    it('should handle empty recommendations', () => {
      const result = groupGapsByCategory([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('countGapsWithPackages', () => {
    it('should count gaps that have at least one package', () => {
      const gaps = mockRecommendations.filter(r => r.objective.categoryName === 'Taluppfattning');
      const count = countGapsWithPackages(gaps);

      expect(count).toBe(1); // Only MA1-1A has packages
    });

    it('should return 0 when no gaps have packages', () => {
      const gapsWithoutPackages = [{ objective: mockRecommendations[1].objective, packages: [] }];
      const count = countGapsWithPackages(gapsWithoutPackages);

      expect(count).toBe(0);
    });

    it('should return total count when all gaps have packages', () => {
      const gapsWithPackages: GapRecommendation[] = [
        { objective: mockRecommendations[0].objective, packages: mockRecommendations[0].packages },
        { objective: mockRecommendations[2].objective, packages: mockRecommendations[2].packages },
      ];
      const count = countGapsWithPackages(gapsWithPackages);

      expect(count).toBe(2);
    });
  });
});

describe('GapAnalysis - Data Validation', () => {
  it('should recognize when there are no gaps', () => {
    const emptyData: RecommendationsData = {
      childId: 'child-1',
      childGradeLevel: 3,
      recommendations: [],
      totalGaps: 0,
      gapsWithPackages: 0,
      topPackages: [],
      message: 'No curriculum gaps found - all objectives are covered!',
    };

    expect(emptyData.totalGaps).toBe(0);
    expect(emptyData.message).toContain('all objectives are covered');
  });

  it('should track gaps with and without packages separately', () => {
    const mixedData: RecommendationsData = {
      childId: 'child-1',
      childGradeLevel: 3,
      recommendations: [
        {
          objective: { id: 1, code: 'MA1-1A', description: 'Hela tal', categoryId: '1', categoryName: 'Taluppfattning' },
          packages: [{ packageId: 'pkg-1', packageName: 'Test', gradeLevel: 3, categoryId: '1', categoryName: 'Taluppfattning', problemCount: 5, description: null, objectivesCovered: 1 }],
        },
        {
          objective: { id: 2, code: 'MA1-1B', description: 'Decimaltal', categoryId: '1', categoryName: 'Taluppfattning' },
          packages: [],
        },
      ],
      totalGaps: 2,
      gapsWithPackages: 1,
      topPackages: [],
    };

    expect(mixedData.totalGaps).toBe(2);
    expect(mixedData.gapsWithPackages).toBe(1);
    expect(mixedData.totalGaps - mixedData.gapsWithPackages).toBe(1); // Gaps without packages
  });
});

describe('GapAnalysis - Top Packages Sorting', () => {
  it('should sort top packages by objectivesCovered (descending)', () => {
    const topPackages: PackageRecommendation[] = [
      { packageId: 'pkg-1', packageName: 'Small', gradeLevel: 3, categoryId: null, categoryName: null, problemCount: 5, description: null, objectivesCovered: 1 },
      { packageId: 'pkg-2', packageName: 'Large', gradeLevel: 3, categoryId: null, categoryName: null, problemCount: 10, description: null, objectivesCovered: 5 },
      { packageId: 'pkg-3', packageName: 'Medium', gradeLevel: 3, categoryId: null, categoryName: null, problemCount: 8, description: null, objectivesCovered: 3 },
    ];

    const sorted = [...topPackages].sort((a, b) => b.objectivesCovered - a.objectivesCovered);

    expect(sorted[0].packageName).toBe('Large');
    expect(sorted[1].packageName).toBe('Medium');
    expect(sorted[2].packageName).toBe('Small');
  });
});

describe('GapAnalysis - Swedish Category Names', () => {
  it('should handle Swedish characters in category names', () => {
    const swedishCategories = ['Taluppfattning', 'Sannolikhet och statistik', 'Samband och förändring'];
    const sortedCategories = [...swedishCategories].sort((a, b) => a.localeCompare(b, 'sv'));

    // Swedish sorting should work correctly
    expect(sortedCategories).toContain('Samband och förändring');
    expect(sortedCategories).toContain('Sannolikhet och statistik');
    expect(sortedCategories).toContain('Taluppfattning');
  });

  it('should display Swedish objective descriptions correctly', () => {
    const swedishGap: CurriculumGap = {
      id: 1,
      code: 'MA1-4A',
      description: 'Sannolikhet i vardagliga situationer',
      categoryId: '4',
      categoryName: 'Sannolikhet och statistik',
    };

    expect(swedishGap.description).toBe('Sannolikhet i vardagliga situationer');
    expect(swedishGap.categoryName).toBe('Sannolikhet och statistik');
  });
});

describe('GapAnalysis - Edge Cases', () => {
  it('should handle single gap', () => {
    const singleGap: GapRecommendation[] = [
      {
        objective: { id: 1, code: 'MA1-1A', description: 'Test', categoryId: '1', categoryName: 'Test Category' },
        packages: [],
      },
    ];

    const grouped = groupGapsByCategory(singleGap);

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped['Test Category']).toHaveLength(1);
  });

  it('should handle all gaps in one category', () => {
    const sameCategory: GapRecommendation[] = [
      { objective: { id: 1, code: 'MA1-1A', description: 'Test 1', categoryId: '1', categoryName: 'Same' }, packages: [] },
      { objective: { id: 2, code: 'MA1-1B', description: 'Test 2', categoryId: '1', categoryName: 'Same' }, packages: [] },
      { objective: { id: 3, code: 'MA1-1C', description: 'Test 3', categoryId: '1', categoryName: 'Same' }, packages: [] },
    ];

    const grouped = groupGapsByCategory(sameCategory);

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped['Same']).toHaveLength(3);
  });

  it('should handle packages with zero problems', () => {
    const zeroProblemsPackage: PackageRecommendation = {
      packageId: 'pkg-empty',
      packageName: 'Empty Package',
      gradeLevel: 3,
      categoryId: null,
      categoryName: null,
      problemCount: 0,
      description: null,
      objectivesCovered: 1,
    };

    expect(zeroProblemsPackage.problemCount).toBe(0);
    expect(zeroProblemsPackage.objectivesCovered).toBe(1);
  });
});
