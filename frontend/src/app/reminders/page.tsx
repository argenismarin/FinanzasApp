'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

export default function RemindersPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        categoryId: '',
        dueDay: '',
        isRecurring: true
    });

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['reminders'],
        queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/reminders`, {
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
        mutationFn: (data: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            setShowModal(false);
            setFormData({ name: '', amount: '', categoryId: '', dueDay: '', isRecurring: true });
        }
    });

    const markPaidMutation = useMutation({
        mutationFn: (id: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/reminders/${id}/mark-paid`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/reminders/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
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

    const today = new Date().getDate();
    const upcomingReminders = reminders?.filter((r: any) => {
        const daysUntil = r.dueDay - today;
        return daysUntil >= 0 && daysUntil <= 7 && !r.isPaid;
    }) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
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
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-yellow-900 mb-4">
                            ⚠️ Próximos Pagos (7 días)
                        </h3>
                        <div className="space-y-3">
                            {upcomingReminders.map((reminder: any) => (
                                <div key={reminder.id} className="bg-white rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{reminder.category.icon} {reminder.name}</p>
                                        <p className="text-sm text-gray-600">
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

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : reminders && reminders.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Todos los Recordatorios</h3>
                        <div className="space-y-3">
                            {reminders.map((reminder: any) => (
                                <div key={reminder.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">{reminder.category.icon}</span>
                                                <h4 className="font-semibold text-lg">{reminder.name}</h4>
                                                {reminder.isPaid && (
                                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                                                        ✓ Pagado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600">
                                                ${reminder.amount.toLocaleString()} - Día {reminder.dueDay} de cada mes
                                            </p>
                                            {reminder.lastPaidDate && (
                                                <p className="text-sm text-gray-500 mt-1">
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
                                                onClick={() => deleteMutation.mutate(reminder.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-4">🔔</p>
                        <p className="text-gray-600 mb-4">No tienes recordatorios configurados</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                        >
                            Crear Primer Recordatorio
                        </button>
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Nuevo Recordatorio</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre del Pago
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: Arriendo, Netflix..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monto
                                </label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="50000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Categoría
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Día del Mes (1-31)
                                </label>
                                <input
                                    type="number"
                                    value={formData.dueDay}
                                    onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                                    required
                                    min="1"
                                    max="31"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="15"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
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
