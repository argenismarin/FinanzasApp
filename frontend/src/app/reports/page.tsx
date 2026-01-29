'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
    balance: number;
}

interface CategoryData {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    total: number;
    count: number;
    percentage: number;
}

interface ReportData {
    summary: {
        totalIncome: number;
        totalExpenses: number;
        balance: number;
        avgMonthlyIncome: number;
        avgMonthlyExpenses: number;
        savingsRate: number;
    };
    monthlyTrend: MonthlyData[];
    expensesByCategory: CategoryData[];
    incomeByCategory: CategoryData[];
    topExpenses: {
        id: string;
        description: string;
        amount: number;
        date: string;
        category: { name: string; icon: string };
    }[];
}

export default function ReportsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [period, setPeriod] = useState('6'); // meses
    const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch report data
    const { data: reportData, isLoading } = useQuery<ReportData>({
        queryKey: ['reports', period],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/analytics/report?months=${period}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    const getBarWidth = (value: number, max: number) => {
        return max > 0 ? Math.max((value / max) * 100, 2) : 0;
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Reportes Financieros" emoji="📊" subtitle="Analisis detallado de tus finanzas">
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px]"
                >
                    <option value="1">Ultimo mes</option>
                    <option value="3">Ultimos 3 meses</option>
                    <option value="6">Ultimos 6 meses</option>
                    <option value="12">Ultimo año</option>
                </select>
            </PageHeader>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : reportData ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <Card padding="sm">
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Total Ingresos</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCOP(reportData.summary.totalIncome)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Promedio: {formatCOP(reportData.summary.avgMonthlyIncome)}/mes</p>
                            </Card>
                            <Card padding="sm">
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Total Gastos</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{formatCOP(reportData.summary.totalExpenses)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Promedio: {formatCOP(reportData.summary.avgMonthlyExpenses)}/mes</p>
                            </Card>
                            <Card padding="sm">
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Balance</p>
                                <p className={`text-lg sm:text-xl md:text-2xl font-bold ${reportData.summary.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatCOP(reportData.summary.balance)}
                                </p>
                            </Card>
                            <Card padding="sm">
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Tasa de Ahorro</p>
                                <p className={`text-lg sm:text-xl md:text-2xl font-bold ${reportData.summary.savingsRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {reportData.summary.savingsRate.toFixed(1)}%
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                    {reportData.summary.savingsRate >= 20 ? 'Excelente' : reportData.summary.savingsRate >= 10 ? 'Bueno' : 'Mejorable'}
                                </p>
                            </Card>
                        </div>

                        {/* Monthly Trend */}
                        <Card padding="md" className="mb-6 sm:mb-8">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">📈 Tendencia Mensual</h2>
                            <div className="space-y-3 sm:space-y-4">
                                {reportData.monthlyTrend.map((month) => {
                                    const maxValue = Math.max(
                                        ...reportData.monthlyTrend.map(m => Math.max(m.income, m.expenses))
                                    );
                                    return (
                                        <div key={month.month} className="space-y-2">
                                            <div className="flex justify-between text-xs sm:text-sm">
                                                <span className="font-medium text-gray-900 dark:text-white">{month.month}</span>
                                                <span className={month.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                    {formatCOP(month.balance)}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-12 sm:w-16">Ingresos</span>
                                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 sm:h-4">
                                                        <div
                                                            className="bg-green-500 h-3 sm:h-4 rounded-full transition-all"
                                                            style={{ width: `${getBarWidth(month.income, maxValue)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 w-16 sm:w-24 text-right">{formatCOP(month.income)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-12 sm:w-16">Gastos</span>
                                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 sm:h-4">
                                                        <div
                                                            className="bg-red-500 h-3 sm:h-4 rounded-full transition-all"
                                                            style={{ width: `${getBarWidth(month.expenses, maxValue)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 w-16 sm:w-24 text-right">{formatCOP(month.expenses)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Categories */}
                        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            {/* Expenses by Category */}
                            <Card padding="md">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">💸 Gastos por Categoria</h2>
                                {reportData.expensesByCategory.length > 0 ? (
                                    <div className="space-y-3 sm:space-y-4">
                                        {reportData.expensesByCategory.map((cat) => (
                                            <div key={cat.categoryId} className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-base sm:text-xl">{cat.categoryIcon}</span>
                                                        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{cat.categoryName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-red-600 dark:text-red-400 text-xs sm:text-sm">{formatCOP(cat.total)}</span>
                                                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-1 sm:ml-2">({cat.percentage.toFixed(1)}%)</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-red-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${cat.percentage}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{cat.count} transacciones</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No hay gastos en este periodo</p>
                                )}
                            </Card>

                            {/* Income by Category */}
                            <Card padding="md">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">💰 Ingresos por Categoria</h2>
                                {reportData.incomeByCategory.length > 0 ? (
                                    <div className="space-y-3 sm:space-y-4">
                                        {reportData.incomeByCategory.map((cat) => (
                                            <div key={cat.categoryId} className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-base sm:text-xl">{cat.categoryIcon}</span>
                                                        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{cat.categoryName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-green-600 dark:text-green-400 text-xs sm:text-sm">{formatCOP(cat.total)}</span>
                                                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-1 sm:ml-2">({cat.percentage.toFixed(1)}%)</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${cat.percentage}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{cat.count} transacciones</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No hay ingresos en este periodo</p>
                                )}
                            </Card>
                        </div>

                        {/* Top Expenses */}
                        <Card padding="md" className="mb-6 sm:mb-8">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">🔝 Mayores Gastos</h2>
                            {reportData.topExpenses.length > 0 ? (
                                <div className="space-y-2 sm:space-y-3">
                                    {reportData.topExpenses.map((expense, index) => (
                                        <div key={expense.id} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <span className="text-sm sm:text-lg font-bold text-gray-400 dark:text-gray-500">#{index + 1}</span>
                                                <span className="text-lg sm:text-2xl">{expense.category?.icon || '💸'}</span>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{expense.description}</p>
                                                    <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">
                                                        {expense.category?.name} • {new Date(expense.date).toLocaleDateString('es-CO')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-red-600 dark:text-red-400 text-sm sm:text-base md:text-lg whitespace-nowrap ml-2">-{formatCOP(expense.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No hay gastos en este periodo</p>
                            )}
                        </Card>

                        {/* Financial Health Score */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-4">🏆 Salud Financiera</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                <div className="text-center">
                                    <p className="text-white/70 text-xs sm:text-sm">Tasa de Ahorro</p>
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                                        {reportData.summary.savingsRate >= 0 ? '+' : ''}{reportData.summary.savingsRate.toFixed(1)}%
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-white/60">
                                        {reportData.summary.savingsRate >= 20 ? '🌟 Excelente' :
                                         reportData.summary.savingsRate >= 10 ? '👍 Bueno' :
                                         reportData.summary.savingsRate >= 0 ? '⚠️ Regular' : '🚨 Deficit'}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-white/70 text-xs sm:text-sm">Gasto Promedio Diario</p>
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                                        {formatCOP(reportData.summary.avgMonthlyExpenses / 30)}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-white/60">basado en promedio mensual</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-white/70 text-xs sm:text-sm">Consejo</p>
                                    <p className="text-sm sm:text-base md:text-lg">
                                        {reportData.summary.savingsRate < 10
                                            ? '📉 Intenta reducir gastos en categorias no esenciales'
                                            : reportData.summary.savingsRate < 20
                                            ? '📈 Vas bien, pero puedes mejorar tu ahorro'
                                            : '🎯 Excelente gestion financiera'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <Card padding="lg" className="text-center">
                        <p className="text-4xl sm:text-5xl md:text-6xl mb-4">📊</p>
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay datos suficientes</h3>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Agrega algunas transacciones para ver tus reportes</p>
                    </Card>
                )}
        </div>
    );
}
