'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RecurringTransaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    categoryId: string;
    description: string;
    frequency: string;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    startDate: string;
    endDate: string | null;
    lastExecuted: string | null;
    nextExecution: string;
    isActive: boolean;
    autoCreate: boolean;
}

interface Category {
    id: string;
    name: string;
    type: string;
    icon: string;
}

const FREQUENCIES = [
    { value: 'DAILY', label: 'Diario' },
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'BIWEEKLY', label: 'Quincenal' },
    { value: 'MONTHLY', label: 'Mensual' },
    { value: 'QUARTERLY', label: 'Trimestral' },
    { value: 'YEARLY', label: 'Anual' },
];

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
];

export default function RecurringTransactionsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        amount: '',
        categoryId: '',
        description: '',
        frequency: 'MONTHLY',
        dayOfMonth: '1',
        dayOfWeek: '1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        autoCreate: false
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch recurring transactions
    const { data: recurring, isLoading } = useQuery<RecurringTransaction[]>({
        queryKey: ['recurring-transactions'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/recurring`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    // Fetch pending
    const { data: pending } = useQuery<RecurringTransaction[]>({
        queryKey: ['recurring-pending'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/recurring/pending`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    // Fetch categories
    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories', formData.type],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/categories?type=${formData.type}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${API_URL}/recurring`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['recurring-pending'] });
            setShowModal(false);
            resetForm();
            showToast('Transacción recurrente creada', 'success');
        },
        onError: () => showToast('Error al crear', 'error')
    });

    // Execute mutation
    const executeMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_URL}/recurring/${id}/execute`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['recurring-pending'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            showToast('Transacción creada', 'success');
        },
        onError: () => showToast('Error al ejecutar', 'error')
    });

    // Execute all pending
    const executeAllMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`${API_URL}/recurring/execute-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['recurring-pending'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            showToast(`${data.executed} transacciones creadas`, 'success');
        },
        onError: () => showToast('Error al ejecutar', 'error')
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_URL}/recurring/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
            showToast('Transacción eliminada', 'success');
        },
        onError: () => showToast('Error al eliminar', 'error')
    });

    const resetForm = () => {
        setFormData({
            type: 'EXPENSE',
            amount: '',
            categoryId: '',
            description: '',
            frequency: 'MONTHLY',
            dayOfMonth: '1',
            dayOfWeek: '1',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            autoCreate: false
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount.replace(/\./g, '')),
            dayOfMonth: formData.frequency !== 'WEEKLY' ? parseInt(formData.dayOfMonth) : null,
            dayOfWeek: formData.frequency === 'WEEKLY' ? parseInt(formData.dayOfWeek) : null,
            endDate: formData.endDate || null
        });
    };

    const getFrequencyLabel = (freq: string) => {
        return FREQUENCIES.find(f => f.value === freq)?.label || freq;
    };

    const getCategoryInfo = (categoryId: string) => {
        // Search in all categories
        return categories?.find(c => c.id === categoryId);
    };

    const formatNextExecution = (date: string) => {
        const d = new Date(date);
        const today = new Date();
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diff < 0) return 'Pendiente';
        if (diff === 0) return 'Hoy';
        if (diff === 1) return 'Mañana';
        if (diff < 7) return `En ${diff} días`;
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
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
                    <div className="flex justify-between items-center">
                        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                            ← Volver al Dashboard
                        </Link>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                        >
                            + Nueva Recurrente
                        </button>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mt-4">🔄 Transacciones Recurrentes</h1>
                    <p className="text-gray-600">Automatiza tus ingresos y gastos periódicos</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Pending Alert */}
                {pending && pending.length > 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                                    <span>⏰</span> {pending.length} transacción(es) pendiente(s)
                                </h3>
                                <p className="text-yellow-700 text-sm mt-1">
                                    Tienes transacciones recurrentes que ya deberían haberse ejecutado
                                </p>
                            </div>
                            <button
                                onClick={() => executeAllMutation.mutate()}
                                disabled={executeAllMutation.isPending}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                            >
                                {executeAllMutation.isPending ? 'Ejecutando...' : 'Ejecutar Todas'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Recurring List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : recurring && recurring.length > 0 ? (
                    <div className="space-y-4">
                        {recurring.map((r) => {
                            const cat = getCategoryInfo(r.categoryId);
                            const isPending = new Date(r.nextExecution) <= new Date();

                            return (
                                <div key={r.id} className={`bg-white rounded-xl p-6 shadow-sm ${isPending ? 'border-2 border-yellow-400' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-full ${r.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                                                <span className="text-2xl">{cat?.icon || (r.type === 'INCOME' ? '💰' : '💸')}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{r.description}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {cat?.name || 'Sin categoría'} • {getFrequencyLabel(r.frequency)}
                                                    {r.dayOfMonth && ` • Día ${r.dayOfMonth}`}
                                                    {r.dayOfWeek !== null && ` • ${DAYS_OF_WEEK.find(d => d.value === r.dayOfWeek)?.label}`}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        Próximo: {formatNextExecution(r.nextExecution)}
                                                    </span>
                                                    {r.autoCreate && (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                                            Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-bold ${r.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                {r.type === 'INCOME' ? '+' : '-'}{formatCOP(r.amount)}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => executeMutation.mutate(r.id)}
                                                    disabled={executeMutation.isPending}
                                                    className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                                                    aria-label={`Ejecutar ${r.description}`}
                                                >
                                                    ▶️ Ejecutar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('¿Eliminar esta transacción recurrente?')) {
                                                            deleteMutation.mutate(r.id);
                                                        }
                                                    }}
                                                    className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                                                    aria-label={`Eliminar ${r.description}`}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                        <p className="text-6xl mb-4">🔄</p>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No tienes transacciones recurrentes</h3>
                        <p className="text-gray-500 mb-6">Automatiza tus ingresos y gastos que se repiten periódicamente</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
                        >
                            + Crear Primera Recurrente
                        </button>
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Transacción Recurrente</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'INCOME', categoryId: '' })}
                                    className={`p-3 rounded-lg border-2 transition ${formData.type === 'INCOME' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}
                                >
                                    <span className="text-xl">💰</span>
                                    <p className="text-sm font-medium">Ingreso</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', categoryId: '' })}
                                    className={`p-3 rounded-lg border-2 transition ${formData.type === 'EXPENSE' ? 'border-red-600 bg-red-50' : 'border-gray-200'}`}
                                >
                                    <span className="text-xl">💸</span>
                                    <p className="text-sm font-medium">Gasto</p>
                                </button>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                <CurrencyInput
                                    value={formData.amount}
                                    onChange={(value) => setFormData({ ...formData, amount: value })}
                                    placeholder="100.000"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categories?.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ej: Salario, Netflix, Arriendo"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {FREQUENCIES.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Day selection */}
                            {formData.frequency === 'WEEKLY' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de la semana</label>
                                    <select
                                        value={formData.dayOfWeek}
                                        onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {DAYS_OF_WEEK.map((d) => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : formData.frequency !== 'DAILY' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Día del mes</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dayOfMonth}
                                        onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* End Date (optional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de fin (opcional)</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Auto Create */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoCreate"
                                    checked={formData.autoCreate}
                                    onChange={(e) => setFormData({ ...formData, autoCreate: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="autoCreate" className="text-sm text-gray-700">
                                    Crear automáticamente cuando llegue la fecha
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Guardando...' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
