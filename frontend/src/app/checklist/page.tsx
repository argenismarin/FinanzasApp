'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

export default function ChecklistPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [newItem, setNewItem] = useState({
        name: '',
        amount: '',
        dueDay: '1',
        categoryId: '',
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: checklistData, isLoading, refetch } = useQuery({
        queryKey: ['checklist', selectedMonth, selectedYear],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/checklist?month=${selectedMonth}&year=${selectedYear}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) throw new Error('Failed to fetch checklist');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated,
    });

    const toggleMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/checklist/${itemId}/toggle?month=${selectedMonth}&year=${selectedYear}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) throw new Error('Failed to toggle item');
            return response.json();
        },
        onSuccess: () => {
            refetch();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checklist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create item');
            }
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setShowAddForm(false);
            setNewItem({ name: '', amount: '', dueDay: '1', categoryId: '' });
            showToast('Item guardado exitosamente', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al guardar item', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/checklist/${itemId}?month=${selectedMonth}&year=${selectedYear}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            if (!response.ok) throw new Error('Failed to delete item');
            return response.json();
        },
        onSuccess: (data) => {
            refetch();
            showToast(`Item eliminado desde ${data.deletedFrom}`, 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al eliminar item', 'error');
        },
    });

    const handleCreateItem = () => {
        createMutation.mutate({
            ...newItem,
            amount: parseFloat(newItem.amount),
            dueDay: parseInt(newItem.dueDay),
            month: selectedMonth,
            year: selectedYear,
        });
    };

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checklist/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update item');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setEditingItem(null);
            showToast('Item actualizado exitosamente', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Error al actualizar item', 'error');
        },
    });

    const handleUpdateItem = () => {
        if (editingItem) {
            updateMutation.mutate({
                id: editingItem.id,
                data: {
                    name: editingItem.name,
                    amount: parseFloat(editingItem.amount),
                    categoryId: editingItem.categoryId,
                    dueDay: parseInt(editingItem.dueDay),
                }
            });
        }
    };

    const handleDeleteItem = (itemId: string, itemName: string) => {
        if (confirm(`¿Estás seguro de eliminar "${itemName}"?`)) {
            deleteMutation.mutate(itemId);
        }
    };

    // Refetch when month or year changes
    useEffect(() => {
        if (isAuthenticated) {
            refetch();
        }
    }, [selectedMonth, selectedYear, isAuthenticated, refetch]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const items = Array.isArray(checklistData) ? checklistData : [];
    const completedCount = items.filter((item: any) => item.isCompleted).length;
    const totalAmount = items.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const completedAmount = items
        .filter((item: any) => item.isCompleted)
        .reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                        ← Dashboard
                    </Link>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        + Nuevo Item
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        ✅ Checklist de Gastos Mensuales
                    </h1>

                    {/* Month Selector */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mes
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(2024, i).toLocaleDateString('es-CO', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Año
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value={2024}>2024</option>
                                    <option value={2025}>2025</option>
                                    <option value={2026}>2026</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Progreso del Mes</h2>
                            <span className="text-2xl font-bold text-blue-600">
                                {completedCount}/{items.length}
                            </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Estimado</p>
                                <p className="text-xl font-bold text-gray-900">{formatCOP(totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Completado</p>
                                <p className="text-xl font-bold text-green-600">{formatCOP(completedAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Add Form */}
                    {showAddForm && (
                        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo Item</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nombre (ej: Pago de arriendo)"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <input
                                    type="number"
                                    placeholder="Monto"
                                    value={newItem.amount}
                                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="Día (1-31)"
                                        value={newItem.dueDay}
                                        onChange={(e) => setNewItem({ ...newItem, dueDay: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <select
                                        value={newItem.categoryId}
                                        onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Categoría</option>
                                        {categories?.map((cat: any) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateItem}
                                        disabled={!newItem.name || !newItem.amount || !newItem.categoryId || createMutation.isPending}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Form Modal */}
                    {editingItem && (
                        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">✏️ Editar Item</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nombre"
                                    value={editingItem.name}
                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <input
                                    type="number"
                                    placeholder="Monto"
                                    value={editingItem.amount}
                                    onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="Día (1-31)"
                                        value={editingItem.dueDay}
                                        onChange={(e) => setEditingItem({ ...editingItem, dueDay: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <select
                                        value={editingItem.categoryId}
                                        onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Categoría</option>
                                        {categories?.map((cat: any) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUpdateItem}
                                        disabled={!editingItem.name || !editingItem.amount || !editingItem.categoryId || updateMutation.isPending}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMutation.isPending ? 'Actualizando...' : 'Actualizar'}
                                    </button>
                                    <button
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Checklist Items */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Items del Mes</h2>

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : items.length > 0 ? (
                            <div className="space-y-2">
                                {items
                                    .sort((a: any, b: any) => a.dueDay - b.dueDay)
                                    .map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition ${item.isCompleted
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={item.isCompleted}
                                                onChange={() => toggleMutation.mutate(item.id)}
                                                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <p className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Día {item.dueDay} • {formatCOP(parseFloat(item.amount))}
                                                </p>
                                            </div>
                                            {item.isCompleted && item.completedAt && (
                                                <span className="text-xs text-green-600">
                                                    ✓ {new Date(item.completedAt).toLocaleDateString('es-CO')}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setEditingItem({
                                                    id: item.id,
                                                    name: item.name,
                                                    amount: item.amount.toString(),
                                                    categoryId: item.categoryId,
                                                    dueDay: item.dueDay.toString()
                                                })}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                title="Editar item"
                                                aria-label={`Editar item ${item.name}`}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                title="Eliminar item"
                                                aria-label={`Eliminar item ${item.name}`}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-lg mb-2">📝 No hay items en el checklist</p>
                                <p className="text-sm">Agrega gastos recurrentes para no olvidarlos</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
