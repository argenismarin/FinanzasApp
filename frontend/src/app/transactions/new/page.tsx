'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';
import TagInput from '@/components/TagInput';

export default function NewTransactionPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        type: 'EXPENSE',
        amount: '',
        categoryId: '',
        description: '',
        date: getTodayString(),
        tags: [] as string[],
        creditCardId: '',
        accountId: '',
    });
    const [paymentSource, setPaymentSource] = useState<'account' | 'creditCard'>('account');

    const [categorySuggestion, setCategorySuggestion] = useState<any>(null);
    const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-suggest category based on description
    useEffect(() => {
        if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
        if (formData.description.length < 3 || formData.categoryId) {
            setCategorySuggestion(null);
            return;
        }
        suggestTimeoutRef.current = setTimeout(async () => {
            try {
                const result = await api.suggestCategory(formData.description, formData.type);
                if (result.suggestion && !formData.categoryId) {
                    setCategorySuggestion(result.suggestion);
                }
            } catch {
                // ignore
            }
        }, 500);
        return () => { if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current); };
    }, [formData.description, formData.categoryId, formData.type]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: categories } = useQuery({
        queryKey: ['categories', formData.type],
        queryFn: () => api.getCategories(formData.type),
        enabled: isAuthenticated,
    });

    // Fetch bank accounts
    const { data: accounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => api.getAccounts(),
        enabled: isAuthenticated,
    });

    // Auto-select "General" account when accounts load
    useEffect(() => {
        if (accounts && accounts.length > 0 && !formData.accountId && paymentSource === 'account') {
            const generalAccount = accounts.find((a: any) => a.name === 'General');
            const defaultAccount = generalAccount || accounts[0];
            setFormData(prev => ({ ...prev, accountId: defaultAccount.id }));
        }
    }, [accounts]);

    // Fetch credit cards for expense transactions
    const { data: creditCards } = useQuery({
        queryKey: ['credit-cards'],
        queryFn: () => api.getCreditCards(),
        enabled: isAuthenticated && formData.type === 'EXPENSE',
    });

    // Fetch budgets for real-time alerts
    const { data: budgets } = useQuery({
        queryKey: ['budgets'],
        queryFn: () => api.getBudgets(),
        enabled: isAuthenticated && formData.type === 'EXPENSE',
    });

    // Calculate budget alert
    const budgetAlert = useMemo(() => {
        if (formData.type !== 'EXPENSE' || !formData.categoryId || !budgets) return null;

        const budget = budgets.find((b: any) => b.categoryId === formData.categoryId && b.isActive);
        if (!budget) return null;

        const budgetAmount = Number(budget.amount);
        const currentSpent = Number(budget.spent || 0);
        const newAmount = parseFloat(formData.amount.replace(/\./g, '')) || 0;
        const afterTransaction = currentSpent + newAmount;
        const percentageAfter = (afterTransaction / budgetAmount) * 100;

        return {
            category: budget.category,
            budgetAmount,
            currentSpent,
            newAmount,
            afterTransaction,
            percentageAfter,
            remaining: budgetAmount - afterTransaction,
            willExceed: afterTransaction > budgetAmount,
            isWarning: percentageAfter >= 80 && percentageAfter < 100,
        };
    }, [formData.categoryId, formData.amount, formData.type, budgets]);

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createTransaction(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            router.push('/transactions');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount),
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            creditCardId: paymentSource === 'creditCard' ? (formData.creditCardId || undefined) : undefined,
            accountId: paymentSource === 'account' ? (formData.accountId || undefined) : undefined,
        });
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/transactions" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Volver
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                        Nueva Transacción
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'INCOME', categoryId: '', creditCardId: '' })}
                                    className={`p-4 rounded-lg border-2 transition ${formData.type === 'INCOME'
                                            ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">💰</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Ingreso</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', categoryId: '', creditCardId: '' })}
                                    className={`p-4 rounded-lg border-2 transition ${formData.type === 'EXPENSE'
                                            ? 'border-red-600 bg-red-50 dark:bg-red-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">💸</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Gasto</div>
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Monto (COP)
                            </label>
                            <CurrencyInput
                                value={formData.amount}
                                onChange={(value) => setFormData({ ...formData, amount: value })}
                                placeholder="Ingrese el monto"
                                autoFocus
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Categoría
                            </label>
                            <select
                                id="category"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Selecciona una categoría</option>
                                {categories?.map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Source: Account or Credit Card */}
                        {formData.type === 'EXPENSE' && creditCards && creditCards.length > 0 ? (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Origen del pago
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentSource('account')}
                                        className={`p-3 rounded-lg border-2 transition text-sm ${paymentSource === 'account'
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                        }`}
                                    >
                                        <div className="text-xl mb-1">🏦</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">Cuenta</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentSource('creditCard')}
                                        className={`p-3 rounded-lg border-2 transition text-sm ${paymentSource === 'creditCard'
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                                        }`}
                                    >
                                        <div className="text-xl mb-1">💳</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">Tarjeta de crédito</div>
                                    </button>
                                </div>

                                {paymentSource === 'account' && accounts && accounts.length > 0 && (
                                    <select
                                        value={formData.accountId}
                                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Selecciona una cuenta</option>
                                        {accounts.filter((a: any) => a.isActive).map((account: any) => (
                                            <option key={account.id} value={account.id}>
                                                🏦 {account.name} — Saldo: {formatCOP(account.balance)}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {paymentSource === 'creditCard' && (
                                    <select
                                        value={formData.creditCardId}
                                        onChange={(e) => setFormData({ ...formData, creditCardId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Selecciona una tarjeta</option>
                                        {creditCards.filter((card: any) => card.isActive).map((card: any) => (
                                            <option key={card.id} value={card.id}>
                                                💳 {card.name} {card.lastFourDigits ? `*${card.lastFourDigits}` : ''} — Disponible: {formatCOP(card.availableCredit)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ) : (
                            /* Account selector for INCOME or when no credit cards exist */
                            accounts && accounts.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cuenta
                                    </label>
                                    <select
                                        value={formData.accountId}
                                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Selecciona una cuenta</option>
                                        {accounts.filter((a: any) => a.isActive).map((account: any) => (
                                            <option key={account.id} value={account.id}>
                                                🏦 {account.name} — Saldo: {formatCOP(account.balance)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )
                        )}

                        {/* Budget Alert */}
                        {budgetAlert && (
                            <div className={`rounded-lg p-4 border-2 ${
                                budgetAlert.willExceed
                                    ? 'bg-red-50 border-red-300'
                                    : budgetAlert.isWarning
                                        ? 'bg-yellow-50 border-yellow-300'
                                        : 'bg-blue-50 border-blue-200'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">
                                        {budgetAlert.willExceed ? '🚨' : budgetAlert.isWarning ? '⚠️' : '📊'}
                                    </span>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${
                                            budgetAlert.willExceed
                                                ? 'text-red-700'
                                                : budgetAlert.isWarning
                                                    ? 'text-yellow-700'
                                                    : 'text-blue-700'
                                        }`}>
                                            {budgetAlert.willExceed
                                                ? 'Excederás tu presupuesto'
                                                : budgetAlert.isWarning
                                                    ? 'Cerca del límite del presupuesto'
                                                    : `Presupuesto de ${budgetAlert.category?.name || 'categoría'}`}
                                        </p>
                                        <div className="mt-2 text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Presupuesto:</span>
                                                <span className="font-medium">{formatCOP(budgetAlert.budgetAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Gastado este mes:</span>
                                                <span className="font-medium">{formatCOP(budgetAlert.currentSpent)}</span>
                                            </div>
                                            {budgetAlert.newAmount > 0 && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Esta transacción:</span>
                                                        <span className="font-medium text-red-600">+{formatCOP(budgetAlert.newAmount)}</span>
                                                    </div>
                                                    <div className="border-t border-gray-300 pt-1 mt-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-700 font-medium">Después:</span>
                                                            <span className={`font-bold ${budgetAlert.willExceed ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {formatCOP(budgetAlert.afterTransaction)} ({Math.round(budgetAlert.percentageAfter)}%)
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Restante:</span>
                                                            <span className={`font-medium ${budgetAlert.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatCOP(budgetAlert.remaining)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {/* Progress bar */}
                                        <div className="mt-3">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        budgetAlert.willExceed
                                                            ? 'bg-red-500'
                                                            : budgetAlert.isWarning
                                                                ? 'bg-yellow-500'
                                                                : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.min(budgetAlert.percentageAfter, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Descripción
                            </label>
                            <input
                                id="description"
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ej: Mercado del mes"
                            />
                            {categorySuggestion && !formData.categoryId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, categoryId: categorySuggestion.categoryId });
                                        setCategorySuggestion(null);
                                    }}
                                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
                                >
                                    🤖 Sugerencia: {categorySuggestion.category?.icon} {categorySuggestion.category?.name}
                                    <span className="font-semibold text-purple-600 dark:text-purple-400">[Usar]</span>
                                </button>
                            )}
                        </div>

                        {/* Date */}
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fecha
                            </label>
                            <input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Etiquetas (opcional)
                            </label>
                            <TagInput
                                tags={formData.tags}
                                onChange={(tags) => setFormData({ ...formData, tags })}
                                placeholder="Ej: vacaciones, emergencia, trabajo..."
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending ? 'Guardando...' : 'Guardar Transacción'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
