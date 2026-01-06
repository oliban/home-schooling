'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ObjectiveData, PromptMode, GeneratedPrompt } from '@/types/curriculum';
import SelectableTreemap from './SelectableTreemap';
import { getRandomThemes } from '@/lib/themes-expanded';
import { adventures, curriculum, packages } from '@/lib/api';

interface CustomPromptBuilderProps {
  childId: string;
  childName: string;
  childGradeLevel: number;
  selectedObjectives: Set<number>;
  objectiveDetails: Map<number, ObjectiveData>;
  onToggleObjective: (objectiveId: number, objective: ObjectiveData) => void;
  subject?: 'math' | 'reading';
}

// API response types for coverage data
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
  score: number; // Priority score calculated by backend
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

// Matching package from API (only available packages - not yet assigned to child)
interface MatchingPackage {
  id: string;
  name: string;
  gradeLevel: number;
  problemCount: number;
  assignmentType: 'math' | 'reading';
  description: string | null;
  isGlobal: boolean;
  matchingObjectives: string[];
}

// Generate custom prompt based on configuration
function generateCustomPrompt(
  objectives: ObjectiveData[],
  mode: PromptMode,
  theme: string | undefined,
  gradeLevel: number,
  questionCount: number
): GeneratedPrompt {
  if (objectives.length === 0) {
    throw new Error('No objectives selected');
  }

  // Validate subject consistency
  const subjects = new Set(objectives.map(o => o.subject));
  if (subjects.size > 1) {
    throw new Error('Cannot mix math and reading objectives');
  }

  const subject = objectives[0].subject;
  const codes = objectives.map(o => o.code);

  // Build skill command
  const skillName = subject === 'math' ? 'generate-math' : 'generate-themed-reading';
  const codesStr = codes.join(', ');

  const modeStr = mode === 'deep' ? 'deep-focus ' : '';
  let prompt: string;

  // Format prompt differently for reading (themed stories) vs math
  if (subject === 'reading') {
    // Calculate story count and questions per story for themed reading
    // Aim for 3-5 stories with 3-5 questions each
    let storyCount = 3;
    let questionsPerStory = Math.ceil(questionCount / storyCount);

    // Adjust if questions per story is too high
    if (questionsPerStory > 5) {
      storyCount = Math.ceil(questionCount / 5);
      questionsPerStory = Math.ceil(questionCount / storyCount);
    }

    const themesText = theme && theme.trim() ? `, themes: ${theme.trim()}` : '';
    prompt = `Use ${skillName} skill for årskurs ${gradeLevel}, ${questionCount} problems covering: ${codesStr}${themesText}, ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}, ${questionsPerStory} questions per story`;
  } else {
    // Math prompt (unchanged)
    prompt = `Use ${skillName} skill for årskurs ${gradeLevel}, ${questionCount} ${modeStr}problems covering: ${codesStr}`;

    // Add theme if provided
    if (theme && theme.trim()) {
      prompt += `\n\nTheme: ${theme.trim()}`;
    }
  }

  return {
    prompt,
    objectiveCodes: codes,
    questionCount,
    subject,
    mode,
  };
}

