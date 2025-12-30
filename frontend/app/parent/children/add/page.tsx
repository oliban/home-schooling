'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { children } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

export default function AddChildPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(1);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      router.push('/parent/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin && pin.length !== 4) {
      setError(t('parent.child.errors.pinLength'));
      return;
    }

    const token = localStorage.getItem('parentToken');
    if (!token) return;

    setLoading(true);
    try {
      await children.create(token, {
        name,
        grade_level: gradeLevel,
        pin: pin || undefined,
      });
      router.push('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parent.child.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/parent"
            className="text-2xl hover:scale-110 transition-transform"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold">{t('parent.child.addTitle')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('parent.child.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
              placeholder={t('parent.child.namePlaceholder')}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('parent.child.gradeLevel')}
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(parseInt(e.target.value))}
              className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                <option key={grade} value={grade}>
                  {t('parent.child.gradeLevelLabel', { grade })}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('parent.child.pinOptional')}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none text-center text-2xl tracking-[0.5em]"
              placeholder="____"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('parent.child.pinHelpText')}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/parent"
              className="flex-1 py-3 text-center border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              {t('parent.child.buttons.cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? t('parent.child.buttons.adding') : t('parent.child.buttons.add')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
