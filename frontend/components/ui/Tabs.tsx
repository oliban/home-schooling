'use client';

import { ReactNode } from 'react';

interface TabProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Tab({ active, onClick, children, variant = 'primary' }: TabProps) {
  const baseStyles = 'px-4 py-3 rounded-xl font-medium transition-all';

  const variantStyles = {
    primary: active
      ? 'bg-green-600 text-white shadow-md'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    secondary: active
      ? 'bg-blue-600 text-white shadow-md'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]}`}
    >
      {children}
    </button>
  );
}

interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  className?: string;
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
}
