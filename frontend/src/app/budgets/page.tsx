'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import Link from 'next/link';
import { getTodayString } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QueryStateBoundary } from '@/components/ui/QueryStateBoundary';
import { budgetSchema, type BudgetFormData } from '@/lib/schemas';

export default function BudgetsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const createForm = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: { categoryId: '', amount: 0, period: 'MONTHLY', startDate: getTodayString() }
    });
    const editForm = useForm<Pick<BudgetFormData, 'amount' | 'period'>>({
        defaultValues: { amount: 0, period: 'MONTHLY' }
    });

    const budgetsQuery = useQuery({
        queryKey: ['budgets-progress'],
        queryFn: () => api.getBudgetProgress(),
        enabled: isAuthenticated
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createBudget(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowModal(false);
            createForm.reset({ categoryId: '', amount: 0, period: 'MONTHLY', startDate: getTodayString() });
            showToast('Presupuesto creado exitosamente', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al crear el presupuesto', 'error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateBudget(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setEditingBudget(null);
            showToast('Presupuesto actualizado', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al actualizar el presupuesto', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteBudget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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

    const handleCreate = createForm.handleSubmit((data) => {
        createMutation.mutate(data);
    });

    const handleEdit = editForm.handleSubmit((data) => {
        if (!editingBudget) return;
        updateMutation.mutate({
            id: editingBudget.id,
            data: { amount: data.amount, period: data.period }
        });
    });

    const openEditModal = (budget: any) => {
        editForm.reset({
            amount: Number(budget.amount),
            period: budget.period
        });
        setEditingBudget({ id: budget.id });
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
                <QueryStateBoundary
                    query={budgetsQuery}
                    emptyState={
                        <div className="text-center py-12">
                            <p className="text-4xl mb-4">💰</p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes presupuestos creados</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                Crear Primer Presupuesto
                            </button>
                        </div>
                    }
                >
                    {(budgetsList: any[]) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {budgetsList.map((budget: any) => (
                            <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {budget.category.icon} {budget.category.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{getPeriodLabel(budget.period)}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setEditingBudget({
                                                id: budget.id,
                                                amount: Number(budget.amount),
                                                period: budget.period,
                                                categoryId: budget.categoryId
                                            })}
                                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                            aria-label={`Editar presupuesto de ${budget.category.name}`}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete({ id: budget.id, name: budget.category.name })}
                                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                            aria-label={`Eliminar presupuesto de ${budget.category.name}`}
                                        >
                                            🗑️
                                        </button>
                                    </div>
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
                    )}
                </QueryStateBoundary>
            </main>

            {/* Edit Modal */}
            {editingBudget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">✏️ Editar Presupuesto</h2>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto
                                </label>
                                <input
                                    type="number"
                                    {...editForm.register('amount', { valueAsNumber: true })}
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Período
                                </label>
                                <select
                                    {...editForm.register('period')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="WEEKLY">Semanal</option>
                                    <option value="MONTHLY">Mensual</option>
                                    <option value="YEARLY">Anual</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingBudget(null)}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold py-3 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nuevo Presupuesto</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Categoría
                                </label>
                                <select
                                    {...createForm.register('categoryId')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categories?.filter((c: any) => c.type === 'EXPENSE').map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {createForm.formState.errors.categoryId && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.categoryId.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto Mensual
                                </label>
                                <input
                                    type="number"
                                    {...createForm.register('amount', { valueAsNumber: true })}
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="500000"
                                />
                                {createForm.formState.errors.amount && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.amount.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Fecha Inicio
                                </label>
                                <input
                                    type="date"
                                    {...createForm.register('startDate')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {createForm.formState.errors.startDate && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.startDate.message}</p>
                                )}
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

            <ConfirmModal
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => {
                    if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
                    setConfirmDelete(null);
                }}
                title="Eliminar presupuesto"
                message={`¿Seguro que quieres eliminar el presupuesto de "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
