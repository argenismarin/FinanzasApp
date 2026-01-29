'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import Link from 'next/link';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Check initial theme
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') ||
      (!document.documentElement.classList.contains('light') &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Skip AppShell for login page
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="sm:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span className="font-bold text-gray-900 dark:text-white">FinanzasApp</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden sm:flex sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 items-center justify-end gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 pb-20 sm:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />

      {/* FAB - New Transaction */}
      <Link
        href="/transactions/new"
        className="fixed right-4 bottom-20 sm:right-6 sm:bottom-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Nueva transaccion"
      >
        +
      </Link>
    </div>
  );
}
