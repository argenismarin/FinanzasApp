'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QueryStateBoundary } from '@/components/ui/QueryStateBoundary';
import { goalSchema, type GoalFormData } from '@/lib/schemas';
import Link from 'next/link';

export default function GoalsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

    // react-hook-form + Zod — validación inline con mensajes en español
    const createForm = useForm<GoalFormData>({
        resolver: zodResolver(goalSchema),
        defaultValues: { name: '', targetAmount: 0, deadline: '' }
    });
    const editForm = useForm<GoalFormData>({
        resolver: zodResolver(goalSchema),
        defaultValues: { name: '', targetAmount: 0, deadline: '' }
    });

    const goalsQuery = useQuery({
        queryKey: ['goals'],
        queryFn: () => api.getGoals(),
        enabled: isAuthenticated
    });
    const goals = goalsQuery.data;
    const isLoading = goalsQuery.isLoading;

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createGoal(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowModal(false);
            createForm.reset({ name: '', targetAmount: 0, deadline: '' });
            showToast('Meta creada exitosamente', 'success');
        },
        onError: (err: any) => showToast(err?.message || 'Error al crear la meta', 'error')
    });

    const contributeMutation = useMutation({
        mutationFn: ({ id, amount }: { id: string; amount: string }) =>
            api.contributeToGoal(id, { amount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            setShowContributeModal(false);
            setContributeAmount('');
            showToast('Aporte registrado exitosamente', 'success');
        },
        onError: () => showToast('Error al registrar el aporte', 'error')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateGoal(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setEditingGoal(null);
            showToast('Meta actualizada', 'success');
        },
        onError: (err: any) => showToast(err?.message || 'Error al actualizar la meta', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteGoal(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            showToast('Meta eliminada', 'success');
        },
        onError: () => showToast('Error al eliminar la meta', 'error')
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const handleCreate = createForm.handleSubmit((data) => {
        createMutation.mutate({
            name: data.name,
            targetAmount: data.targetAmount,
            deadline: data.deadline || null
        });
    });

    const handleEdit = editForm.handleSubmit((data) => {
        if (!editingGoal) return;
        updateMutation.mutate({
            id: editingGoal.id,
            data: {
                name: data.name,
                targetAmount: data.targetAmount,
                deadline: data.deadline || null
            }
        });
    });

    const openEditModal = (goal: any) => {
        editForm.reset({
            name: goal.name,
            targetAmount: Number(goal.targetAmount),
            deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''
        });
        setEditingGoal({ id: goal.id });
    };

    const handleContribute = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedGoal) {
            contributeMutation.mutate({ id: selectedGoal.id, amount: contributeAmount });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Metas de Ahorro
                    </Link>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                        + Nueva Meta
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <QueryStateBoundary
                    query={goalsQuery}
                    emptyState={
                        <div className="text-center py-12">
                            <p className="text-4xl mb-4">🎯</p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes metas de ahorro</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                Crear Primera Meta
                            </button>
                        </div>
                    }
                >
                    {(goalsList: any[]) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goalsList.map((goal: any) => (
                            <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                            {goal.isCompleted ? '✅' : '🎯'} {goal.name}
                                        </h3>
                                        {goal.deadline && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                📅 {new Date(goal.deadline).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditModal(goal)}
                                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                            aria-label={`Editar meta ${goal.name}`}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfirmDeleteId(goal.id);
                                                setConfirmDeleteName(goal.name);
                                            }}
                                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                            aria-label={`Eliminar meta ${goal.name}`}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                        <span>Progreso</span>
                                        <span className="font-semibold">
                                            ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all"
                                            style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{goal.percentage.toFixed(1)}%</span>
                                        <span className="text-blue-600 dark:text-blue-400">
                                            Faltan: ${goal.remaining.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {!goal.isCompleted && (
                                    <button
                                        onClick={() => {
                                            setSelectedGoal(goal);
                                            setShowContributeModal(true);
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
                                    >
                                        💰 Agregar Dinero
                                    </button>
                                )}

                                {goal.isCompleted && (
                                    <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-center py-2 rounded-lg font-semibold">
                                        🎉 ¡Meta Completada!
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    )}
                </QueryStateBoundary>
            </main>

            {/* Edit Modal */}
            {editingGoal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">✏️ Editar Meta</h2>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    {...editForm.register('name')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {editForm.formState.errors.name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editForm.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto Objetivo
                                </label>
                                <input
                                    type="number"
                                    {...editForm.register('targetAmount')}
                                    min="0"
                                    step="10000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {editForm.formState.errors.targetAmount && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editForm.formState.errors.targetAmount.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Fecha Límite (Opcional)
                                </label>
                                <input
                                    type="date"
                                    {...editForm.register('deadline')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {editForm.formState.errors.deadline && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editForm.formState.errors.deadline.message}</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingGoal(null)}
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
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nueva Meta de Ahorro</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nombre de la Meta
                                </label>
                                <input
                                    type="text"
                                    {...createForm.register('name')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Vacaciones, Auto nuevo..."
                                />
                                {createForm.formState.errors.name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto Objetivo
                                </label>
                                <input
                                    type="number"
                                    {...createForm.register('targetAmount')}
                                    min="0"
                                    step="10000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="5000000"
                                />
                                {createForm.formState.errors.targetAmount && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.targetAmount.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Fecha Límite (Opcional)
                                </label>
                                <input
                                    type="date"
                                    {...createForm.register('deadline')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {createForm.formState.errors.deadline && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.deadline.message}</p>
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

            {/* Contribute Modal */}
            {showContributeModal && selectedGoal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Agregar Dinero</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedGoal.name}</p>
                        <form onSubmit={handleContribute} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto a Agregar
                                </label>
                                <input
                                    type="number"
                                    value={contributeAmount}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="50000"
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-sm">
                                <p className="text-gray-700 dark:text-gray-300">
                                    Actual: <span className="font-semibold">${selectedGoal.currentAmount.toLocaleString()}</span>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Objetivo: <span className="font-semibold">${selectedGoal.targetAmount.toLocaleString()}</span>
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowContributeModal(false);
                                        setContributeAmount('');
                                    }}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold py-3 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={contributeMutation.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                                >
                                    {contributeMutation.isPending ? 'Agregando...' : 'Agregar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
                    setConfirmDeleteId(null);
                }}
                title="Eliminar meta"
                message={`¿Seguro que quieres eliminar la meta "${confirmDeleteName}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
