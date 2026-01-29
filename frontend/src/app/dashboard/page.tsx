'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP, parseDate } from '@/lib/utils';
import Link from 'next/link';
import {
    ComparisonWidget,
    TopCategoriesWidget,
    BudgetAlertsWidget,
    UpcomingRemindersWidget,
    GoalsProgressWidget,
    TrendWidget,
    ChecklistProgressWidget
} from '@/components/DashboardWidgets';
import NotificationCenter from '@/components/NotificationCenter';

export default function DashboardPage() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Run notification checks on dashboard load
    useEffect(() => {
        if (isAuthenticated) {
            const runChecks = async () => {
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/run-checks`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                    });
                } catch (error) {
                    console.error('Failed to run notification checks:', error);
                }
            };
            runChecks();
        }
    }, [isAuthenticated]);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['transaction-stats'],
        queryFn: () => api.getTransactionStats(),
        enabled: isAuthenticated,
    });

    const { data: balance, isLoading: balanceLoading } = useQuery({
        queryKey: ['balance'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/balance`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch balance');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
        queryKey: ['recent-transactions'],
        queryFn: () => api.getTransactions({ limit: 5 }),
        enabled: isAuthenticated,
    });

    const { data: dashboardStats, isLoading: dashboardLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/dashboard`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Hola, {user?.name} 👋
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Bienvenido a tu panel de finanzas
                    </p>
                </div>
                <NotificationCenter />
            </div>
            {/* Balance Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">📊 Balance General</h2>
                    <Link
                        href="/balance"
                        className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        Ver detalle →
                    </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">💰</div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">En Banco</p>
                        <p className={`text-base sm:text-lg md:text-xl font-bold ${(balance?.bankBalance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                            {balanceLoading ? '...' : formatCOP(balance?.bankBalance || 0)}
                        </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🏦</div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Ahorros</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                            {balanceLoading ? '...' : formatCOP(balance?.totalSavings || 0)}
                        </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">💳</div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Deudas</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-red-600 dark:text-red-400">
                            {balanceLoading ? '...' : formatCOP(balance?.totalDebts || 0)}
                        </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 sm:p-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📈</div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Patrimonio</p>
                        <p className={`text-base sm:text-lg md:text-xl font-bold ${(balance?.netWorth || 0) >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                            {balanceLoading ? '...' : formatCOP(balance?.netWorth || 0)}
                        </p>
                    </div>
                    <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-3 sm:p-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">💸</div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Disponible</p>
                        <p className={`text-base sm:text-lg md:text-xl font-bold ${(balance?.availableToSpend || 0) >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                            {balanceLoading ? '...' : formatCOP(balance?.availableToSpend || 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Link
                    href="/transactions"
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 hover:shadow-lg transition text-center"
                >
                    <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">💰</div>
                    <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Transacciones</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Ingresos y gastos</p>
                </Link>
                <Link
                    href="/debts"
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 hover:shadow-lg transition text-center"
                >
                    <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">💳</div>
                    <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Deudas</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{balance?.breakdown?.debtsCount || 0} pendientes</p>
                </Link>
                <Link
                    href="/savings"
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 hover:shadow-lg transition text-center"
                >
                    <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">🏦</div>
                    <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Ahorros</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{balance?.breakdown?.savingsCount || 0} cajitas</p>
                </Link>
                <Link
                    href="/checklist"
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 hover:shadow-lg transition text-center"
                >
                    <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">✅</div>
                    <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Checklist</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Gastos mensuales</p>
                </Link>
            </div>

            {/* Comparison Cards - Current vs Previous Month */}
            {!dashboardLoading && dashboardStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-6">
                        <ComparisonWidget
                            title="Ingresos del Mes"
                            current={dashboardStats.currentMonth.income}
                            previous={dashboardStats.previousMonth.income}
                            icon="💰"
                            type="income"
                        />
                        <ComparisonWidget
                            title="Gastos del Mes"
                            current={dashboardStats.currentMonth.expense}
                            previous={dashboardStats.previousMonth.expense}
                            icon="💸"
                            type="expense"
                        />
                        <ComparisonWidget
                            title="Balance del Mes"
                            current={dashboardStats.currentMonth.balance}
                            previous={dashboardStats.previousMonth.balance}
                            icon="📊"
                            type="balance"
                        />
                    </div>
            )}

            {/* Budget Alerts - Full Width if exists */}
            {!dashboardLoading && dashboardStats?.budgetAlerts && dashboardStats.budgetAlerts.length > 0 && (
                <div className="mb-6">
                    <BudgetAlertsWidget alerts={dashboardStats.budgetAlerts} />
                </div>
            )}

            {/* Checklist Progress */}
            {!dashboardLoading && dashboardStats?.checklistProgress && dashboardStats.checklistProgress.total > 0 && (
                <div className="mb-6">
                    <ChecklistProgressWidget checklistProgress={dashboardStats.checklistProgress} />
                </div>
            )}

            {/* Insights Grid */}
            {!dashboardLoading && dashboardStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    {/* Top Categories */}
                    <TopCategoriesWidget categories={dashboardStats.topCategories} />

                    {/* Upcoming Reminders or Goals Progress */}
                    {dashboardStats.upcomingReminders && dashboardStats.upcomingReminders.length > 0 ? (
                        <UpcomingRemindersWidget reminders={dashboardStats.upcomingReminders} />
                    ) : dashboardStats.goalsProgress && dashboardStats.goalsProgress.length > 0 ? (
                        <GoalsProgressWidget goals={dashboardStats.goalsProgress} />
                    ) : null}
                </div>
            )}

            {/* 6 Month Trend */}
            {!dashboardLoading && dashboardStats?.trend && (
                <div className="mb-6">
                    <TrendWidget trend={dashboardStats.trend} />
                </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                        Transacciones Recientes
                    </h2>
                    <Link
                        href="/transactions"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs sm:text-sm font-medium"
                    >
                        Ver todas →
                    </Link>
                </div>

                {transactionsLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : recentTransactions?.data?.length > 0 ? (
                    <div className="space-y-2 sm:space-y-4">
                        {recentTransactions.data.map((transaction: any) => (
                            <TransactionItem key={transaction.id} transaction={transaction} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-base sm:text-lg mb-2">📝 No hay transacciones aun</p>
                        <p className="text-xs sm:text-sm">Comienza agregando tu primera transaccion</p>
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <QuickActionCard href="/budgets" icon="📊" bg="bg-green-100 dark:bg-green-900/50" title="Presupuestos" desc="Control de gastos" />
                <QuickActionCard href="/goals" icon="🎯" bg="bg-purple-100 dark:bg-purple-900/50" title="Metas" desc="Objetivos de ahorro" />
                <QuickActionCard href="/receipts" icon="📸" bg="bg-indigo-100 dark:bg-indigo-900/50" title="Recibos" desc="OCR con IA" />
                <QuickActionCard href="/analytics" icon="📈" bg="bg-cyan-100 dark:bg-cyan-900/50" title="Analitica" desc="Graficos y reportes" />
                <QuickActionCard href="/accounts" icon="🏦" bg="bg-teal-100 dark:bg-teal-900/50" title="Cuentas" desc="Cuentas bancarias" />
                <QuickActionCard href="/credit-cards" icon="💳" bg="bg-indigo-100 dark:bg-indigo-900/50" title="Tarjetas" desc="Tarjetas de credito" />
                <QuickActionCard href="/reports" icon="📊" bg="bg-amber-100 dark:bg-amber-900/50" title="Reportes" desc="Analisis financiero" />
                <QuickActionCard href="/calculators" icon="🧮" bg="bg-purple-100 dark:bg-purple-900/50" title="Calculadoras" desc="Herramientas" />
            </div>
        </div>
    );
}

function QuickActionCard({ href, icon, bg, title, desc }: { href: string; icon: string; bg: string; title: string; desc: string }) {
    return (
        <Link
            href={href}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-3 sm:p-4 hover:shadow-lg transition-shadow"
        >
            <div className="flex items-center gap-2 sm:gap-3">
                <div className={`${bg} rounded-full p-2 sm:p-3`}>
                    <span className="text-lg sm:text-2xl">{icon}</span>
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{title}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{desc}</p>
                </div>
            </div>
        </Link>
    );
}

function TransactionItem({ transaction }: { transaction: any }) {
    const isIncome = transaction.type === 'INCOME';

    return (
        <div className="flex items-center justify-between p-2 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="text-lg sm:text-2xl md:text-3xl flex-shrink-0">{transaction.category.icon}</div>
                <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{transaction.description}</p>
                    <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">{transaction.category.name}</p>
                </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
                <p className={`font-semibold text-xs sm:text-base ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isIncome ? '+' : '-'} {formatCOP(transaction.amount)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">
                    {parseDate(transaction.date).toLocaleDateString('es-CO')}
                </p>
            </div>
        </div>
    );
}
