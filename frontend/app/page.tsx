'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Välkommen till Skolan!
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Matte och läsförståelse för barn baserat på LGR 22
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Barn - Logga in
          </Link>
          <Link
            href="/parent/login"
            className="px-8 py-4 bg-gray-200 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Förälder - Logga in
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 text-left">
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-2">📐</div>
            <h3 className="font-semibold text-lg mb-2">Matte</h3>
            <p className="text-gray-600 text-sm">
              Träna matematik anpassat efter din årskurs. Taluppfattning, algebra, geometri och mer.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-2">📖</div>
            <h3 className="font-semibold text-lg mb-2">Läsförståelse</h3>
            <p className="text-gray-600 text-sm">
              Svara på frågor om böcker du läser. 5 frågor per kapitel.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-semibold text-lg mb-2">Tjäna coins</h3>
            <p className="text-gray-600 text-sm">
              Få coins för rätta svar och bygg upp streaks för bonuspoäng!
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-semibold text-lg mb-2">Samla karaktärer</h3>
            <p className="text-gray-600 text-sm">
              Köp roliga ASCII-karaktärer med dina coins. Från Meatballo till Championo!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
