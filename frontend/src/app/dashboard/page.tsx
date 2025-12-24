'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['transaction-stats'],
        queryFn: () => api.getTransactionStats(),
        enabled: isAuthenticated,
    });

    const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
        queryKey: ['recent-transactions'],
        queryFn: () => api.getTransactions({ limit: 5 }),
        enabled: isAuthenticated,
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">💰 FinanzasApp</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            Hola, <span className="font-semibold">{user?.name}</span>
                        </span>
                        <Link
                            href="/transactions"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                            Ver Transacciones
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Ingresos"
                        amount={stats?.income || 0}
                        icon="💰"
                        color="green"
                        loading={statsLoading}
                    />
                    <StatCard
                        title="Gastos"
                        amount={stats?.expense || 0}
                        icon="💸"
                        color="red"
                        loading={statsLoading}
                    />
                    <StatCard
                        title="Balance"
                        amount={stats?.balance || 0}
                        icon="📊"
                        color="blue"
                        loading={statsLoading}
                    />
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Transacciones Recientes
                        </h2>
                        <Link
                            href="/transactions"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            Ver todas →
                        </Link>
                    </div>

                    {transactionsLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : recentTransactions?.data?.length > 0 ? (
                        <div className="space-y-4">
                            {recentTransactions.data.map((transaction: any) => (
                                <TransactionItem key={transaction.id} transaction={transaction} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-lg mb-2">📝 No hay transacciones aún</p>
                            <p className="text-sm">Comienza agregando tu primera transacción</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link
                        href="/transactions/new"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 rounded-full p-4">
                                <span className="text-3xl">➕</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Nueva Transacción</h3>
                                <p className="text-sm text-gray-600">Registra un ingreso o gasto</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/budgets"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 rounded-full p-4">
                                <span className="text-3xl">📊</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Presupuestos</h3>
                                <p className="text-sm text-gray-600">Control de gastos</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/goals"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-100 rounded-full p-4">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Metas de Ahorro</h3>
                                <p className="text-sm text-gray-600">Alcanza tus objetivos</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/reminders"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-yellow-100 rounded-full p-4">
                                <span className="text-3xl">🔔</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Recordatorios</h3>
                                <p className="text-sm text-gray-600">Pagos pendientes</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/receipts"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-100 rounded-full p-4">
                                <span className="text-3xl">📸</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Escanear Factura</h3>
                                <p className="text-sm text-gray-600">OCR con IA</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/checklist"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-pink-100 rounded-full p-4">
                                <span className="text-3xl">✅</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Checklist Mensual</h3>
                                <p className="text-sm text-gray-600">Gastos recurrentes</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/analytics"
                        className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-cyan-100 rounded-full p-4">
                                <span className="text-3xl">📈</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Analítica</h3>
                                <p className="text-sm text-gray-600">Gráficos y reportes</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}

function StatCard({
    title,
    amount,
    icon,
    color,
    loading,
}: {
    title: string;
    amount: number;
    icon: string;
    color: 'green' | 'red' | 'blue';
    loading: boolean;
}) {
    const colorClasses = {
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        blue: 'bg-blue-100 text-blue-700',
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClasses[color]}`}>
                    {title}
                </span>
            </div>
            {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <p className="text-3xl font-bold text-gray-900">{formatCOP(amount)}</p>
            )}
        </div>
    );
}

function TransactionItem({ transaction }: { transaction: any }) {
    const isIncome = transaction.type === 'INCOME';

    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition">
            <div className="flex items-center gap-4">
                <div className="text-3xl">{transaction.category.icon}</div>
                <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.category.name}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'} {formatCOP(transaction.amount)}
                </p>
                <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('es-CO')}
                </p>
            </div>
        </div>
    );
}
