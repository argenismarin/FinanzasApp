'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import ExportMenu from '@/components/ExportMenu';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [months, setMonths] = useState(6);
    const [categoryType, setCategoryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: trendData, isLoading: trendLoading } = useQuery({
        queryKey: ['monthly-trend', months],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/overview`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) return { monthlyTrends: [] };
            const data = await response.json();
            return data.monthlyTrends || [];
        },
        enabled: isAuthenticated,
    });

    const { data: categoryData, isLoading: categoryLoading } = useQuery({
        queryKey: ['category-breakdown', categoryType],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/categories?type=${categoryType}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) return { breakdown: [] };
            const data = await response.json();
            return { breakdown: data };
        },
        enabled: isAuthenticated,
    });

    const { data: topCategories, isLoading: topLoading } = useQuery({
        queryKey: ['top-categories', categoryType],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/top-categories?limit=5&type=${categoryType}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) return [];
            return response.json();
        },
        enabled: isAuthenticated,
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    // Format trend data for chart
    const trendChartData = Array.isArray(trendData) 
        ? trendData.map((item: any) => ({
            month: item.month,
            Ingresos: item.income || 0,
            Gastos: item.expense || 0,
            Balance: (item.income || 0) - (item.expense || 0),
        }))
        : [];

    // Format category data for pie chart
    const pieChartData = Array.isArray(categoryData?.breakdown)
        ? categoryData.breakdown.map((item: any) => ({
            name: item.name || 'Sin categoría',
            value: item.total || 0,
            percentage: item.percentage || 0,
        }))
        : [];

    // Format top categories for bar chart
    const barChartData = Array.isArray(topCategories)
        ? topCategories.map((item: any) => ({
            name: item.category?.name || 'Sin categoría',
            total: item.total || 0,
            count: item.count || 0,
        }))
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                        ← Dashboard
                    </Link>
                    <ExportMenu 
                        type="monthly-report"
                        filters={{ 
                            year: new Date().getFullYear(), 
                            month: new Date().getMonth() + 1 
                        }}
                    />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    📊 Analítica Financiera
                </h1>

                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Tendencia Mensual</h2>
                        <select
                            value={months}
                            onChange={(e) => setMonths(parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value={3}>Últimos 3 meses</option>
                            <option value={6}>Últimos 6 meses</option>
                            <option value={12}>Último año</option>
                        </select>
                    </div>

                    {trendLoading ? (
                        <div className="h-80 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : trendChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: any) => formatCOP(value)}
                                    labelStyle={{ color: '#000' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="Ingresos"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Gastos"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Balance"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                            <p>No hay datos suficientes para mostrar</p>
                        </div>
                    )}
                </div>

                {/* Category Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Por Categoría</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCategoryType('EXPENSE')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${categoryType === 'EXPENSE'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    Gastos
                                </button>
                                <button
                                    onClick={() => setCategoryType('INCOME')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${categoryType === 'INCOME'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    Ingresos
                                </button>
                            </div>
                        </div>

                        {categoryLoading ? (
                            <div className="h-80 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : pieChartData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieChartData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => formatCOP(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4">
                                    <p className="text-center text-2xl font-bold text-gray-900">
                                        Total: {formatCOP(
                                            pieChartData.reduce((sum, item) => sum + (item.value || 0), 0)
                                        )}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-gray-500">
                                <p>No hay datos para mostrar</p>
                            </div>
                        )}
                    </div>

                    {/* Bar Chart - Top Categories */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            Top 5 Categorías
                        </h2>

                        {topLoading ? (
                            <div className="h-80 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : barChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip
                                        formatter={(value: any) => formatCOP(value)}
                                        labelStyle={{ color: '#000' }}
                                    />
                                    <Bar
                                        dataKey="total"
                                        fill={categoryType === 'EXPENSE' ? '#ef4444' : '#10b981'}
                                        radius={[0, 8, 8, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-gray-500">
                                <p>No hay datos para mostrar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 rounded-full p-4">
                                <span className="text-3xl">💰</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Ingresos</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCOP(
                                        trendChartData.reduce((sum: number, item: any) => sum + item.Ingresos, 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-100 rounded-full p-4">
                                <span className="text-3xl">💸</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Gastos</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCOP(
                                        trendChartData.reduce((sum: number, item: any) => sum + item.Gastos, 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 rounded-full p-4">
                                <span className="text-3xl">📊</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Balance Total</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCOP(
                                        trendChartData.reduce((sum: number, item: any) => sum + item.Balance, 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
