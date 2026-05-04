'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP, parseDate, toDateString, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ExportMenu from '@/components/ExportMenu';
import CurrencyInput from '@/components/CurrencyInput';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function TransactionsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Estado inicializado desde la URL — permite refrescar/compartir links con filtros aplicados
    const [filter, setFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>(
        (searchParams.get('type') as any) || 'all'
    );
    const [accountFilter, setAccountFilter] = useState<string>(searchParams.get('accountId') || '');
    const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('categoryId') || '');
    const [searchFilter, setSearchFilter] = useState(searchParams.get('search') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
    const PAGE_SIZE = 20;
    const [editingTransaction, setEditingTransaction] = useState<any>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Sincroniza filtros con URL (replace para no llenar el back stack)
    const syncUrl = useCallback(() => {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('type', filter);
        if (accountFilter) params.set('accountId', accountFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (searchFilter) params.set('search', searchFilter);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (currentPage > 1) params.set('page', String(currentPage));
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [filter, accountFilter, categoryFilter, searchFilter, startDate, endDate, currentPage, pathname, router]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, accountFilter, categoryFilter, searchFilter, startDate, endDate]);

    useEffect(() => {
        syncUrl();
    }, [syncUrl]);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['transactions', filter, accountFilter, categoryFilter, searchFilter, startDate, endDate, currentPage],
        queryFn: () =>
            api.getTransactions({
                ...(filter !== 'all' && { type: filter }),
                ...(accountFilter && { accountId: accountFilter }),
                ...(categoryFilter && { categoryId: categoryFilter }),
                ...(searchFilter && { search: searchFilter }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                page: currentPage,
                limit: PAGE_SIZE,
            }),
        enabled: isAuthenticated,
    });

    // Fetch bank accounts for filter and edit modal
    const { data: accounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => api.getAccounts(),
        enabled: isAuthenticated,
    });

    const { data: categories } = useQuery({
        queryKey: ['categories', editingTransaction?.type],
        queryFn: () => api.getCategories(editingTransaction?.type),
        enabled: isAuthenticated && !!editingTransaction,
    });

    const { data: allCategories } = useQuery({
        queryKey: ['categories-all'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
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
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
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
    const pagination = data?.pagination;

    const exportToExcel = () => {
        if (transactions.length === 0) {
            showToast('No hay transacciones para exportar', 'warning');
            return;
        }

        const exportData = transactions.map((t: any) => ({
            Fecha: parseDate(t.date).toLocaleDateString('es-CO'),
            Tipo: t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            Categoría: t.category.name,
            Cuenta: t.account?.name || (t.creditCard ? `💳 ${t.creditCard.name}` : ''),
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
            accountId: transaction.accountId || '',
            creditCardId: transaction.creditCardId || '',
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
                accountId: editingTransaction.accountId || '',
                creditCardId: editingTransaction.creditCardId || '',
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
                                href="/transactions/import"
                                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition flex-1 sm:flex-none text-center"
                            >
                                📤 Importar
                            </Link>
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
                    {/* Type Filters */}
                    <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
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

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="🔍 Buscar por descripcion..."
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {allCategories && allCategories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm outline-none cursor-pointer"
                            >
                                <option value="">Todas las categorias</option>
                                {allCategories.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.icon} {cat.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {accounts && accounts.length > 0 && (
                            <select
                                value={accountFilter}
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm outline-none cursor-pointer"
                            >
                                <option value="">Todas las cuentas</option>
                                {accounts.filter((a: any) => a.isActive).map((account: any) => (
                                    <option key={account.id} value={account.id}>
                                        🏦 {account.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm outline-none"
                            placeholder="Desde"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm outline-none"
                            placeholder="Hasta"
                        />
                    </div>
                    {(searchFilter || categoryFilter || accountFilter || startDate || endDate) && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {pagination ? `${pagination.total} resultado${pagination.total !== 1 ? 's' : ''}` : ''}
                            </span>
                            <button
                                onClick={() => {
                                    setSearchFilter('');
                                    setCategoryFilter('');
                                    setAccountFilter('');
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}

                    {/* Transactions List */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" role="status" aria-label="Cargando transacciones"></div>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-12">
                            <div className="inline-flex flex-col items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 max-w-md mx-auto">
                                <span className="text-3xl">⚠️</span>
                                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Error al cargar</h3>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {(error as any)?.message || 'No se pudieron cargar las transacciones'}
                                </p>
                                <button
                                    onClick={() => refetch()}
                                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="space-y-2">
                            {transactions.map((transaction: any) => (
                                <TransactionRow
                                    key={transaction.id}
                                    transaction={transaction}
                                    onEdit={() => handleEdit(transaction)}
                                    onDelete={(id) => {
                                        setConfirmMessage('¿Estás seguro de eliminar esta transacción?');
                                        setConfirmAction(() => () => deleteMutation.mutate(id));
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

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Mostrando {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg text-sm font-medium transition bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    ← Anterior
                                </button>
                                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                                    {pagination.page} / {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={currentPage >= pagination.totalPages}
                                    className="px-3 py-1 rounded-lg text-sm font-medium transition bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Siguiente →
                                </button>
                            </div>
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

                            {/* Account */}
                            {accounts && accounts.length > 0 && !editingTransaction.creditCardId && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cuenta</label>
                                    <select
                                        value={editingTransaction.accountId}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, accountId: e.target.value, creditCardId: '' })}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Sin cuenta</option>
                                        {accounts.filter((a: any) => a.isActive).map((account: any) => (
                                            <option key={account.id} value={account.id}>
                                                🏦 {account.name} — Saldo: {formatCOP(account.balance)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

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

            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction?.()}
                message={confirmMessage}
                confirmLabel="Eliminar"
                variant="danger"
            />
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
                    <div className="flex flex-wrap gap-1 mt-1">
                        {transaction.account && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                🏦 {transaction.account.name}
                            </span>
                        )}
                        {transaction.creditCard && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                💳 {transaction.creditCard.name} {transaction.creditCard.lastFourDigits ? `*${transaction.creditCard.lastFourDigits}` : ''}
                            </span>
                        )}
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
