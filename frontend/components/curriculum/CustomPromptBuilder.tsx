'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ObjectiveData, PromptMode, GeneratedPrompt } from '@/types/curriculum';
import SelectableTreemap from './SelectableTreemap';
import { getRandomThemes } from '@/lib/themes-expanded';

interface CustomPromptBuilderProps {
  childId: string;
  childName: string;
  childGradeLevel: number;
  selectedObjectives: Set<number>;
  objectiveDetails: Map<number, ObjectiveData>;
  onToggleObjective: (objectiveId: number, objective: ObjectiveData) => void;
}

// API response types for coverage data
interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
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

// Generate custom prompt based on configuration
function generateCustomPrompt(
  objectives: ObjectiveData[],
  mode: PromptMode,
  theme: string | undefined,
  gradeLevel: number
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

  // Calculate question count based on mode
  let questionCount: number;
  if (mode === 'deep') {
    // Deep: fewer questions, more depth per objective
    questionCount = Math.max(6, Math.min(10, objectives.length * 3));
  } else {
    // Broad: more questions spread across objectives
    questionCount = Math.max(10, Math.min(20, objectives.length * 4));
  }

  // Build skill command
  const skillName = subject === 'math' ? 'generate-math' : 'generate-reading';
  const codesStr = codes.join(', ');

  let prompt = `Use ${skillName} skill for årskurs ${gradeLevel}, ${questionCount} ${mode === 'deep' ? 'deep-focus' : ''} problems covering: ${codesStr}`;

  // Add theme if provided
  if (theme && theme.trim()) {
    prompt += `\n\nTheme: ${theme.trim()}`;
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
}: CustomPromptBuilderProps) {
  const [mode, setMode] = useState<PromptMode>('broad');
  const [theme, setTheme] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);

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

  // Generate random theme suggestions when component mounts or grade changes
  useEffect(() => {
    setSuggestedThemes(getRandomThemes(childGradeLevel, 12));
  }, [childGradeLevel]);

  // Calculate suggested objectives based on poor coverage
  const suggestedObjectives = useMemo(() => {
    if (!coverageData) return { math: [], reading: [] };

    interface ScoredObjective {
      objective: ObjectiveCoverage;
      category: CategoryCoverage;
      score: number; // Lower is worse coverage
    }

    const mathObjectives: ScoredObjective[] = [];
    const readingObjectives: ScoredObjective[] = [];

    coverageData.categories.forEach(category => {
      const isMath = category.categoryId.startsWith('MA-');
      const isReading = category.categoryId.startsWith('SV-');

      category.objectives.forEach(obj => {
        // Calculate coverage score (0-100, where 0 is worst)
        const score = obj.totalCount > 0
          ? (obj.correctCount / obj.totalCount) * 100
          : 0;

        const scoredObj: ScoredObjective = {
          objective: obj,
          category,
          score,
        };

        if (isMath) {
          mathObjectives.push(scoredObj);
        } else if (isReading) {
          readingObjectives.push(scoredObj);
        }
      });
    });

    // Sort by score (lowest first = worst coverage)
    // Prioritize: 0% coverage > low coverage > medium coverage
    const sortByWorstCoverage = (a: ScoredObjective, b: ScoredObjective) => {
      // If one has 0 attempts and the other doesn't, prioritize the one with 0 attempts
      const aHasAttempts = a.objective.totalCount > 0;
      const bHasAttempts = b.objective.totalCount > 0;

      if (!aHasAttempts && bHasAttempts) return -1;
      if (aHasAttempts && !bHasAttempts) return 1;

      // Both have attempts or both have no attempts - sort by score
      return a.score - b.score;
    };

    mathObjectives.sort(sortByWorstCoverage);
    readingObjectives.sort(sortByWorstCoverage);

    // Take top 4 of each subject
    return {
      math: mathObjectives.slice(0, 4),
      reading: readingObjectives.slice(0, 4),
    };
  }, [coverageData]);

  // Apply suggested objectives (choose subject with worst overall coverage)
  const applySuggestedObjectives = (subject: 'math' | 'reading') => {
    if (!coverageData) return;

    const suggestions = subject === 'math' ? suggestedObjectives.math : suggestedObjectives.reading;

    // Clear current selection
    selectedObjectives.forEach(id => {
      const obj = objectiveDetails.get(id);
      if (obj) {
        onToggleObjective(id, obj);
      }
    });

    // Apply suggestions
    suggestions.forEach(({ objective, category }) => {
      const subjectType: 'math' | 'reading' = category.categoryId.startsWith('MA-') ? 'math' : 'reading';

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
    return new Set(selectedObjectivesArray.map(o => o.subject));
  }, [selectedObjectivesArray]);

  const hasMixedSubjects = subjects.size > 1;
  const canGenerate = selectedObjectives.size > 0 && !hasMixedSubjects;

  // Auto-generate prompt whenever inputs change
  useEffect(() => {
    if (!canGenerate) {
      setGeneratedPrompt(null);
      return;
    }

    try {
      const prompt = generateCustomPrompt(
        selectedObjectivesArray,
        mode,
        theme,
        childGradeLevel
      );
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      setGeneratedPrompt(null);
    }
  }, [selectedObjectivesArray, mode, theme, childGradeLevel, canGenerate]);

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

      {/* Suggested Objectives Section */}
      {!loadingCoverage && coverageData && (suggestedObjectives.math.length > 0 || suggestedObjectives.reading.length > 0) && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            💡 Suggested Focus Areas (Poor Coverage)
          </h4>
          <p className="text-xs text-yellow-800 mb-3">
            These objectives have the lowest coverage. Select a subject to practice:
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Math Suggestions */}
            {suggestedObjectives.math.length > 0 && (
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
                  {suggestedObjectives.math.map(({ objective, score }) => (
                    <div key={objective.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{objective.code}</span>
                      <span className={`px-2 py-0.5 rounded ${
                        score === 0 ? 'bg-red-100 text-red-800' :
                        score < 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {objective.totalCount > 0
                          ? `${Math.round(score)}%`
                          : 'Not attempted'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading Suggestions */}
            {suggestedObjectives.reading.length > 0 && (
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
                  {suggestedObjectives.reading.map(({ objective, score }) => (
                    <div key={objective.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{objective.code}</span>
                      <span className={`px-2 py-0.5 rounded ${
                        score === 0 ? 'bg-red-100 text-red-800' :
                        score < 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {objective.totalCount > 0
                          ? `${Math.round(score)}%`
                          : 'Not attempted'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
      />

      {/* Coverage Type Toggle */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Coverage Type</h4>
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
              onClick={() => setSuggestedThemes(getRandomThemes(childGradeLevel, 12))}
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
                    if (!prev.trim()) {
                      return suggestedTheme;
                    }
                    return `${prev}, ${suggestedTheme}`;
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

        <input
          id="theme"
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g., marvel heroes and toilets, space exploration, soccer..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Click a theme above or type your own custom theme
        </p>
      </div>

      {/* Generated Prompt Display (auto-updates) */}
      {generatedPrompt && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Generated Prompt</h4>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {copiedFeedback ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-gray-200">
            {generatedPrompt.prompt}
          </pre>
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
        </div>
      )}
    </div>
  );
}
