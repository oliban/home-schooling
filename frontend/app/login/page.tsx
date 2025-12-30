'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

export default function ChildLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // For demo: get parent ID from localStorage or prompt
  const [parentId, setParentId] = useState('');
  const [showParentInput, setShowParentInput] = useState(true);

  useEffect(() => {
    const savedParentId = localStorage.getItem('parentId');
    if (savedParentId) {
      setParentId(savedParentId);
      setShowParentInput(false);
      loadChildren(savedParentId);
    }
  }, []);

  const loadChildren = async (familyCode: string) => {
    setError('');
    try {
      const kids = await auth.getChildren(familyCode);
      setChildren(kids);
      if (kids.length === 0) {
        setError(t('login.errors.noChildren'));
      }
    } catch {
      setError(t('login.errors.invalidFamilyCode'));
    }
  };

  const handleParentIdSubmit = async () => {
    if (parentId.trim()) {
      localStorage.setItem('parentId', parentId);
      setShowParentInput(false);
      await loadChildren(parentId);
    }
  };

  const handleLogin = async () => {
    if (!selectedChild || pin.length !== 4) return;

    setLoading(true);
    setError('');

    try {
      const result = await auth.childLogin({ childId: selectedChild, pin });
      localStorage.setItem('childToken', result.token);
      localStorage.setItem('childData', JSON.stringify(result.child));
      router.push('/child');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errors.wrongPin'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('parentId');
    setParentId('');
    setChildren([]);
    setShowParentInput(true);
    setError('');
  };

  if (showParentInput || children.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="text-4xl mb-4">🎒</div>
          <h1 className="text-2xl font-bold mb-2">{t('login.welcome')}</h1>
          <p className="text-gray-600 mb-6">{t('login.enterFamilyCode')}</p>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={parentId}
            onChange={(e) => setParentId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && parentId.trim() && handleParentIdSubmit()}
            placeholder="____"
            className="w-full p-4 border-2 rounded-xl mb-4 text-center text-3xl font-bold tracking-[0.5em]"
          />
          <button
            onClick={handleParentIdSubmit}
            disabled={!parentId.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {t('login.continue')}
          </button>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">{t('login.noAccount')}</p>
            <a
              href="/parent/login"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {t('login.createParent')}
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">
          {t('login.welcome')}
        </h1>
        <p className="text-gray-600 text-center mb-8">{t('login.whichChild')}</p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedChild === child.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">👤</div>
              <div className="font-medium">{child.name}</div>
            </button>
          ))}
        </div>

        {selectedChild && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                {t('login.enterPin')}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && !loading && handleLogin()}
                className="w-full text-center text-3xl tracking-[0.5em] p-4 border-2 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="____"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={pin.length !== 4 || loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('common.loading') : t('login.start')}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
