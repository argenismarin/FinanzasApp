'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { href: '/transactions', label: 'Transacciones', icon: '💸' },
      { href: '/accounts', label: 'Cuentas', icon: '🏦' },
      { href: '/balance', label: 'Balance', icon: '⚖️' },
      { href: '/transfers', label: 'Transferencias', icon: '🔄' },
    ],
  },
  {
    title: 'Planificacion',
    items: [
      { href: '/budgets', label: 'Presupuestos', icon: '📊' },
      { href: '/savings', label: 'Ahorros', icon: '🐷' },
      { href: '/recurring', label: 'Recurrentes', icon: '🔁' },
      { href: '/checklist', label: 'Checklist', icon: '✅' },
    ],
  },
  {
    title: 'Credito',
    items: [
      { href: '/debts', label: 'Deudas', icon: '💳' },
      { href: '/credit-cards', label: 'Tarjetas', icon: '💳' },
    ],
  },
  {
    title: 'Analisis',
    items: [
      { href: '/reports', label: 'Reportes', icon: '📈' },
      { href: '/receipts', label: 'Recibos', icon: '🧾' },
      { href: '/calculators', label: 'Calculadoras', icon: '🧮' },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden sm:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">FinanzasApp</span>
          </Link>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {section.title && !collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
