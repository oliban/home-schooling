'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/LanguageContext';

// API response types (matching CoverageChart)
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

interface ExportButtonProps {
  childId: string;
  childName: string;
}

// Escape CSV field values to handle commas, quotes, and newlines
const escapeCSVField = (value: string): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // If the field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Format date for CSV export
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return '';
  }
};

// Generate CSV content from coverage data
export const generateCSV = (data: CoverageData, childName: string): string => {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // CSV header row
  const headers = [
    'Child Name',
    'Grade Level',
    'Category',
    'Curriculum Code',
    'Objective Description',
    'Coverage Status',
    'Completed At'
  ];

  const rows: string[][] = [];

  // Add header row
  rows.push(headers);

  // Add data rows - one row per objective
  for (const category of data.categories) {
    for (const objective of category.objectives) {
      rows.push([
        escapeCSVField(childName),
        escapeCSVField(String(data.childGradeLevel)),
        escapeCSVField(category.categoryName),
        escapeCSVField(objective.code),
        escapeCSVField(objective.description),
        objective.isCovered ? 'Covered' : 'Not Covered',
        escapeCSVField(formatDate(objective.completedAt))
      ]);
    }
  }

  // Join rows with newlines and fields with commas
  const csvContent = rows.map(row => row.join(',')).join('\r\n');

  return BOM + csvContent;
};

// Trigger file download
const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
};

export default function ExportButton({ childId, childName }: ExportButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('parentToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL!;
      const response = await fetch(`${API_URL}/curriculum/coverage/${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coverage data');
      }

      const data: CoverageData = await response.json();

      // Generate CSV content
      const csvContent = generateCSV(data, childName);

      // Generate filename with date and child name (sanitize for filesystem)
      const sanitizedChildName = childName.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `curriculum_progress_${sanitizedChildName}_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  }, [childId, childName]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Export Progress Report</h2>
          <p className="text-sm text-gray-600">
            Download curriculum coverage as CSV for compliance documentation
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={loading || !childId}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            loading || !childId
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
