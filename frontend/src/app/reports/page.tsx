'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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

    const [period, setPeriod] = useState('6');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: reportData, isLoading } = useQuery<ReportData>({
        queryKey: ['reports', period],
        queryFn: () => api.getFinancialReport(parseInt(period)),
        enabled: isAuthenticated
    });

    const { data: forecastData } = useQuery({
        queryKey: ['forecast'],
        queryFn: () => api.getForecast(),
        enabled: isAuthenticated
    });

    const { data: creditCards } = useQuery({
        queryKey: ['credit-cards'],
        queryFn: () => api.getCreditCards(),
        enabled: isAuthenticated
    });

    const { data: debts } = useQuery({
        queryKey: ['debts'],
        queryFn: () => api.getDebts(),
        enabled: isAuthenticated
    });

    const getBarWidth = (value: number, max: number) => {
        return max > 0 ? Math.max((value / max) * 100, 2) : 0;
    };

    const exportPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();
        const today = new Date().toLocaleDateString('es-CO');

        // Title
        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text('Reporte Financiero', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Periodo: ${period} meses | Generado: ${today}`, 14, 28);

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Resumen', 14, 40);

        autoTable(doc, {
            startY: 44,
            head: [['Concepto', 'Valor']],
            body: [
                ['Total Ingresos', formatCOP(reportData.summary.totalIncome)],
                ['Total Gastos', formatCOP(reportData.summary.totalExpenses)],
                ['Balance', formatCOP(reportData.summary.balance)],
                ['Tasa de Ahorro', `${reportData.summary.savingsRate.toFixed(1)}%`],
                ['Promedio Mensual Ingresos', formatCOP(reportData.summary.avgMonthlyIncome)],
                ['Promedio Mensual Gastos', formatCOP(reportData.summary.avgMonthlyExpenses)],
            ],
            headStyles: { fillColor: [30, 64, 175] },
            theme: 'grid',
        });

        // Monthly trend
        const yAfterSummary = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Tendencia Mensual', 14, yAfterSummary);

        autoTable(doc, {
            startY: yAfterSummary + 4,
            head: [['Mes', 'Ingresos', 'Gastos', 'Balance']],
            body: reportData.monthlyTrend.map(m => [
                m.month,
                formatCOP(m.income),
                formatCOP(m.expenses),
                formatCOP(m.balance),
            ]),
            headStyles: { fillColor: [30, 64, 175] },
            theme: 'grid',
        });

        // Expenses by category
        const pageH = doc.internal.pageSize.getHeight() - 50;
        const yAfterTrend = (doc as any).lastAutoTable.finalY + 10;
        if (yAfterTrend > pageH) doc.addPage();
        const yStart = yAfterTrend > pageH ? 20 : yAfterTrend;
        doc.setFontSize(14);
        doc.text('Gastos por Categoria', 14, yStart);

        autoTable(doc, {
            startY: yStart + 4,
            head: [['Categoria', 'Total', '%', 'Transacciones']],
            body: reportData.expensesByCategory.map(c => [
                c.categoryName,
                formatCOP(c.total),
                `${c.percentage.toFixed(1)}%`,
                String(c.count),
            ]),
            headStyles: { fillColor: [30, 64, 175] },
            theme: 'grid',
        });

        // Top expenses
        const yAfterCat = (doc as any).lastAutoTable.finalY + 10;
        if (yAfterCat > pageH) doc.addPage();
        const yTopStart = yAfterCat > pageH ? 20 : yAfterCat;
        doc.setFontSize(14);
        doc.text('Top 10 Gastos', 14, yTopStart);

        autoTable(doc, {
            startY: yTopStart + 4,
            head: [['#', 'Descripcion', 'Categoria', 'Monto', 'Fecha']],
            body: reportData.topExpenses.map((e, i) => [
                String(i + 1),
                e.description,
                e.category?.name || '',
                formatCOP(e.amount),
                new Date(e.date).toLocaleDateString('es-CO'),
            ]),
            headStyles: { fillColor: [30, 64, 175] },
            theme: 'grid',
        });

        const fileName = `reporte_financiero_${period}m_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Credit card aggregates
    const activeCards = creditCards?.filter((c: any) => c.isActive) || [];
    const totalOwed = activeCards.reduce((sum: number, c: any) => sum + Number(c.currentBalance), 0);
    const totalAvailable = activeCards.reduce((sum: number, c: any) => sum + Number(c.availableCredit), 0);
    const totalLimit = activeCards.reduce((sum: number, c: any) => sum + Number(c.creditLimit), 0);
    const avgUsage = totalLimit > 0 ? (totalOwed / totalLimit) * 100 : 0;

    // Debt aggregates
    const debtList = debts || [];
    const totalDebt = debtList.reduce((sum: number, d: any) => sum + Number(d.totalAmount), 0);
    const totalPaid = debtList.reduce((sum: number, d: any) => sum + Number(d.paidAmount), 0);
    const totalPending = totalDebt - totalPaid;

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Reportes Financieros" emoji="📊" subtitle="Analisis detallado de tus finanzas">
                <div className="flex gap-2 items-center">
                    {reportData && (
                        <button
                            onClick={exportPDF}
                            className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition min-h-[44px]"
                        >
                            📄 PDF
                        </button>
                    )}
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
                </div>
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

                        {/* Forecast Section */}
                        {forecastData && (
                            <Card padding="md" className="mb-6 sm:mb-8">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">🔮 Pronostico de Gastos</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Gasto Actual</p>
                                        <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(forecastData.currentMonth.spent)}</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Proyectado</p>
                                        <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">{formatCOP(forecastData.currentMonth.projected)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Promedio Historico</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-600 dark:text-gray-300">{formatCOP(forecastData.historical.weightedAvg)}</p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Dias Restantes</p>
                                        <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{forecastData.currentMonth.daysRemaining}</p>
                                    </div>
                                </div>
                                {forecastData.categoryForecasts.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top 5 categorias</h3>
                                        <div className="space-y-3">
                                            {forecastData.categoryForecasts.slice(0, 5).map((cat: any, i: number) => {
                                                const maxVal = Math.max(cat.projected, cat.historicalAvg, cat.spent);
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span>{cat.icon}</span>
                                                                <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                                                                <span className={`text-xs ${(cat.trend || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                                    {(cat.trend || 0) > 0 ? '↑' : '↓'}{Math.abs(cat.trend || 0)}%
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCOP(cat.spent)}</span>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 w-16">Actual</span>
                                                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${getBarWidth(cat.spent, maxVal)}%` }} />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 w-16">Proyect.</span>
                                                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${getBarWidth(cat.projected, maxVal)}%` }} />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 w-16">Histor.</span>
                                                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                                    <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: `${getBarWidth(cat.historicalAvg, maxVal)}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

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
                                                    <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
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
                                                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
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
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 sm:mb-8">
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

                        {/* Credit Cards Section */}
                        {activeCards.length > 0 && (
                            <Card padding="md" className="mb-6 sm:mb-8">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">💳 Tarjetas de Credito</h2>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Adeudado</p>
                                        <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{formatCOP(totalOwed)}</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Credito Disponible</p>
                                        <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{formatCOP(totalAvailable)}</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Uso Promedio</p>
                                        <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{avgUsage.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {activeCards.map((card: any) => (
                                        <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color || '#1e40af' }} />
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                        {card.name} {card.lastFourDigits ? `*${card.lastFourDigits}` : ''}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Corte: dia {card.cutOffDay} · Pago: dia {card.paymentDueDay}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-red-600 dark:text-red-400">{formatCOP(card.currentBalance)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">de {formatCOP(card.creditLimit)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Debts Progress Section */}
                        {debtList.length > 0 && (
                            <Card padding="md" className="mb-6 sm:mb-8">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">📋 Progreso de Deudas</h2>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Deuda</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{formatCOP(totalDebt)}</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Pagado</p>
                                        <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{formatCOP(totalPaid)}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Pendiente</p>
                                        <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{formatCOP(totalPending)}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {debtList.map((debt: any) => {
                                        const paidPct = Number(debt.totalAmount) > 0
                                            ? (Number(debt.paidAmount) / Number(debt.totalAmount)) * 100
                                            : 0;
                                        return (
                                            <div key={debt.id}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white">{debt.creditor}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {formatCOP(debt.paidAmount)} / {formatCOP(debt.totalAmount)}
                                                    </p>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                    <div
                                                        className={`h-3 rounded-full transition-all ${paidPct >= 100 ? 'bg-green-500' : paidPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(paidPct, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-right text-xs text-gray-500 dark:text-gray-400 mt-0.5">{paidPct.toFixed(1)}%</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
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
