'use client';

import { useState, useEffect, useCallback } from 'react';
import { admin } from '@/lib/api';

interface AdminPanelProps {
  token: string;
}

interface Parent {
  id: string;
  email: string;
  name: string;
  family_code: string;
  is_admin: number;
  created_at: string;
}

interface Child {
  id: string;
  parent_id: string;
  parent_name: string;
  parent_email: string;
  name: string;
  grade_level: number;
  birthdate: string | null;
  created_at: string;
  active_assignments: number;
  completed_assignments: number;
  coins: number;
  collectibles_count: number;
}

interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  extendedDescription: string | null;
  requiresWorkShown: boolean;
  exampleProblems: string[] | null;
  keyConcepts: string[] | null;
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

// Escape CSV field values to handle commas, quotes, and newlines
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

export default function AdminPanel({ token }: AdminPanelProps) {
  const [expanded, setExpanded] = useState(true); // Expanded by default for admins
  const [parents, setParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (expanded) {
      loadData();
    }
  }, [expanded]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [parentsData, childrenData] = await Promise.all([
        admin.listParents(token),
        admin.listChildren(token),
      ]);
      setParents(parentsData);
      setChildren(childrenData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = useCallback(async () => {
    if (children.length === 0) {
      setExportError('No children to export');
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL!;

      // UTF-8 BOM for Excel compatibility
      const BOM = '\uFEFF';

      // CSV header row
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

      const rows: string[][] = [];
      rows.push(headers);

      // Fetch coverage data for all children
      for (const child of children) {
        try {
          const response = await fetch(`${API_URL}/curriculum/coverage/${child.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            console.error(`Failed to fetch coverage for child ${child.name}`);
            continue;
          }

          const data: CoverageData = await response.json();

          // Add data rows for this child
          for (const category of data.categories) {
            for (const objective of category.objectives) {
              rows.push([
                escapeCSVField(child.name),
                escapeCSVField(child.parent_name),
                escapeCSVField(child.parent_email),
                escapeCSVField(String(data.childGradeLevel)),
                escapeCSVField(category.categoryName),
                escapeCSVField(objective.code),
                escapeCSVField(objective.description),
                objective.isCovered ? 'Covered' : 'Not Covered',
                escapeCSVField(formatDate(objective.completedAt))
              ]);
            }
          }
        } catch (err) {
          console.error(`Error fetching coverage for child ${child.name}:`, err);
        }
      }

      // Generate CSV content
      const csvContent = BOM + rows.map(row => row.join(',')).join('\r\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `all_children_curriculum_progress_${dateStr}.csv`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  }, [children, token]);

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xl font-bold text-purple-900 hover:text-purple-700 transition-colors"
          >
            <span className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className="text-2xl mr-2">🔐</span>
            Admin Panel (System-wide Access)
            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold ml-2">
              ADMIN ONLY
            </span>
          </button>

          {expanded && (
            <button
              onClick={handleExportAll}
              disabled={exporting || children.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                exporting || children.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {exporting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  <span>Export All to CSV</span>
                </>
              )}
            </button>
          )}
        </div>

        {exportError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {exportError}
          </div>
        )}

        {expanded && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-gray-600">Loading...</div>
              ) : (
                <>
                  {/* All Parents Section */}
                  <div className="bg-purple-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">All Parents ({parents.length})</h3>
                <div className="space-y-2">
                  {parents.map((parent) => (
                    <div
                      key={parent.id}
                      className="bg-white p-4 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{parent.name}</p>
                        <p className="text-sm text-gray-600">{parent.email}</p>
                        <p className="text-xs text-gray-500">Family Code: {parent.family_code}</p>
                      </div>
                      {parent.is_admin === 1 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* All Children Section */}
              <div className="bg-blue-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">All Children ({children.length})</h3>
                <div className="space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="bg-white p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-gray-600">
                            Parent: {child.parent_name} ({child.parent_email})
                          </p>
                          <p className="text-sm text-gray-600">Grade {child.grade_level}</p>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Active</p>
                            <p className="text-lg font-bold text-orange-600">{child.active_assignments}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Completed</p>
                            <p className="text-lg font-bold text-green-600">{child.completed_assignments}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Coins</p>
                            <p className="text-lg font-bold text-yellow-600">{child.coins}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Brainrot</p>
                            <p className="text-lg font-bold text-purple-600">{child.collectibles_count}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
