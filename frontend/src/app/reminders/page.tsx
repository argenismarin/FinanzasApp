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
import { reminderSchema, type ReminderFormData } from '@/lib/schemas';
import Link from 'next/link';

export default function RemindersPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editingReminder, setEditingReminder] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const createForm = useForm<ReminderFormData>({
        resolver: zodResolver(reminderSchema),
        defaultValues: { name: '', amount: 0, categoryId: '', dueDay: 1, isRecurring: true }
    });

    const remindersQuery = useQuery({
        queryKey: ['reminders'],
        queryFn: () => api.getReminders(),
        enabled: isAuthenticated
    });
    const reminders = remindersQuery.data;

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createReminder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowModal(false);
            createForm.reset({ name: '', amount: 0, categoryId: '', dueDay: 1, isRecurring: true });
            showToast('Recordatorio creado exitosamente', 'success');
        },
        onError: (err: any) => showToast(err?.message || 'Error al crear el recordatorio', 'error')
    });

    const handleCreate = createForm.handleSubmit((data) => {
        createMutation.mutate(data);
    });

    const markPaidMutation = useMutation({
        mutationFn: (id: string) => api.markReminderPaid(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            showToast('Pago registrado', 'success');
        },
        onError: () => showToast('Error al registrar el pago', 'error')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateReminder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setEditingReminder(null);
            showToast('Recordatorio actualizado', 'success');
        },
        onError: () => showToast('Error al actualizar', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteReminder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            showToast('Recordatorio eliminado', 'success');
        },
        onError: () => showToast('Error al eliminar', 'error')
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }


    const today = new Date().getDate();
    const upcomingReminders = reminders?.filter((r: any) => {
        const daysUntil = r.dueDay - today;
        return daysUntil >= 0 && daysUntil <= 7 && !r.isPaid;
    }) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Recordatorios de Pago
                    </Link>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                        + Nuevo Recordatorio
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {upcomingReminders.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-4">
                            ⚠️ Próximos Pagos (7 días)
                        </h3>
                        <div className="space-y-3">
                            {upcomingReminders.map((reminder: any) => (
                                <div key={reminder.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{reminder.category.icon} {reminder.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Día {reminder.dueDay} - ${reminder.amount.toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => markPaidMutation.mutate(reminder.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                                    >
                                        Marcar Pagado
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <QueryStateBoundary
                    query={remindersQuery}
                    emptyState={
                        <div className="text-center py-12">
                            <p className="text-4xl mb-4">🔔</p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes recordatorios configurados</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                Crear Primer Recordatorio
                            </button>
                        </div>
                    }
                >
                    {(remindersList: any[]) => (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Todos los Recordatorios</h3>
                        <div className="space-y-3">
                            {remindersList.map((reminder: any) => (
                                <div key={reminder.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">{reminder.category.icon}</span>
                                                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{reminder.name}</h4>
                                                {reminder.isPaid && (
                                                    <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded">
                                                        ✓ Pagado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                ${reminder.amount.toLocaleString()} - Día {reminder.dueDay} de cada mes
                                            </p>
                                            {reminder.lastPaidDate && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    Último pago: {new Date(reminder.lastPaidDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {!reminder.isPaid && (
                                                <button
                                                    onClick={() => markPaidMutation.mutate(reminder.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditingReminder({
                                                    id: reminder.id,
                                                    name: reminder.name,
                                                    amount: String(reminder.amount),
                                                    categoryId: reminder.categoryId,
                                                    dueDay: String(reminder.dueDay),
                                                    isRecurring: reminder.isRecurring
                                                })}
                                                className="text-blue-600 hover:text-blue-700 p-1"
                                                aria-label={`Editar ${reminder.name}`}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ id: reminder.id, name: reminder.name })}
                                                className="text-red-600 hover:text-red-700 p-1"
                                                aria-label={`Eliminar ${reminder.name}`}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                </QueryStateBoundary>
            </main>

            {/* Edit Modal */}
            {editingReminder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">✏️ Editar Recordatorio</h2>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({
                                id: editingReminder.id,
                                data: {
                                    name: editingReminder.name,
                                    amount: parseFloat(editingReminder.amount),
                                    categoryId: editingReminder.categoryId,
                                    dueDay: parseInt(editingReminder.dueDay),
                                    isRecurring: editingReminder.isRecurring
                                }
                            });
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    value={editingReminder.name}
                                    onChange={(e) => setEditingReminder({ ...editingReminder, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto</label>
                                <input
                                    type="number"
                                    value={editingReminder.amount}
                                    onChange={(e) => setEditingReminder({ ...editingReminder, amount: e.target.value })}
                                    required
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                                <select
                                    value={editingReminder.categoryId}
                                    onChange={(e) => setEditingReminder({ ...editingReminder, categoryId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categories?.filter((c: any) => c.type === 'EXPENSE').map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Día del Mes</label>
                                <input
                                    type="number"
                                    value={editingReminder.dueDay}
                                    onChange={(e) => setEditingReminder({ ...editingReminder, dueDay: e.target.value })}
                                    required
                                    min="1"
                                    max="31"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingReminder(null)}
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
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nuevo Recordatorio</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre del Pago</label>
                                <input
                                    type="text"
                                    {...createForm.register('name')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Arriendo, Netflix..."
                                />
                                {createForm.formState.errors.name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto</label>
                                <input
                                    type="number"
                                    {...createForm.register('amount', { valueAsNumber: true })}
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="50000"
                                />
                                {createForm.formState.errors.amount && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.amount.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Día del Mes (1-31)</label>
                                <input
                                    type="number"
                                    {...createForm.register('dueDay', { valueAsNumber: true })}
                                    min="1"
                                    max="31"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="15"
                                />
                                {createForm.formState.errors.dueDay && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createForm.formState.errors.dueDay.message}</p>
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
                title="Eliminar recordatorio"
                message={`¿Seguro que quieres eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
