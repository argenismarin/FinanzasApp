'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import CurrencyInput from '@/components/CurrencyInput';

export default function SavingsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSaving, setEditingSaving] = useState<any>(null);
    const [withdrawModal, setWithdrawModal] = useState<{ saving: any; amount: string } | null>(null);
    const [newSaving, setNewSaving] = useState({
        name: '',
        amount: '',
        purpose: '',
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: savingsData, isLoading, refetch } = useQuery({
        queryKey: ['savings'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/savings`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch savings');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/savings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create saving');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setShowAddForm(false);
            setNewSaving({ name: '', amount: '', purpose: '' });
            showToast('Ahorro registrado exitosamente', 'success');
        },
        onError: () => {
            showToast('Error al registrar ahorro', 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/savings/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update saving');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setEditingSaving(null);
            showToast('Ahorro actualizado correctamente', 'success');
        },
        onError: () => {
            showToast('Error al actualizar ahorro', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/savings/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to delete saving');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            showToast('Ahorro eliminado correctamente', 'success');
        },
        onError: () => {
            showToast('Error al eliminar ahorro', 'error');
        },
    });

    const withdrawMutation = useMutation({
        mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/savings/${id}/withdraw`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ amount }),
            });
            if (!response.ok) throw new Error('Failed to withdraw');
            return response.json();
        },
        onSuccess: (data) => {
            refetch();
            setWithdrawModal(null);
            showToast(`Retiro exitoso: ${formatCOP(data.withdrawnAmount)}`, 'success');
        },
        onError: () => {
            showToast('Error al realizar retiro', 'error');
        },
    });

    const handleWithdraw = (saving: any) => {
        setWithdrawModal({ saving, amount: '' });
    };

    const submitWithdraw = () => {
        if (!withdrawModal) return;
        const amount = parseFloat(withdrawModal.amount.replace(/\./g, ''));
        if (amount > 0) {
            withdrawMutation.mutate({ id: withdrawModal.saving.id, amount });
        } else {
            showToast('Ingresa un monto válido', 'warning');
        }
    };

    const formatCOP = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const savings = Array.isArray(savingsData) ? savingsData : [];
    const totalSavings = savings.reduce((sum, saving) => sum + parseFloat(saving.amount), 0);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center">
                <p className="text-gray-600">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-green-600 hover:text-green-700 flex items-center gap-2"
                    >
                        ← Volver al Dashboard
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🏦 Ahorros / Cajitas</h1>
                    <p className="text-gray-600">Dinero guardado que NO está disponible para gastar</p>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Total Ahorrado</p>
                            <p className="text-2xl font-bold text-green-600">{formatCOP(totalSavings)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Cajitas / Bolsillos</p>
                            <p className="text-2xl font-bold text-gray-900">{savings.length}</p>
                        </div>
                        <div>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
                            >
                                + Nuevo Ahorro
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo Ahorro</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nombre (ej: Cajita roja, Bolsillo secreto)"
                                value={newSaving.name}
                                onChange={(e) => setNewSaving({ ...newSaving, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="number"
                                placeholder="Monto guardado"
                                value={newSaving.amount}
                                onChange={(e) => setNewSaving({ ...newSaving, amount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Propósito (opcional)"
                                value={newSaving.purpose}
                                onChange={(e) => setNewSaving({ ...newSaving, purpose: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => createMutation.mutate(newSaving)}
                                    disabled={!newSaving.name || !newSaving.amount || createMutation.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg disabled:opacity-50"
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

                {/* Edit Form */}
                {editingSaving && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">✏️ Editar Ahorro</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nombre"
                                value={editingSaving.name}
                                onChange={(e) => setEditingSaving({ ...editingSaving, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="number"
                                placeholder="Monto"
                                value={editingSaving.amount}
                                onChange={(e) => setEditingSaving({ ...editingSaving, amount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Propósito"
                                value={editingSaving.purpose || ''}
                                onChange={(e) => setEditingSaving({ ...editingSaving, purpose: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateMutation.mutate({
                                        id: editingSaving.id,
                                        data: {
                                            name: editingSaving.name,
                                            amount: parseFloat(editingSaving.amount),
                                            purpose: editingSaving.purpose
                                        }
                                    })}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                                >
                                    Actualizar
                                </button>
                                <button
                                    onClick={() => setEditingSaving(null)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Savings List */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Ahorros</h2>
                    {savings.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No tienes ahorros registrados</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savings.map((saving: any) => (
                                <div key={saving.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">💰 {saving.name}</h3>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingSaving({
                                                    ...saving,
                                                    amount: saving.amount.toString()
                                                })}
                                                className="text-blue-600 hover:bg-blue-50 p-1 rounded text-sm"
                                                title="Editar"
                                                aria-label={`Editar ahorro ${saving.name}`}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Eliminar este ahorro?')) {
                                                        deleteMutation.mutate(saving.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:bg-red-50 p-1 rounded text-sm"
                                                title="Eliminar"
                                                aria-label={`Eliminar ahorro ${saving.name}`}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600 mb-2">
                                        {formatCOP(parseFloat(saving.amount))}
                                    </p>
                                    {saving.purpose && (
                                        <p className="text-sm text-gray-600 mb-2">{saving.purpose}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mb-3">
                                        Creado: {new Date(saving.createdAt).toLocaleDateString('es-CO')}
                                    </p>
                                    <button
                                        onClick={() => handleWithdraw(saving)}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-semibold"
                                    >
                                        💸 Sacar a Disponible
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Nota:</strong> El dinero guardado en estas cajitas NO se cuenta como disponible para gastar.
                        Es tu dinero de emergencia o para proyectos específicos.
                    </p>
                </div>

                {/* Withdraw Modal */}
                {withdrawModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" role="dialog" aria-labelledby="withdraw-modal-title">
                            <h3 id="withdraw-modal-title" className="text-lg font-bold text-gray-900 mb-4">
                                💸 Retirar de Ahorro
                            </h3>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Ahorro:</p>
                                <p className="font-semibold text-gray-900">{withdrawModal.saving.name}</p>
                                <p className="text-sm text-gray-600 mt-2">Disponible:</p>
                                <p className="font-bold text-green-600">{formatCOP(parseFloat(withdrawModal.saving.amount))}</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Monto a retirar
                                    </label>
                                    <CurrencyInput
                                        value={withdrawModal.amount}
                                        onChange={(value) => setWithdrawModal({ ...withdrawModal, amount: value })}
                                        placeholder="Ingrese el monto"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={submitWithdraw}
                                        disabled={!withdrawModal.amount || withdrawMutation.isPending}
                                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                                    >
                                        {withdrawMutation.isPending ? 'Procesando...' : 'Confirmar Retiro'}
                                    </button>
                                    <button
                                        onClick={() => setWithdrawModal(null)}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
