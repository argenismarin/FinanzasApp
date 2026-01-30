'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP, parseDate, toDateString, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ExportMenu from '@/components/ExportMenu';
import CurrencyInput from '@/components/CurrencyInput';
import { useToast } from '@/components/Toast';

export default function TransactionsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [filter, setFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

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

    const { data: categories } = useQuery({
        queryKey: ['categories', editingTransaction?.type],
        queryFn: () => api.getCategories(editingTransaction?.type),
        enabled: isAuthenticated && !!editingTransaction,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            showToast('Transaccion eliminada', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al eliminar la transaccion', 'error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateTransaction(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            setEditingTransaction(null);
            showToast('Transaccion actualizada', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al actualizar la transaccion', 'error');
        }
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const transactions = data?.data || [];

    const exportToExcel = () => {
        if (transactions.length === 0) {
            showToast('No hay transacciones para exportar', 'warning');
            return;
        }

        const exportData = transactions.map((t: any) => ({
            Fecha: parseDate(t.date).toLocaleDateString('es-CO'),
            Tipo: t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            Categoría: t.category.name,
            Descripción: t.description,
            Monto: Number(t.amount),
            Moneda: t.currency
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

        const fileName = `transacciones_${getTodayString()}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleEdit = (transaction: any) => {
        setEditingTransaction({
            ...transaction,
            amount: String(transaction.amount),
            date: toDateString(transaction.date),
        });
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTransaction) return;

        updateMutation.mutate({
            id: editingTransaction.id,
            data: {
                type: editingTransaction.type,
                amount: parseFloat(editingTransaction.amount),
                categoryId: editingTransaction.categoryId,
                description: editingTransaction.description,
                date: editingTransaction.date,
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header - Mobile Responsive */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <Link href="/dashboard" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            ← Dashboard
                        </Link>
                        <div className="flex gap-2 sm:gap-3">
                            <ExportMenu
                                type="transactions"
                                filters={{ type: filter !== 'all' ? filter : undefined }}
                            />
                            <Link
                                href="/transactions/new"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition flex-1 sm:flex-none text-center"
                            >
                                + Nueva
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
                    {/* Filters - Mobile Responsive */}
                    <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('INCOME')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${filter === 'INCOME'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            💰 Ingresos
                        </button>
                        <button
                            onClick={() => setFilter('EXPENSE')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${filter === 'EXPENSE'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                                    onEdit={() => handleEdit(transaction)}
                                    onDelete={(id) => {
                                        if (confirm('¿Estás seguro de eliminar esta transacción?')) {
                                            deleteMutation.mutate(id);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                            ✏️ Editar Transacción
                        </h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingTransaction({ ...editingTransaction, type: 'INCOME', categoryId: '' })}
                                        className={`p-3 sm:p-4 rounded-lg border-2 transition text-sm sm:text-base ${editingTransaction.type === 'INCOME'
                                            ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                            }`}
                                    >
                                        <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💰</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">Ingreso</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTransaction({ ...editingTransaction, type: 'EXPENSE', categoryId: '' })}
                                        className={`p-3 sm:p-4 rounded-lg border-2 transition text-sm sm:text-base ${editingTransaction.type === 'EXPENSE'
                                            ? 'border-red-600 bg-red-50 dark:bg-red-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                            }`}
                                    >
                                        <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💸</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">Gasto</div>
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto (COP)</label>
                                <CurrencyInput
                                    value={editingTransaction.amount}
                                    onChange={(value) => setEditingTransaction({ ...editingTransaction, amount: value })}
                                    placeholder="Ingrese el monto"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                                <select
                                    value={editingTransaction.categoryId}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, categoryId: e.target.value })}
                                    required
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categories?.map((category: any) => (
                                        <option key={category.id} value={category.id}>
                                            {category.icon} {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={editingTransaction.description}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                                    required
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha</label>
                                <input
                                    type="date"
                                    value={editingTransaction.date}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                                    required
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingTransaction(null)}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-2 sm:py-3 rounded-lg transition text-sm sm:text-base"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 rounded-lg transition disabled:opacity-50 text-sm sm:text-base"
                                >
                                    {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function TransactionRow({
    transaction,
    onEdit,
    onDelete,
}: {
    transaction: any;
    onEdit: () => void;
    onDelete: (id: string) => void;
}) {
    const isIncome = transaction.type === 'INCOME';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition border border-gray-100 dark:border-gray-700 gap-2 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="text-2xl sm:text-3xl flex-shrink-0">{transaction.category.icon}</div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">{transaction.description}</p>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="truncate">{transaction.category.name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{parseDate(transaction.date).toLocaleDateString('es-CO')}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                <p className={`font-semibold text-base sm:text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'} {formatCOP(transaction.amount)}
                </p>
                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Editar"
                        aria-label={`Editar transacción: ${transaction.description}`}
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(transaction.id)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Eliminar"
                        aria-label={`Eliminar transacción: ${transaction.description}`}
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}
