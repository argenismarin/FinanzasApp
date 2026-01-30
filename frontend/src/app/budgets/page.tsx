'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { getTodayString } from '@/lib/utils';

export default function BudgetsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        period: 'MONTHLY',
        startDate: getTodayString()
    });

    const { data: budgets, isLoading } = useQuery({
        queryKey: ['budgets-progress'],
        queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets/progress`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json()),
        enabled: isAuthenticated
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json()),
        enabled: isAuthenticated
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            setShowModal(false);
            setFormData({ categoryId: '', amount: '', period: 'MONTHLY', startDate: getTodayString() });
            showToast('Presupuesto creado exitosamente', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al crear el presupuesto', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            showToast('Presupuesto eliminado', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al eliminar el presupuesto', 'error');
        }
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getPeriodLabel = (period: string) => {
        const labels: Record<string, string> = {
            'MONTHLY': 'Mensual',
            'WEEKLY': 'Semanal',
            'YEARLY': 'Anual'
        };
        return labels[period] || period;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Presupuestos
                    </Link>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                        + Nuevo Presupuesto
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : budgets && budgets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {budgets.map((budget: any) => (
                            <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {budget.category.icon} {budget.category.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{getPeriodLabel(budget.period)}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(budget.id)}
                                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        aria-label={`Eliminar presupuesto de ${budget.category.name}`}
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                        <span>Gastado</span>
                                        <span className="font-semibold">
                                            ${Number(budget.spent).toLocaleString('es-CO')} / ${Number(budget.amount).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                        <div
                                            className={`h-4 rounded-full transition-all ${getProgressColor(budget.percentage)}`}
                                            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{budget.percentage.toFixed(1)}% usado</span>
                                        <span className={budget.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                            {budget.remaining >= 0 ? 'Disponible' : 'Excedido'}: ${Math.abs(budget.remaining).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {budget.percentage >= 80 && (
                                    <div className={`text-sm p-3 rounded-lg ${budget.percentage >= 100 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                                        {budget.percentage >= 100 ? '⚠️ Presupuesto excedido!' : '⚠️ Acercándose al límite'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-4">📊</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes presupuestos configurados</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                        >
                            Crear Primer Presupuesto
                        </button>
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nuevo Presupuesto</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Categoría
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categories?.filter((c: any) => c.type === 'EXPENSE').map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto Mensual
                                </label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="500000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Fecha Inicio
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold py-3 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creando...' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