export default function CustomPromptBuilder({
  childId,
  childName,
  childGradeLevel,
  selectedObjectives,
  objectiveDetails,
  onToggleObjective,
  subject,
}: CustomPromptBuilderProps) {
  const [mode, setMode] = useState<PromptMode>('broad');
  const [theme, setTheme] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const hasAutoApplied = useRef(false);

  // State for agent-based generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<{ assignmentId: string; title: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // State for matching packages section
  const [matchingPackages, setMatchingPackages] = useState<MatchingPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [assigningPackageId, setAssigningPackageId] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<{ packageId: string; name: string } | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Fetch coverage data
  const fetchCoverage = useCallback(async () => {
    if (!childId) return;

    setLoadingCoverage(true);
    try {
      const token = localStorage.getItem('parentToken');
      if (!token) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL!;
      const response = await fetch(`${API_URL}/curriculum/coverage/${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: CoverageData = await response.json();
        setCoverageData(data);
      }
    } catch (err) {
      console.error('Failed to fetch coverage:', err);
    } finally {
      setLoadingCoverage(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  // Generate random theme suggestions (show 8 options)
  useEffect(() => {
    setSuggestedThemes(getRandomThemes(childGradeLevel, 8));
  }, [childGradeLevel]);

  // Get suggested objectives based on priority scores from backend
  // Backend calculates scores in curriculum.ts using scoreObjective()
  const suggestedObjectives = useMemo(() => {
    if (!coverageData) {
      return { math: [], reading: [] };
    }

    interface ScoredObjective {
      objective: ObjectiveCoverage;
      category: CategoryCoverage;
      score: number;
    }

    const mathObjectives: ScoredObjective[] = [];
    const readingObjectives: ScoredObjective[] = [];

    coverageData.categories.forEach(category => {
      if (!category.objectives) {
        console.warn('[CustomPromptBuilder] Category has no objectives array:', category.categoryId);
        return;
      }

      category.objectives.forEach(obj => {
        const isMath = obj.code.startsWith('MA-');
        const isReading = obj.code.startsWith('SV-');

        if (!isMath && !isReading) {
          console.warn('[CustomPromptBuilder] Unknown objective type:', obj.code);
          return;
        }

        // Use score from backend API (calculated by scoreObjective in curriculum.ts)
        const scoredObj: ScoredObjective = {
          objective: obj,
          category,
          score: obj.score,
        };

        if (isMath) {
          mathObjectives.push(scoredObj);
        } else if (isReading) {
          readingObjectives.push(scoredObj);
        }
      });
    });

    // Sort by score (highest first = highest priority)
    mathObjectives.sort((a, b) => b.score - a.score);
    readingObjectives.sort((a, b) => b.score - a.score);

    // Take top 4 of each subject
    return {
      math: mathObjectives.slice(0, 4),
      reading: readingObjectives.slice(0, 4),
    };
  }, [coverageData]);

  // Auto-apply suggestions on initial load (prefer subject with worse overall coverage)
  useEffect(() => {
    // Only run once and only if we haven't auto-applied yet
    if (hasAutoApplied.current) return;
    if (!coverageData || loadingCoverage) return;
    if (selectedObjectives.size > 0) return; // User already has selections


    // Calculate which subject has worse overall coverage
    // Category IDs are lowercase Swedish names (algebra, geometri, lasforstaelse, etc.)
    // Reading category is 'lasforstaelse', all others are math
    const mathCategories = coverageData.categories.filter(c => c.categoryId !== 'lasforstaelse');
    const readingCategories = coverageData.categories.filter(c => c.categoryId === 'lasforstaelse');

    const mathCoverage = mathCategories.reduce((sum, c) => sum + c.coveragePercentage, 0) / Math.max(mathCategories.length, 1);
    const readingCoverage = readingCategories.reduce((sum, c) => sum + c.coveragePercentage, 0) / Math.max(readingCategories.length, 1);


    // Choose subject with worse coverage (or math if equal)
    const subject = readingCoverage < mathCoverage ? 'reading' : 'math';
    const allSuggestions = subject === 'math' ? suggestedObjectives.math : suggestedObjectives.reading;

    // Smart suggestion: Analyze the top objectives to determine strategy
    let objectiveCount = 3; // Default
    let recommendedMode: PromptMode = 'broad';

    if (allSuggestions.length > 0) {
      // Check if top objectives need deep focus (many attempts but low percentage)
      const needsDeepFocus = allSuggestions.slice(0, 2).every(s =>
        s.objective.totalCount >= 10 &&
        (s.objective.correctCount / s.objective.totalCount) < 0.7
      );

      // Check if top objectives are unpracticed (0 attempts)
      const allUnpracticed = allSuggestions.slice(0, 4).every(s => s.objective.totalCount === 0);

      if (needsDeepFocus) {
        // Deep focus strategy: 1-2 objectives with many questions each
        objectiveCount = 2;
        recommendedMode = 'deep';
        setQuestionCount(12); // More questions for deeper practice
      } else if (allUnpracticed) {
        // Introduction strategy: 3-4 new objectives
        objectiveCount = 4;
        recommendedMode = 'broad';
        setQuestionCount(16); // Spread questions across objectives
      } else {
        // Mixed strategy: 2-3 objectives
        objectiveCount = 3;
        recommendedMode = 'broad';
        setQuestionCount(12);
      }

      setMode(recommendedMode);
    }

    const suggestions = allSuggestions.slice(0, objectiveCount);

    if (suggestions.length > 0) {
      // Apply suggestions automatically
      suggestions.forEach(({ objective, category }) => {
        // Determine subject from objective code (SV-* = reading, MA-* = math)
        const subjectType: 'math' | 'reading' = objective.code.startsWith('SV-') ? 'reading' : 'math';

        const objectiveData: ObjectiveData = {
          id: objective.id,
          code: objective.code,
          description: objective.description,
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          subject: subjectType,
        };

        onToggleObjective(objective.id, objectiveData);
      });

      // Auto-fill theme field with 1-4 random themes
      const randomThemeCount = Math.floor(Math.random() * 4) + 1; // 1-4 themes
      const randomThemes = getRandomThemes(childGradeLevel, randomThemeCount);
      const themeString = randomThemes.join(', ');
      setTheme(themeString);

      hasAutoApplied.current = true;
    }
  }, [coverageData, loadingCoverage, suggestedObjectives, selectedObjectives.size, onToggleObjective, childGradeLevel]);

  // Fetch matching packages when suggested objectives change
  useEffect(() => {
    const fetchMatchingPackages = async () => {
      // Collect all objective IDs from suggestions
      const allObjectiveIds = [
        ...suggestedObjectives.math.map(s => s.objective.id),
        ...suggestedObjectives.reading.map(s => s.objective.id),
      ];

      if (allObjectiveIds.length === 0) {
        setMatchingPackages([]);
        return;
      }

      const token = localStorage.getItem('parentToken');
      if (!token) return;

      setLoadingPackages(true);
      try {
        const response = await curriculum.getMatchingPackages(token, childId, allObjectiveIds);
        setMatchingPackages(response.packages);
      } catch (err) {
        console.error('Failed to fetch matching packages:', err);
        setMatchingPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchMatchingPackages();
  }, [childId, suggestedObjectives]);

  // Handle assigning a package to the child
  const handleAssignPackage = async (pkg: MatchingPackage) => {
    const token = localStorage.getItem('parentToken');
    if (!token || assigningPackageId) return;

    setAssigningPackageId(pkg.id);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      await packages.assign(token, pkg.id, { childId, title: pkg.name, hintsAllowed: true });
      setAssignSuccess({ packageId: pkg.id, name: pkg.name });

      // Remove the package from the list since it's now assigned
      setMatchingPackages(prev => prev.filter(p => p.id !== pkg.id));
    } catch (err) {
      console.error('Failed to assign package:', err);
      setAssignError(err instanceof Error ? err.message : 'Failed to assign package');
    } finally {
      setAssigningPackageId(null);
    }
  };

  // Apply suggested objectives (choose subject with worst overall coverage)
  const applySuggestedObjectives = (subject: 'math' | 'reading') => {
    if (!coverageData) return;

    const suggestions = subject === 'math' ? suggestedObjectives.math : suggestedObjectives.reading;

    // Build list of all operations to perform
    const toRemove: number[] = [];
    const toAdd: Array<{ objective: ObjectiveCoverage; category: CategoryCoverage }> = [];

    // Figure out what needs to change
    const suggestedIds = new Set(suggestions.map(s => s.objective.id));

    // Items to remove: currently selected but not in suggestions
    selectedObjectives.forEach(id => {
      if (!suggestedIds.has(id)) {
        toRemove.push(id);
      }
    });

    // Items to add: in suggestions but not currently selected
    suggestions.forEach(item => {
      if (!selectedObjectives.has(item.objective.id)) {
        toAdd.push(item);
      }
    });

    // Execute all removals
    toRemove.forEach(id => {
      const obj = objectiveDetails.get(id);
      if (obj) {
        onToggleObjective(id, obj);
      }
    });

    // Wait for parent state to update before adding (parent has subject-mixing check)
    setTimeout(() => {
      toAdd.forEach(({ objective, category }) => {
        const subjectType: 'math' | 'reading' = objective.code.startsWith('SV-') ? 'reading' : 'math';

        const objectiveData: ObjectiveData = {
          id: objective.id,
          code: objective.code,
          description: objective.description,
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          subject: subjectType,
        };

        onToggleObjective(objective.id, objectiveData);
      });
    }, 50);
  };

  // Convert selected objectives to array
  const selectedObjectivesArray = useMemo(() => {
    return Array.from(selectedObjectives)
      .map(id => objectiveDetails.get(id))
      .filter((obj): obj is ObjectiveData => obj !== undefined);
  }, [selectedObjectives, objectiveDetails]);

  // Group objectives by category
  const objectivesByCategory = useMemo(() => {
    const groups = new Map<string, ObjectiveData[]>();
    selectedObjectivesArray.forEach(obj => {
      const existing = groups.get(obj.categoryName) || [];
      groups.set(obj.categoryName, [...existing, obj]);
    });
    return groups;
  }, [selectedObjectivesArray]);

  // Validation
  const subjects = useMemo(() => {
    const subjectsSet = new Set(selectedObjectivesArray.map(o => o.subject));
    return subjectsSet;
  }, [selectedObjectivesArray]);

  const hasMixedSubjects = subjects.size > 1;
  const canGenerate = selectedObjectives.size > 0 && !hasMixedSubjects;

  // Auto-generate prompt whenever inputs change
  useEffect(() => {

    // Don't clear prompt if we can't generate - just keep the old one
    if (!canGenerate) {
      return;
    }

    try {
      const prompt = generateCustomPrompt(
        selectedObjectivesArray,
        mode,
        theme,
        childGradeLevel,
        questionCount
      );
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      // Keep old prompt on error
    }
  }, [selectedObjectivesArray, mode, theme, childGradeLevel, questionCount, canGenerate, selectedObjectives.size]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!generatedPrompt) return;

    try {
      await navigator.clipboard.writeText(generatedPrompt.prompt);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle generate assignment with Claude agent
  const handleGenerate = async () => {
    if (!generatedPrompt || isGenerating) return;

    const token = localStorage.getItem('parentToken');
    if (!token) {
      setGenerationError('Not authenticated');
      return;
    }

    // Get objective details for the API call
    const objectives = Array.from(objectiveDetails.values())
      .filter(obj => generatedPrompt.objectiveCodes.includes(obj.code))
      .map(obj => ({
        code: obj.code,
        description: obj.description,
      }));

    if (objectives.length === 0) {
      setGenerationError('No objectives selected');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const result = await adventures.generateForParent(token, {
        childId,
        contentType: generatedPrompt.subject,
        theme: theme || 'vardagliga situationer', // Default theme if none provided
        questionCount: generatedPrompt.questionCount,
        objectives,
      });

      setGenerationSuccess({
        assignmentId: result.assignmentId,
        title: result.title,
      });
    } catch (error) {
      console.error('Failed to generate assignment:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate assignment');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Create Custom Assignment</h3>
          <p className="text-sm text-gray-600">
            Select objectives and customize your prompt
          </p>
        </div>
      </div>

      {/* Suggested Objectives Section - filtered by subject */}
      {!loadingCoverage && coverageData && (
        ((!subject || subject === 'math') && suggestedObjectives.math.length > 0) ||
        ((!subject || subject === 'reading') && suggestedObjectives.reading.length > 0)
      ) && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            💡 Suggested Focus Areas (Poor Coverage)
          </h4>
          <p className="text-xs text-yellow-800 mb-3">
            These objectives have the lowest coverage{subject ? '' : '. Select a subject to practice'}:
          </p>

          <div className={`grid ${!subject ? 'md:grid-cols-2' : ''} gap-3`}>
            {/* Math Suggestions - show only if no subject filter or subject is math */}
            {(!subject || subject === 'math') && suggestedObjectives.math.length > 0 && (
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-blue-800">📐 Math ({suggestedObjectives.math.length})</h5>
                  <button
                    onClick={() => applySuggestedObjectives('math')}
                    className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Use These
                  </button>
                </div>
                <div className="space-y-1">
                  {suggestedObjectives.math.map(({ objective, score }) => {
                    const percentage = objective.totalCount > 0
                      ? Math.round((objective.correctCount / objective.totalCount) * 100)
                      : 0;
                    return (
                      <div key={objective.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium text-gray-700">{objective.code}</span>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded ${
                            objective.totalCount === 0 ? 'bg-yellow-100 text-yellow-800' :
                            percentage < 50 ? 'bg-red-100 text-red-800' :
                            percentage < 70 ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {objective.totalCount > 0
                              ? `${percentage}%`
                              : 'Not attempted'}
                          </span>
                          {objective.totalCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                              {objective.totalCount}×
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reading Suggestions - show only if no subject filter or subject is reading */}
            {(!subject || subject === 'reading') && suggestedObjectives.reading.length > 0 && (
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-purple-800">📖 Reading ({suggestedObjectives.reading.length})</h5>
                  <button
                    onClick={() => applySuggestedObjectives('reading')}
                    className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Use These
                  </button>
                </div>
                <div className="space-y-1">
                  {suggestedObjectives.reading.map(({ objective, score }) => {
                    const percentage = objective.totalCount > 0
                      ? Math.round((objective.correctCount / objective.totalCount) * 100)
                      : 0;
                    return (
                      <div key={objective.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium text-gray-700">{objective.code}</span>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded ${
                            objective.totalCount === 0 ? 'bg-yellow-100 text-yellow-800' :
                            percentage < 50 ? 'bg-red-100 text-red-800' :
                            percentage < 70 ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {objective.totalCount > 0
                              ? `${percentage}%`
                              : 'Not attempted'}
                          </span>
                          {objective.totalCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                              {objective.totalCount}×
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matching Packages Section - filtered by subject */}
      {(() => {
        // Filter packages by subject if specified
        const filteredPackages = subject
          ? matchingPackages.filter(pkg => pkg.assignmentType === subject)
          : matchingPackages;

        return !loadingCoverage && (filteredPackages.length > 0 || loadingPackages) && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
            📦 Ready-to-Use Packages
          </h4>
          <p className="text-xs text-green-800 mb-3">
            These packages cover the focus areas above and can be assigned directly:
          </p>

          {loadingPackages ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              <span className="ml-2 text-sm text-green-700">Loading packages...</span>
            </div>
          ) : filteredPackages.length === 0 ? (
            <p className="text-sm text-green-700 italic">No matching packages found.</p>
          ) : (
            <>
              {assignSuccess && (
                <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-800">
                  ✅ &quot;{assignSuccess.name}&quot; assigned to {childName}!
                </div>
              )}
              {assignError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {assignError}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {filteredPackages.slice(0, 6).map(pkg => (
                  <div
                    key={pkg.id}
                    className="bg-white p-3 rounded-lg border border-green-300 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-gray-800 truncate" title={pkg.name}>
                          {pkg.name}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            pkg.assignmentType === 'math'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {pkg.assignmentType === 'math' ? '📐 Math' : '📖 Reading'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {pkg.problemCount} problems
                          </span>
                          {pkg.isGlobal && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                              Global
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Matching objectives */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pkg.matchingObjectives.slice(0, 3).map(code => (
                        <span
                          key={code}
                          className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium"
                        >
                          {code}
                        </span>
                      ))}
                      {pkg.matchingObjectives.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                          +{pkg.matchingObjectives.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-auto">
                      <button
                        onClick={() => handleAssignPackage(pkg)}
                        disabled={assigningPackageId === pkg.id}
                        className="w-full px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                      >
                        {assigningPackageId === pkg.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            Assigning...
                          </>
                        ) : (
                          <>Assign to {childName}</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredPackages.length > 6 && (
                <div className="mt-3 text-center">
                  <a
                    href={`/parent/packages?child=${childId}`}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Browse all {filteredPackages.length} packages →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
        );
      })()}

      {/* Selected Objectives Display */}
      {selectedObjectives.size > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Selected Objectives ({selectedObjectives.size})
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(objectivesByCategory.entries()).map(([categoryName, objectives]) => (
              <div key={categoryName} className="space-y-1">
                <p className="text-xs font-medium text-gray-500">{categoryName}</p>
                <div className="flex flex-wrap gap-1">
                  {objectives.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => onToggleObjective(obj.id, obj)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        obj.subject === 'math'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                      title={obj.description}
                    >
                      {obj.code}
                      <span className="text-xs">×</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for mixed subjects */}
      {hasMixedSubjects && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Cannot mix math and reading objectives
          </p>
          <p className="text-xs text-red-700 mt-1">
            Select only math OR reading objectives for one assignment
          </p>
        </div>
      )}

      {/* Selectable Treemap */}
      <SelectableTreemap
        childId={childId}
        childGradeLevel={childGradeLevel}
        selectedObjectives={selectedObjectives}
        onToggleObjective={onToggleObjective}
        subject={subject}
      />

      {/* Coverage Type Toggle + Question Count */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Coverage Type</h4>
          <div className="flex items-center gap-2">
            <label htmlFor="questionCount" className="text-sm font-semibold text-gray-700">
              Questions:
            </label>
            <input
              id="questionCount"
              type="number"
              min="1"
              max="50"
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-center text-sm"
              placeholder="10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('broad')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              mode === 'broad'
                ? 'border-green-600 bg-green-50 text-green-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Broad</div>
            <div className="text-xs mt-1">Mixed difficulty & topics</div>
          </button>
          <button
            onClick={() => setMode('deep')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              mode === 'deep'
                ? 'border-green-600 bg-green-50 text-green-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Deep</div>
            <div className="text-xs mt-1">Focused on specific topics</div>
          </button>
        </div>
      </div>

      {/* Theme Input */}
      <div className="mt-6">
        <label htmlFor="theme" className="block text-sm font-semibold text-gray-700 mb-2">
          Theme (Optional)
        </label>

        {/* Quick Theme Selection Buttons */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600">Quick select a theme:</p>
            <button
              onClick={() => setSuggestedThemes(getRandomThemes(childGradeLevel, 8))}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              🔄 Shuffle themes
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedThemes.map((suggestedTheme, index) => (
              <button
                key={index}
                onClick={() => {
                  // Append theme instead of replacing
                  setTheme(prev => {
                    const newTheme = !prev.trim() ? suggestedTheme : `${prev}, ${suggestedTheme}`;
                    return newTheme;
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-green-100 hover:text-green-800 transition-colors"
                title={`Click to add: ${suggestedTheme}`}
              >
                {suggestedTheme}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <input
            id="theme"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., marvel heroes and toilets, space exploration, soccer..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          {theme && (
            <button
              onClick={() => setTheme('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Clear theme"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Click a theme above or type your own custom theme
        </p>
      </div>

      {/* Generated Prompt Display (always visible, auto-updates) */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-green-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Generated Prompt</h4>
          {generatedPrompt && (
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {copiedFeedback ? '✓ Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {generatedPrompt ? (
          <>
            <textarea
              value={generatedPrompt.prompt}
              onChange={(e) => {
                setGeneratedPrompt({
                  ...generatedPrompt,
                  prompt: e.target.value,
                });
              }}
              rows={4}
              className="w-full text-sm text-gray-800 font-mono bg-white p-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {generatedPrompt.subject === 'math' ? '📐 Math' : '📖 Reading'}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                {generatedPrompt.questionCount} questions
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                {generatedPrompt.mode === 'broad' ? '🌐 Broad' : '🎯 Deep'} focus
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                {generatedPrompt.objectiveCodes.length} objective{generatedPrompt.objectiveCodes.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Generate Assignment Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {generationSuccess ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="font-medium">Assignment Created!</p>
                      <p className="text-sm text-green-700">&quot;{generationSuccess.title}&quot; has been assigned to {childName}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`/parent/assignments/${generationSuccess.assignmentId}`}
                      className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      View Assignment
                    </a>
                    <button
                      onClick={() => setGenerationSuccess(null)}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {generationError && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {generationError}
                    </div>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !generatedPrompt}
                    className="w-full px-4 py-3 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        Generate Assignment
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Uses AI to create {generatedPrompt.questionCount} questions based on selected objectives
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 bg-white p-3 rounded border border-gray-200 italic">
            {loadingCoverage ? 'Loading suggestions...' : 'Select objectives above to generate a prompt'}
          </div>
        )}
      </div>
    </div>
  );
}
