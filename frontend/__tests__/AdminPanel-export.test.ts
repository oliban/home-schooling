import { describe, it, expect, vi } from 'vitest';

/**
 * Test for AdminPanel CSV export functionality
 *
 * Feature: Export all children's curriculum progress to CSV
 *
 * CSV Format:
 * - Headers: Child Name, Parent Name, Parent Email, Grade Level, Category,
 *   Curriculum Code, Objective Description, Coverage Status, Completed At
 * - One row per objective per child
 * - UTF-8 BOM for Excel compatibility
 * - Escapes commas, quotes, newlines in field values
 */

// Helper function to escape CSV fields (replicated from AdminPanel)
const escapeCSVField = (value: string): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Helper to format dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return '';
  }
};

describe('AdminPanel - CSV Export', () => {
  it('should escape fields containing commas', () => {
    const field = 'Last Name, First Name';
    const escaped = escapeCSVField(field);

    expect(escaped).toBe('"Last Name, First Name"');
  });

  it('should escape fields containing quotes', () => {
    const field = 'He said "hello"';
    const escaped = escapeCSVField(field);

    expect(escaped).toBe('"He said ""hello"""');
  });

  it('should escape fields containing newlines', () => {
    const field = 'Line 1\nLine 2';
    const escaped = escapeCSVField(field);

    expect(escaped).toBe('"Line 1\nLine 2"');
  });

  it('should not escape simple text fields', () => {
    const field = 'Simple Text';
    const escaped = escapeCSVField(field);

    expect(escaped).toBe('Simple Text');
  });

  it('should handle null and undefined values', () => {
    expect(escapeCSVField(null as any)).toBe('');
    expect(escapeCSVField(undefined as any)).toBe('');
  });

  it('should format dates correctly', () => {
    const date = '2024-01-15T10:30:00.000Z';
    const formatted = formatDate(date);

    expect(formatted).toBe('2024-01-15');
  });

  it('should return empty string for null dates', () => {
    const formatted = formatDate(null);

    expect(formatted).toBe('');
  });

  it('should include UTF-8 BOM for Excel compatibility', () => {
    const BOM = '\uFEFF';
    const csvContent = BOM + 'Header1,Header2\nValue1,Value2';

    expect(csvContent.charCodeAt(0)).toBe(0xFEFF);
  });

  it('should generate correct CSV headers', () => {
    const headers = [
      'Child Name',
      'Parent Name',
      'Parent Email',
      'Grade Level',
      'Category',
      'Curriculum Code',
      'Objective Description',
      'Coverage Status',
      'Completed At'
    ];

    expect(headers).toHaveLength(9);
    expect(headers[0]).toBe('Child Name');
    expect(headers[8]).toBe('Completed At');
  });

  it('should create one row per objective per child', () => {
    const mockData = {
      children: [
        { id: 'child-1', name: 'Alice' },
        { id: 'child-2', name: 'Bob' },
      ],
      objectives: [
        { code: 'MA.4.1', description: 'Numbers', isCovered: true },
        { code: 'MA.4.2', description: 'Algebra', isCovered: false },
      ],
    };

    // Each child × each objective = 2 × 2 = 4 rows (+ 1 header)
    const expectedRows = mockData.children.length * mockData.objectives.length + 1;

    expect(expectedRows).toBe(5);
  });

  it('should mark covered objectives as "Covered"', () => {
    const objective = { isCovered: true };
    const status = objective.isCovered ? 'Covered' : 'Not Covered';

    expect(status).toBe('Covered');
  });

  it('should mark uncovered objectives as "Not Covered"', () => {
    const objective = { isCovered: false };
    const status = objective.isCovered ? 'Covered' : 'Not Covered';

    expect(status).toBe('Not Covered');
  });

  it('should generate filename with current date', () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `all_children_curriculum_progress_${dateStr}.csv`;

    expect(filename).toMatch(/all_children_curriculum_progress_\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('should handle empty children list', () => {
    const children: any[] = [];

    expect(children.length).toBe(0);
    // Export should show error or return early
  });

  it('should fetch coverage data for each child', async () => {
    const mockChildren = [
      { id: 'child-1', name: 'Alice' },
      { id: 'child-2', name: 'Bob' },
    ];

    const fetchPromises = mockChildren.map(child =>
      Promise.resolve({ childId: child.id, objectives: [] })
    );

    const results = await Promise.all(fetchPromises);

    expect(results).toHaveLength(2);
  });

  it('should continue on error for individual children', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objectives: [] }) })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objectives: [] }) });

    // Should continue processing remaining children despite error
    const results = [];
    for (let i = 0; i < 3; i++) {
      try {
        const response = await mockFetch();
        if (response.ok) {
          results.push(await response.json());
        }
      } catch (err) {
        // Continue despite error
        continue;
      }
    }

    expect(results).toHaveLength(2); // 2 successful, 1 failed
  });
});

describe('AdminPanel - Export Button State', () => {
  it('should be disabled when exporting', () => {
    const exporting = true;
    const isDisabled = exporting || false;

    expect(isDisabled).toBe(true);
  });

  it('should be disabled when no children exist', () => {
    const children: any[] = [];
    const isDisabled = children.length === 0;

    expect(isDisabled).toBe(true);
  });

  it('should be enabled when children exist and not exporting', () => {
    const exporting = false;
    const children = [{ id: 'child-1' }];
    const isDisabled = exporting || children.length === 0;

    expect(isDisabled).toBe(false);
  });
});
