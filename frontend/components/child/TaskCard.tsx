'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/LanguageContext';

interface Assignment {
  id: string;
  title: string;
  status: string;
}

interface TaskCardProps {
  type: 'math' | 'reading' | 'english' | 'quiz';
  assignments: Assignment[];
}

export function TaskCard({ type, assignments }: TaskCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const icon = type === 'math' ? '📐' : type === 'reading' ? '📖' : type === 'english' ? '🇬🇧' : '🧠';
  const title = type === 'math' ? t('childDashboard.math') : type === 'reading' ? t('childDashboard.reading') : type === 'english' ? t('childDashboard.english') : t('childDashboard.quiz');
  const gradient =
    type === 'math'
      ? 'from-sunset-tangerine to-sunset-coral'
      : type === 'reading'
        ? 'from-sunset-gold to-sunset-amber'
        : type === 'english'
          ? 'from-blue-400 to-blue-600'
          : 'from-purple-400 to-purple-600';

  const hasAssignments = assignments.length > 0;
  const primaryAssignment = assignments[0];
  const remainingAssignments = assignments.slice(1);

  return (
    <div className="bg-white rounded-2xl shadow-card-warm overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Card header */}
      <div className={`bg-gradient-to-r ${gradient} p-4`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-float" style={{ animationDelay: type === 'reading' ? '1s' : '0s' }}>
            {icon}
          </span>
          <h3 className="text-xl font-display font-bold text-white">{title}</h3>
        </div>
      </div>

      {/* Card content */}
      <div className="p-5">
        {hasAssignments ? (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-sunset-peach/50 text-sunset-twilight rounded-full text-xs font-semibold">
                {t('childDashboard.inProgress')}
              </span>
            </div>

            {/* Primary assignment */}
            <p className="text-sunset-twilight/80 mb-4 font-medium">
              {primaryAssignment.title}
            </p>

            {/* Continue button */}
            <Link
              href={`/child/assignment/${primaryAssignment.id}`}
              className={`block w-full py-3 bg-gradient-to-r ${gradient} text-white text-center rounded-xl font-bold hover:opacity-90 transition-opacity shadow-md`}
            >
              {t('childDashboard.continueButton')} →
            </Link>

            {/* Additional assignments */}
            {remainingAssignments.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full text-sunset-twilight/60 text-sm text-center hover:text-sunset-twilight transition-colors flex items-center justify-center gap-2"
                >
                  <span
                    className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                  + {remainingAssignments.length > 1
                    ? t('childDashboard.tasksCountPlural', { count: remainingAssignments.length })
                    : t('childDashboard.tasksCount', { count: remainingAssignments.length })}
                </button>

                {expanded && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    {remainingAssignments.map((assignment, index) => (
                      <Link
                        key={assignment.id}
                        href={`/child/assignment/${assignment.id}`}
                        className="block text-sm text-sunset-twilight/70 hover:text-sunset-tangerine hover:bg-sunset-peach/20 px-4 py-2 rounded-lg transition-colors"
                      >
                        {index + 2}. {assignment.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-green-600 py-2">
            <span className="text-xl">✅</span>
            <span className="font-medium">{t('childDashboard.doneForToday')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
