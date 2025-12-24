'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

export default function GoalsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        deadline: ''
    });

    const { data: goals, isLoading } = useQuery({
        queryKey: ['goals'],
        queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/goals`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json()),
        enabled: isAuthenticated
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/goals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setShowModal(false);
            setFormData({ name: '', targetAmount: '', deadline: '' });
        }
    });

    const contributeMutation = useMutation({
        mutationFn: ({ id, amount }: { id: string; amount: string }) =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/goals/${id}/contribute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ amount })
            }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setShowContributeModal(false);
            setContributeAmount('');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/goals/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
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

    const handleContribute = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedGoal) {
            contributeMutation.mutate({ id: selectedGoal.id, amount: contributeAmount });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
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
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : goals && goals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goals.map((goal: any) => (
                            <div key={goal.id} className="bg-white rounded-2xl shadow-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                            {goal.isCompleted ? '✅' : '🎯'} {goal.name}
                                        </h3>
                                        {goal.deadline && (
                                            <p className="text-sm text-gray-500">
                                                📅 {new Date(goal.deadline).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(goal.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Progreso</span>
                                        <span className="font-semibold">
                                            ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all"
                                            style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{goal.percentage.toFixed(1)}%</span>
                                        <span className="text-blue-600">
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
                                    <div className="bg-green-50 text-green-700 text-center py-2 rounded-lg font-semibold">
                                        🎉 ¡Meta Completada!
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-4">🎯</p>
                        <p className="text-gray-600 mb-4">No tienes metas de ahorro</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                        >
                            Crear Primera Meta
                        </button>
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Nueva Meta de Ahorro</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de la Meta
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: Vacaciones, Auto nuevo..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monto Objetivo
                                </label>
                                <input
                                    type="number"
                                    value={formData.targetAmount}
                                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                    required
                                    min="0"
                                    step="10000"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="5000000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha Límite (Opcional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

            {/* Contribute Modal */}
            {showContributeModal && selectedGoal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-2">Agregar Dinero</h2>
                        <p className="text-gray-600 mb-6">{selectedGoal.name}</p>
                        <form onSubmit={handleContribute} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monto a Agregar
                                </label>
                                <input
                                    type="number"
                                    value={contributeAmount}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="50000"
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg text-sm">
                                <p className="text-gray-700">
                                    Actual: <span className="font-semibold">${selectedGoal.currentAmount.toLocaleString()}</span>
                                </p>
                                <p className="text-gray-700">
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
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
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
        </div>
    );
}
