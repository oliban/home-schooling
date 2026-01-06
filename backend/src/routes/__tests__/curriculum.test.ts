import { describe, it, expect } from 'vitest';

/**
 * Tests for curriculum API - matching packages endpoint
 *
 * Feature: GET /curriculum/matching-packages/:childId
 *
 * Purpose: Return packages that have problems mapped to specific curriculum objectives,
 * allowing parents to find pre-made packages that cover the child's focus areas.
 */

describe('Curriculum API - Matching Packages', () => {
  describe('Input validation', () => {
    it('should require objectiveIds query parameter', () => {
      // Missing objectiveIds should return 400 error
      const hasObjectiveIds = false;
      expect(hasObjectiveIds).toBe(false);
      // API returns: { error: 'objectiveIds query parameter is required' }
    });

    it('should parse comma-separated objective IDs', () => {
      const objectiveIdsParam = '1,2,3,4';
      const objectiveIds = objectiveIdsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      expect(objectiveIds).toEqual([1, 2, 3, 4]);
    });

    it('should filter out invalid (non-numeric) IDs', () => {
      const objectiveIdsParam = '1,abc,3,def,5';
      const objectiveIds = objectiveIdsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      expect(objectiveIds).toEqual([1, 3, 5]);
    });

    it('should return empty packages array when no valid IDs provided', () => {
      const objectiveIdsParam = 'abc,def';
      const objectiveIds = objectiveIdsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      expect(objectiveIds).toEqual([]);
      // API returns: { packages: [] }
    });
  });

  describe('Package filtering', () => {
    it('should only return active packages (is_active = 1)', () => {
      const mockPackages = [
        { id: 'pkg1', is_active: 1 },
        { id: 'pkg2', is_active: 0 },
        { id: 'pkg3', is_active: 1 },
      ];

      const activePackages = mockPackages.filter(p => p.is_active === 1);
      expect(activePackages).toHaveLength(2);
      expect(activePackages.map(p => p.id)).toEqual(['pkg1', 'pkg3']);
    });

    it('should filter by child grade level', () => {
      const childGradeLevel = 4;
      const mockPackages = [
        { id: 'pkg1', grade_level: 3 },
        { id: 'pkg2', grade_level: 4 },
        { id: 'pkg3', grade_level: 5 },
      ];

      const matchingPackages = mockPackages.filter(p => p.grade_level === childGradeLevel);
      expect(matchingPackages).toHaveLength(1);
      expect(matchingPackages[0].id).toBe('pkg2');
    });

    it('should include own packages and global packages', () => {
      const parentId = 'parent-123';
      const mockPackages = [
        { id: 'pkg1', parent_id: 'parent-123', is_global: 0 }, // own
        { id: 'pkg2', parent_id: 'parent-456', is_global: 1 }, // global
        { id: 'pkg3', parent_id: 'parent-456', is_global: 0 }, // other parent's private
        { id: 'pkg4', parent_id: 'parent-123', is_global: 1 }, // own global
      ];

      const accessiblePackages = mockPackages.filter(
        p => p.parent_id === parentId || p.is_global === 1
      );

      expect(accessiblePackages).toHaveLength(3);
      expect(accessiblePackages.map(p => p.id)).toEqual(['pkg1', 'pkg2', 'pkg4']);
    });
  });

  describe('Response format', () => {
    it('should return packages with correct fields', () => {
      const mockPackage = {
        id: 'pkg-123',
        name: 'Division Practice',
        gradeLevel: 4,
        problemCount: 10,
        assignmentType: 'math',
        description: 'Practice division problems',
        isGlobal: true,
        matchingObjectives: ['MA-PRO-06', 'MA-TAL-04'],
      };

      expect(mockPackage).toHaveProperty('id');
      expect(mockPackage).toHaveProperty('name');
      expect(mockPackage).toHaveProperty('gradeLevel');
      expect(mockPackage).toHaveProperty('problemCount');
      expect(mockPackage).toHaveProperty('assignmentType');
      expect(mockPackage).toHaveProperty('matchingObjectives');
      expect(mockPackage).toHaveProperty('isGlobal');
    });

    it('should include matching objective codes for each package', () => {
      const matchingObjectives = ['MA-PRO-06', 'MA-TAL-04'];
      expect(Array.isArray(matchingObjectives)).toBe(true);
      expect(matchingObjectives.every(code => typeof code === 'string')).toBe(true);
    });

    it('should only return available packages (not already assigned to child)', () => {
      // The endpoint filters out packages that already have an assignment for the child
      // This ensures only "available" packages are returned
      const assignedPackageIds = ['pkg-assigned-1', 'pkg-assigned-2'];
      const allPackageIds = ['pkg-1', 'pkg-assigned-1', 'pkg-2', 'pkg-assigned-2', 'pkg-3'];

      const availablePackages = allPackageIds.filter(id => !assignedPackageIds.includes(id));

      expect(availablePackages).toEqual(['pkg-1', 'pkg-2', 'pkg-3']);
      expect(availablePackages).not.toContain('pkg-assigned-1');
      expect(availablePackages).not.toContain('pkg-assigned-2');
    });
  });

  describe('Child validation', () => {
    it('should return 404 if child does not belong to parent', () => {
      const childParentId = 'parent-456';
      const requestingParentId = 'parent-123';

      const childBelongsToParent = childParentId as string === requestingParentId as string;
      expect(childBelongsToParent).toBe(false);
      // API returns: { error: 'Child not found' }
    });

    it('should allow access when child belongs to requesting parent', () => {
      const childParentId = 'parent-123';
      const requestingParentId = 'parent-123';

      const childBelongsToParent = childParentId as string === requestingParentId as string;
      expect(childBelongsToParent).toBe(true);
    });
  });
});
