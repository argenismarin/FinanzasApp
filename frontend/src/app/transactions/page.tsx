'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

export default function TransactionsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, isLoading } = useQuery({
        queryKey: ['transactions', filter],
        queryFn: () =>
            api.getTransactions({
                ...(filter !== 'all' && { type: filter }),
                limit: 50,
            }),
        enabled: isAuthenticated,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
        },
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const transactions = data?.data || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                        ← Dashboard
                    </Link>
                    <Link
                        href="/transactions/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        + Nueva Transacción
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    {/* Filters */}
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('INCOME')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'INCOME'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            💰 Ingresos
                        </button>
                        <button
                            onClick={() => setFilter('EXPENSE')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'EXPENSE'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            💸 Gastos
                        </button>
                    </div>

                    {/* Transactions List */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="space-y-2">
                            {transactions.map((transaction: any) => (
                                <TransactionRow
                                    key={transaction.id}
                                    transaction={transaction}
                                    onDelete={(id) => {
                                        if (confirm('¿Estás seguro de eliminar esta transacción?')) {
                                            deleteMutation.mutate(id);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg mb-2">📝 No hay transacciones</p>
                            <p className="text-sm">
                                {filter === 'all'
                                    ? 'Comienza agregando tu primera transacción'
                                    : `No hay ${filter === 'INCOME' ? 'ingresos' : 'gastos'} registrados`}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function TransactionRow({
    transaction,
    onDelete,
}: {
    transaction: any;
    onDelete: (id: string) => void;
}) {
    const isIncome = transaction.type === 'INCOME';

    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition border border-gray-100">
            <div className="flex items-center gap-4 flex-1">
                <div className="text-3xl">{transaction.category.icon}</div>
                <div className="flex-1">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{transaction.category.name}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString('es-CO')}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <p className={`font-semibold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'} {formatCOP(transaction.amount)}
                </p>
                <button
                    onClick={() => onDelete(transaction.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}
