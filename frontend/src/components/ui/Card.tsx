'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5 md:p-6',
  lg: 'p-4 sm:p-6 md:p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick
}: CardProps) {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700';
  const hoverClasses = hover ? 'transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer' : '';
  const paddingClass = paddingClasses[padding];

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${paddingClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  emoji?: string;
  action?: ReactNode;
}

export function CardHeader({ title, emoji, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className="flex items-center gap-2">
        {emoji && <span className="text-lg sm:text-xl">{emoji}</span>}
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

interface CardStatProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export function CardStat({ label, value, subValue, trend, size = 'md' }: CardStatProps) {
  const valueClasses = {
    sm: 'text-lg sm:text-xl font-bold',
    md: 'text-xl sm:text-2xl md:text-3xl font-bold',
    lg: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  };

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`${valueClasses[size]} ${trend ? trendColors[trend] : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subValue}</p>
      )}
    </div>
  );
}
