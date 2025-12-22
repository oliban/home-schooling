'use client';

import { useState, useEffect, useCallback } from 'react';
import { curriculum } from '@/lib/api';

interface SuggestedObjective {
  code: string;
  description: string;
  categoryName: string;
}

interface CategorizedGap {
  categoryId: string;
  categoryName: string;
  objectives: { code: string; description: string }[];
  gapCount: number;
}

interface PromptOption {
  label: string;
  prompt: string;
  description: string;
  gapsAddressed: number;
  reason: string;
}

interface SuggestionsData {
  childId: string;
  childName: string;
  childGradeLevel: number;
  totalGaps: number;
  categorizedGaps: CategorizedGap[];
  suggestedCodes: string[];
  suggestedObjectives: SuggestedObjective[];
  prompts: PromptOption[];
}

interface GenerationSuggestionsProps {
  childId: string;
  childName?: string;
}

export default function GenerationSuggestions({ childId, childName }: GenerationSuggestionsProps) {
  const [data, setData] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptOption | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('parentToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const suggestions = await curriculum.getGenerationSuggestions(token, childId);
      setData(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Auto-select first prompt when data loads
  useEffect(() => {
    if (data?.prompts && data.prompts.length > 0 && !selectedPrompt) {
      setSelectedPrompt(data.prompts[0]);
    }
  }, [data, selectedPrompt]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Generate New Content</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Generate New Content</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchSuggestions}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.totalGaps === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">Generate New Content</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🎉</div>
          <p className="font-medium text-green-600">All curriculum objectives are covered!</p>
          <p className="text-sm mt-2">Great job! {childName || 'The child'} has coverage for all objectives.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Generate New Content</h3>
          <p className="text-sm text-gray-600">
            {data.totalGaps} uncovered objectives for {childName || 'this child'}
          </p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
          Grade {data.childGradeLevel}
        </span>
      </div>

      {/* Selected Prompt Display */}
      {selectedPrompt && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-purple-800">Generation Prompt:</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                  {selectedPrompt.gapsAddressed} {selectedPrompt.gapsAddressed === 1 ? 'gap' : 'gaps'} addressed
                </span>
                <span className="text-xs text-purple-600">{selectedPrompt.description}</span>
              </div>
            </div>
            <button
              onClick={() => copyPrompt(selectedPrompt.prompt)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {/* Explanation */}
          <p className="text-sm text-purple-700 mb-2 italic">
            💡 {selectedPrompt.reason}
          </p>
          <p className="text-sm text-gray-700 font-mono bg-white p-3 rounded-lg border border-purple-200">
            {selectedPrompt.prompt}
          </p>
        </div>
      )}

      {/* Prompt Options */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Choose a package type:</p>
        <div className="flex flex-wrap gap-2">
          {data.prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => setSelectedPrompt(prompt)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedPrompt?.label === prompt.label
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'
              }`}
              title={prompt.reason}
            >
              <span>{prompt.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                selectedPrompt?.label === prompt.label
                  ? 'bg-purple-500 text-purple-100'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {prompt.gapsAddressed}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Objectives */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Recommended Objectives to Cover:</h4>
        <div className="flex flex-wrap gap-2">
          {data.suggestedObjectives.map((obj) => (
            <div
              key={obj.code}
              className="group relative px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors cursor-help"
            >
              {obj.code}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {obj.description}
                <div className="text-gray-400">{obj.categoryName}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps by Category */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">All Uncovered Objectives by Category:</h4>
        <div className="space-y-3">
          {data.categorizedGaps.map((category) => (
            <div key={category.categoryId} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                <span className="font-medium text-gray-800">{category.categoryName}</span>
                <span className="text-sm text-red-600 font-medium">
                  {category.gapCount} gaps
                </span>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {category.objectives.map((obj) => (
                  <span
                    key={obj.code}
                    className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium"
                    title={obj.description}
                  >
                    {obj.code}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
