'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
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
        date: new Date().toISOString().split('T')[0],
        tags: [] as string[],
    });

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

    // Fetch budgets for real-time alerts
    const { data: budgets } = useQuery({
        queryKey: ['budgets'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch budgets');
            return response.json();
        },
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
            router.push('/transactions');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount),
            tags: formData.tags.length > 0 ? formData.tags : undefined,
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/transactions" className="text-2xl font-bold text-gray-900">
                        ← Volver
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Nueva Transacción
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'INCOME', categoryId: '' })}
                                    className={`p-4 rounded-lg border-2 transition ${formData.type === 'INCOME'
                                            ? 'border-green-600 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">💰</div>
                                    <div className="font-semibold">Ingreso</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', categoryId: '' })}
                                    className={`p-4 rounded-lg border-2 transition ${formData.type === 'EXPENSE'
                                            ? 'border-red-600 bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">💸</div>
                                    <div className="font-semibold">Gasto</div>
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
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
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                Categoría
                            </label>
                            <select
                                id="category"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            >
                                <option value="">Selecciona una categoría</option>
                                {categories?.map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Descripción
                            </label>
                            <input
                                id="description"
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="Ej: Mercado del mes"
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha
                            </label>
                            <input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
