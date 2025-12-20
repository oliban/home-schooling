'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { packages, children } from '@/lib/api';

interface ChildAssignment {
  childId: string;
  childName: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface PackageData {
  id: string;
  name: string;
  grade_level: number;
  category_id: string | null;
  category_name: string | null;
  problem_count: number;
  difficulty_summary: string | null;
  description: string | null;
  is_global: number;
  created_at: string;
  isOwner: boolean;
  childAssignments: ChildAssignment[];
}

interface ChildData {
  id: string;
  name: string;
  grade_level: number;
}

export default function PackageBrowser() {
  const router = useRouter();
  const [packagesList, setPackagesList] = useState<PackageData[]>([]);
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const [packagesData, childrenData] = await Promise.all([
        packages.list(token),
        children.list(token),
      ]);
      setPackagesList(packagesData);
      setChildrenList(childrenData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (grade: number | null) => {
    setGradeFilter(grade);
    const token = localStorage.getItem('parentToken');
    if (!token) return;

    try {
      const data = await packages.list(token, grade ? { grade } : undefined);
      setPackagesList(data);
    } catch (err) {
      console.error('Failed to filter packages:', err);
    }
  };

  const parseDifficulty = (summary: string | null): Record<string, number> => {
    if (!summary) return {};
    try {
      return JSON.parse(summary);
    } catch {
      return {};
    }
  };

  // Get unique grades from children
  const childGrades = [...new Set(childrenList.map(c => c.grade_level))].sort((a, b) => a - b);

  // Group packages by grade
  const packagesByGrade = packagesList.reduce((acc, pkg) => {
    const grade = pkg.grade_level;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(pkg);
    return acc;
  }, {} as Record<number, PackageData[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parent" className="text-gray-500 hover:text-gray-700">
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold">Problem Packages</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Grade Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => handleFilterChange(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              gradeFilter === null
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Grades
          </button>
          {childGrades.map((grade) => (
            <button
              key={grade}
              onClick={() => handleFilterChange(grade)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                gradeFilter === grade
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Grade {grade}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {packagesList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-600 mb-4">No packages available yet</p>
            <Link
              href="/parent"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
            >
              Import a Package
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(packagesByGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, pkgs]) => (
                <div key={grade}>
                  <h2 className="text-lg font-bold mb-4 text-gray-700">
                    Grade {grade}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({pkgs.length} package{pkgs.length !== 1 ? 's' : ''})
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pkgs.map((pkg) => {
                      const difficulty = parseDifficulty(pkg.difficulty_summary);
                      return (
                        <Link
                          key={pkg.id}
                          href={`/parent/packages/${pkg.id}`}
                          className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-lg leading-tight">{pkg.name}</h3>
                            {pkg.is_global ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                Global
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                Private
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-500 mb-3">
                            {pkg.problem_count} problems
                            {pkg.category_name && ` | ${pkg.category_name}`}
                          </div>

                          {pkg.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}

                          <div className="flex gap-2 text-xs">
                            {difficulty.easy && (
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded">
                                {difficulty.easy} easy
                              </span>
                            )}
                            {difficulty.medium && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded">
                                {difficulty.medium} medium
                              </span>
                            )}
                            {difficulty.hard && (
                              <span className="px-2 py-1 bg-red-50 text-red-600 rounded">
                                {difficulty.hard} hard
                              </span>
                            )}
                          </div>

                          {pkg.childAssignments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-gray-500 mb-1">Assigned to:</div>
                              <div className="flex flex-wrap gap-1">
                                {pkg.childAssignments.map((ca) => (
                                  <span
                                    key={ca.childId}
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      ca.status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : ca.status === 'in_progress'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {ca.childName}: {ca.status === 'completed' ? 'Done' : ca.status === 'in_progress' ? 'In progress' : 'Pending'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {pkg.isOwner && (
                            <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                              Created by you
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
