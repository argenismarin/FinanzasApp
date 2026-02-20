'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/transactions', label: 'Movimientos', icon: '💸' },
  { href: '/reports', label: 'Reportes', icon: '📈' },
];

const drawerSections = [
  {
    title: 'Cuentas',
    items: [
      { href: '/accounts', label: 'Cuentas', icon: '🏦' },
      { href: '/balance', label: 'Balance', icon: '⚖️' },
      { href: '/transfers', label: 'Transferencias', icon: '🔄' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { href: '/budgets', label: 'Presupuestos', icon: '📊' },
      { href: '/savings', label: 'Ahorros', icon: '🐷' },
      { href: '/recurring', label: 'Recurrentes', icon: '🔁' },
      { href: '/checklist', label: 'Checklist', icon: '✅' },
      { href: '/categories/rules', label: 'Auto-categorizar', icon: '🤖' },
    ],
  },
  {
    title: 'Deudas y Tarjetas',
    items: [
      { href: '/debts', label: 'Deudas', icon: '💳' },
      { href: '/credit-cards', label: 'Tarjetas', icon: '💳' },
    ],
  },
  {
    title: 'Otros',
    items: [
      { href: '/goals', label: 'Metas', icon: '🎯' },
      { href: '/reminders', label: 'Recordatorios', icon: '🔔' },
      { href: '/receipts', label: 'Recibos', icon: '🧾' },
      { href: '/calculators', label: 'Calculadoras', icon: '🧮' },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isActiveRoute = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  // Check if any drawer item is active
  const isDrawerItemActive = drawerSections.some((section) =>
    section.items.some((item) => isActiveRoute(item.href))
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Ir a ${item.label}`}
                onClick={() => setIsDrawerOpen(false)}
                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] px-1 transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-xs font-medium truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}

          {/* New Transaction Button */}
          <Link
            href="/transactions/new"
            aria-label="Nueva transacción"
            onClick={() => setIsDrawerOpen(false)}
            className="flex flex-col items-center justify-center w-full h-full min-h-[48px] px-1 transition-colors"
          >
            <span className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full text-white text-xl shadow-lg -mt-4">
              +
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Nuevo</span>
          </Link>

          {/* More Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            aria-label="Más opciones"
            className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] px-1 transition-colors ${
              isDrawerOpen || isDrawerItemActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-0.5">{isDrawerOpen ? '✕' : '☰'}</span>
            <span className="text-xs font-medium">Más</span>
          </button>
        </div>
      </nav>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-35 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden transition-transform duration-300 ease-in-out rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto ${
          isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ zIndex: 35 }}
      >
        <div className="p-4">
          {/* Drawer Handle */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {drawerSections.map((section) => (
            <div key={section.title} className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors min-h-[64px] ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-2xl mb-1">{item.icon}</span>
                      <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
