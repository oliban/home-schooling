import { describe, it, expect } from 'vitest';
import { generateCSV } from '../components/curriculum/ExportButton';

// Mock coverage data for testing
const mockCoverageData = {
  childId: 'child-1',
  childGradeLevel: 3,
  categories: [
    {
      categoryId: '1',
      categoryName: 'Taluppfattning',
      totalObjectives: 3,
      coveredObjectives: 2,
      coveragePercentage: 67,
      objectives: [
        {
          id: 1,
          code: 'MA1-1A',
          description: 'Hela tal och deras egenskaper',
          isCovered: true,
          completedAt: '2025-01-15T10:30:00Z'
        },
        {
          id: 2,
          code: 'MA1-1B',
          description: 'Positionssystemet för tal i decimalform',
          isCovered: true,
          completedAt: '2025-01-16T14:20:00Z'
        },
        {
          id: 3,
          code: 'MA1-1C',
          description: 'Bråk och deras egenskaper',
          isCovered: false,
          completedAt: null
        }
      ]
    },
    {
      categoryId: '2',
      categoryName: 'Algebra',
      totalObjectives: 2,
      coveredObjectives: 0,
      coveragePercentage: 0,
      objectives: [
        {
          id: 4,
          code: 'MA1-2A',
          description: 'Matematiska uttryck',
          isCovered: false,
          completedAt: null
        },
        {
          id: 5,
          code: 'MA1-2B',
          description: 'Ekvationer och lösningar',
          isCovered: false,
          completedAt: null
        }
      ]
    }
  ],
  totalObjectives: 5,
  coveredObjectives: 2,
  coveragePercentage: 40
};

describe('ExportButton', () => {
  describe('generateCSV', () => {
    it('should include UTF-8 BOM at the start of CSV', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    it('should generate valid CSV header row', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n');
      const headerLine = lines[0].substring(1); // Remove BOM

      expect(headerLine).toBe(
        'Child Name,Grade Level,Category,Curriculum Code,Objective Description,Coverage Status,Completed At'
      );
    });

    it('should generate one row per objective', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n').filter(line => line.length > 0);

      // 1 header + 5 objectives = 6 lines
      expect(lines.length).toBe(6);
    });

    it('should include child name in every data row', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n').filter(line => line.length > 0);

      // Skip header, check all data rows
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].startsWith('Test Child,')).toBe(true);
      }
    });

    it('should mark covered objectives correctly', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n');

      // Find the row for MA1-1A (covered)
      const coveredRow = lines.find(line => line.includes('MA1-1A'));
      expect(coveredRow).toBeDefined();
      expect(coveredRow).toContain('Covered');

      // Find the row for MA1-1C (not covered)
      const notCoveredRow = lines.find(line => line.includes('MA1-1C'));
      expect(notCoveredRow).toBeDefined();
      expect(notCoveredRow).toContain('Not Covered');
    });

    it('should format completion dates as YYYY-MM-DD', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n');

      // Find row with completion date
      const rowWithDate = lines.find(line => line.includes('MA1-1A'));
      expect(rowWithDate).toBeDefined();
      expect(rowWithDate).toContain('2025-01-15');
    });

    it('should leave completion date empty for uncovered objectives', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n');

      // Find uncovered row
      const uncoveredRow = lines.find(line => line.includes('MA1-1C'));
      expect(uncoveredRow).toBeDefined();
      // Row should end with "Not Covered," (empty completion date)
      expect(uncoveredRow?.endsWith('Not Covered,')).toBe(true);
    });

    it('should include category name for each objective', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');

      expect(csv).toContain('Taluppfattning');
      expect(csv).toContain('Algebra');
    });

    it('should include grade level in data rows', () => {
      const csv = generateCSV(mockCoverageData, 'Test Child');
      const lines = csv.split('\r\n').filter(line => line.length > 0);

      // Check first data row contains grade level 3
      expect(lines[1]).toContain(',3,');
    });

    describe('special character escaping', () => {
      it('should escape fields containing commas', () => {
        const dataWithComma = {
          ...mockCoverageData,
          categories: [{
            ...mockCoverageData.categories[0],
            objectives: [{
              id: 1,
              code: 'MA1-1A',
              description: 'Addition, subtraction, and multiplication',
              isCovered: true,
              completedAt: '2025-01-15T10:30:00Z'
            }]
          }]
        };

        const csv = generateCSV(dataWithComma, 'Test Child');
        expect(csv).toContain('"Addition, subtraction, and multiplication"');
      });

      it('should escape fields containing quotes by doubling them', () => {
        const dataWithQuotes = {
          ...mockCoverageData,
          categories: [{
            ...mockCoverageData.categories[0],
            objectives: [{
              id: 1,
              code: 'MA1-1A',
              description: 'Using "greater than" symbols',
              isCovered: true,
              completedAt: '2025-01-15T10:30:00Z'
            }]
          }]
        };

        const csv = generateCSV(dataWithQuotes, 'Test Child');
        expect(csv).toContain('"Using ""greater than"" symbols"');
      });

      it('should escape fields containing newlines', () => {
        const dataWithNewline = {
          ...mockCoverageData,
          categories: [{
            ...mockCoverageData.categories[0],
            objectives: [{
              id: 1,
              code: 'MA1-1A',
              description: 'Line one\nLine two',
              isCovered: true,
              completedAt: '2025-01-15T10:30:00Z'
            }]
          }]
        };

        const csv = generateCSV(dataWithNewline, 'Test Child');
        expect(csv).toContain('"Line one\nLine two"');
      });

      it('should handle Swedish characters correctly', () => {
        const dataWithSwedish = {
          ...mockCoverageData,
          categories: [{
            ...mockCoverageData.categories[0],
            categoryName: 'Taluppfattning och räkning',
            objectives: [{
              id: 1,
              code: 'MA1-1A',
              description: 'Förstå hela tal och bråk',
              isCovered: true,
              completedAt: '2025-01-15T10:30:00Z'
            }]
          }]
        };

        const csv = generateCSV(dataWithSwedish, 'Test Björk');
        expect(csv).toContain('Test Björk');
        expect(csv).toContain('Taluppfattning och räkning');
        expect(csv).toContain('Förstå hela tal och bråk');
      });
    });

    describe('edge cases', () => {
      it('should handle empty categories array', () => {
        const emptyData = {
          ...mockCoverageData,
          categories: []
        };

        const csv = generateCSV(emptyData, 'Test Child');
        const lines = csv.split('\r\n').filter(line => line.length > 0);

        // Only header row
        expect(lines.length).toBe(1);
      });

      it('should handle child name with special characters', () => {
        const csv = generateCSV(mockCoverageData, 'Anna-Lisa');
        const lines = csv.split('\r\n').filter(line => line.length > 0);

        expect(lines[1].startsWith('Anna-Lisa,')).toBe(true);
      });

      it('should use CRLF line endings for Windows compatibility', () => {
        const csv = generateCSV(mockCoverageData, 'Test Child');

        // Check that we have CRLF line endings
        expect(csv).toContain('\r\n');
        // And not just LF
        const normalizedCsv = csv.replace(/\r\n/g, '');
        expect(normalizedCsv).not.toContain('\n');
      });
    });
  });
});
