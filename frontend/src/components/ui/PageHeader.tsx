'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  emoji?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, emoji, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="flex items-center gap-2 sm:gap-3">
        {emoji && (
          <span className="text-2xl sm:text-3xl md:text-4xl">{emoji}</span>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
