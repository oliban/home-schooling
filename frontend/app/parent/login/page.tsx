'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { useTranslation } from '@/lib/LanguageContext';

export default function ParentLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await auth.login({ email: loginEmail, password: loginPassword });
      localStorage.setItem('parentToken', result.token);
      localStorage.setItem('parentData', JSON.stringify(result.user));
      router.push('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parentLogin.errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerPassword !== registerConfirm) {
      setError(t('parentLogin.errors.passwordMismatch'));
      return;
    }

    if (registerPassword.length < 6) {
      setError(t('parentLogin.errors.passwordLength'));
      return;
    }

    setLoading(true);

    try {
      const result = await auth.register({
        email: registerEmail,
        password: registerPassword,
        name: registerName,
      });
      localStorage.setItem('parentToken', result.token);
      localStorage.setItem('parentData', JSON.stringify(result.user));
      router.push('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parentLogin.errors.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold">{t('parentLogin.title')}</h1>
          <p className="text-gray-600 text-sm">{t('parentLogin.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 pb-3 font-semibold transition-colors ${
              activeTab === 'login'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('parentLogin.tabs.login')}
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 pb-3 font-semibold transition-colors ${
              activeTab === 'register'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('parentLogin.tabs.register')}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center text-sm">
            {error}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.email')}
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.password')}
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.passwordPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? t('parentLogin.buttons.loggingIn') : t('parentLogin.buttons.login')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.name')}
              </label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.email')}
              </label>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.password')}
              </label>
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.passwordMinPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('parentLogin.confirmPassword')}
              </label>
              <input
                type="password"
                value={registerConfirm}
                onChange={(e) => setRegisterConfirm(e.target.value)}
                required
                className="w-full p-3 border rounded-xl focus:border-green-500 focus:outline-none"
                placeholder={t('parentLogin.confirmPasswordPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? t('parentLogin.buttons.registering') : t('parentLogin.buttons.register')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-800">
            {t('parentLogin.childLogin')}
          </Link>
        </div>
      </div>
    </main>
  );
}
