'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children, assignments, admin } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

interface ChildOption {
  id: string;
  name: string;
  grade_level: number;
  parent_name?: string;
  parent_id?: string;
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [childrenList, setChildrenList] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [type, setType] = useState<'math' | 'reading'>('math');
  const [title, setTitle] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
      return;
    }
    loadChildren(token);
  }, [router]);

  const loadChildren = async (token: string) => {
    try {
      // Check if user is admin
      const parentData = localStorage.getItem('parentData');
      const isAdmin = parentData ? JSON.parse(parentData).isAdmin : false;

      // Admin users see all children, regular users see only their own
      const list = isAdmin
        ? await admin.listChildren(token)
        : await children.list(token);

      setChildrenList(list.map(c => ({
        id: c.id,
        name: c.name,
        grade_level: c.grade_level,
        parent_name: (c as any).parent_name,
        parent_id: (c as any).parent_id
      })));
      if (list.length > 0) {
        setSelectedChild(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedChild) {
      setError(t('parent.assignment.errors.selectChild'));
      return;
    }

    if (!title.trim()) {
      setError(t('parent.assignment.errors.enterTitle'));
      return;
    }

    if (!jsonContent.trim()) {
      setError(t('parent.assignment.errors.pasteJson'));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      setError(t('parent.assignment.errors.invalidJson'));
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setSubmitting(true);
    try {
      const selectedChildData = childrenList.find(c => c.id === selectedChild);

      if (type === 'math') {
        await assignments.create(token, {
          childId: selectedChild,
          type: 'math',
          title,
          gradeLevel: selectedChildData?.grade_level,
          problems: parsed.problems || parsed,
        });
      } else {
        await assignments.create(token, {
          childId: selectedChild,
          type: 'reading',
          title,
          gradeLevel: selectedChildData?.grade_level,
          questions: parsed.questions || parsed,
        });
      }

      router.push('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.assignment.errors.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const exampleMath = `{
  "problems": [
    {
      "question_text": "Vad ar 5 + 3?",
      "correct_answer": "8",
      "answer_type": "number"
    },
    {
      "question_text": "Vilken siffra ar storst?",
      "correct_answer": "C",
      "answer_type": "multiple_choice",
      "options": ["A: 12", "B: 9", "C: 15", "D: 11"]
    }
  ]
}`;

  const exampleReading = `{
  "questions": [
    {
      "question_text": "Vad hette huvudpersonen?",
      "correct_answer": "B",
      "options": ["A: Erik", "B: Pippi", "C: Annika", "D: Tommy"]
    }
  ]
}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (childrenList.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/parent" className="text-2xl hover:scale-110 transition-transform">
              ←
            </Link>
            <h1 className="text-2xl font-bold">{t('parent.assignment.createTitle')}</h1>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
            <div className="text-4xl mb-4">👶</div>
            <p className="text-gray-600 mb-4">{t('parent.assignment.addChildFirst')}</p>
            <Link
              href="/parent/children/add"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
            >
              {t('parent.assignment.buttons.addChild')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/parent" className="text-2xl hover:scale-110 transition-transform">
            ←
          </Link>
          <h1 className="text-2xl font-bold">{t('parent.assignment.createTitle')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parent.assignment.child')}
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
              >
                {childrenList.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name} ({t('parent.child.gradeLevelLabel', { grade: child.grade_level })})
                    {child.parent_name && ` - Parent: ${child.parent_name}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parent.assignment.type')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('math')}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    type === 'math'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  📐 {t('parent.assignment.types.math')}
                </button>
                <button
                  type="button"
                  onClick={() => setType('reading')}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    type === 'reading'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  📖 {t('parent.assignment.types.reading')}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('parent.assignment.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
              placeholder={type === 'math' ? t('parent.assignment.titlePlaceholderMath') : t('parent.assignment.titlePlaceholderReading')}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('parent.assignment.contentLabel')}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {t('parent.assignment.contentHelp')}
            </p>
            <textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              rows={12}
              className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none font-mono text-sm"
              placeholder={type === 'math' ? exampleMath : exampleReading}
            />
          </div>

          {/* Example */}
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
              {t('parent.assignment.showExample')}
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-xl text-xs overflow-auto">
              {type === 'math' ? exampleMath : exampleReading}
            </pre>
          </details>

          <div className="flex gap-3">
            <Link
              href="/parent"
              className="flex-1 py-3 text-center border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              {t('parent.assignment.buttons.cancel')}
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              {submitting ? t('parent.assignment.buttons.creating') : t('parent.assignment.buttons.create')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
