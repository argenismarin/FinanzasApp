'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function DebtsPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState<any>(null);
    const [newDebt, setNewDebt] = useState({
        creditor: '',
        totalAmount: '',
        description: '',
        dueDate: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        setAuthLoading(false);
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const { data: debtsData, isLoading, refetch } = useQuery({
        queryKey: ['debts'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch debts');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create debt');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setShowAddForm(false);
            setNewDebt({ creditor: '', totalAmount: '', description: '', dueDate: '' });
            alert('💳 Deuda registrada exitosamente!');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update debt');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            setEditingDebt(null);
            alert('✏️ Deuda actualizada!');
        },
    });

    const payMutation = useMutation({
        mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${id}/pay`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ amount }),
            });
            if (!response.ok) throw new Error('Failed to register payment');
            return response.json();
        },
        onSuccess: (data) => {
            refetch();
            alert(`💰 ${data.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to delete debt');
            return response.json();
        },
        onSuccess: () => {
            refetch();
            alert('🗑️ Deuda eliminada!');
        },
    });

    const handlePayment = (debt: any) => {
        const amount = prompt(`Monto a pagar (Pendiente: $${debt.pendingAmount.toLocaleString('es-CO')})`);
        if (amount && parseFloat(amount) > 0) {
            payMutation.mutate({ id: debt.id, amount: parseFloat(amount) });
        }
    };

    const formatCOP = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const debts = Array.isArray(debtsData) ? debtsData : [];

    // Separate debts and credits
    const actualDebts = debts.filter((d: any) => !d.isCredit);
    const credits = debts.filter((d: any) => d.isCredit);

    // Only count actual debts in total
    const totalDebt = actualDebts.reduce((sum, debt) => sum + debt.pendingAmount, 0);

    // Group debts by creditor (excluding credits for now, or handle separately)
    const groupedDebts = actualDebts.reduce((acc: any, debt: any) => {
        const creditor = debt.creditor;
        if (!acc[creditor]) {
            acc[creditor] = {
                creditor,
                debts: [],
                totalAmount: 0,
                totalPending: 0
            };
        }
        acc[creditor].debts.push(debt);
        acc[creditor].totalAmount += parseFloat(debt.totalAmount);
        acc[creditor].totalPending += debt.pendingAmount;
        return acc;
    }, {});

    // Group credits by creditor
    const groupedCredits = credits.reduce((acc: any, credit: any) => {
        const creditor = credit.creditor;
        if (!acc[creditor]) {
            acc[creditor] = {
                creditor,
                credits: [],
                totalCredit: 0
            };
        }
        acc[creditor].credits.push(credit);
        acc[creditor].totalCredit += (credit.creditAmount || 0);
        return acc;
    }, {});

    const creditorGroups = Object.values(groupedDebts);
    const creditGroups = Object.values(groupedCredits);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <p className="text-gray-600">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-red-600 hover:text-red-700 flex items-center gap-2"
                    >
                        ← Volver al Dashboard
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">💳 Deudas</h1>
                    <p className="text-gray-600">Gestiona tus deudas y pagos</p>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Total de Deudas</p>
                            <p className="text-2xl font-bold text-red-600">{formatCOP(totalDebt)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Registros de Deuda</p>
                            <p className="text-2xl font-bold text-gray-900">{actualDebts.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Créditos a Favor</p>
                            <p className="text-2xl font-bold text-green-600">{credits.length}</p>
                        </div>
                        <div>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold"
                            >
                                + Nueva Deuda
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva Deuda</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Acreedor (persona o institución)"
                                value={newDebt.creditor}
                                onChange={(e) => setNewDebt({ ...newDebt, creditor: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="number"
                                placeholder="Monto total"
                                value={newDebt.totalAmount}
                                onChange={(e) => setNewDebt({ ...newDebt, totalAmount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Descripción (opcional)"
                                value={newDebt.description}
                                onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                            <input
                                type="date"
                                placeholder="Fecha límite (opcional)"
                                value={newDebt.dueDate}
                                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => createMutation.mutate(newDebt)}
                                    disabled={!newDebt.creditor || !newDebt.totalAmount || createMutation.isPending}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg disabled:opacity-50"
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
                {editingDebt && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">✏️ Editar Deuda</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Acreedor"
                                value={editingDebt.creditor}
                                onChange={(e) => setEditingDebt({ ...editingDebt, creditor: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="number"
                                placeholder="Monto total"
                                value={editingDebt.totalAmount}
                                onChange={(e) => setEditingDebt({ ...editingDebt, totalAmount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Descripción"
                                value={editingDebt.description || ''}
                                onChange={(e) => setEditingDebt({ ...editingDebt, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                            <input
                                type="date"
                                value={editingDebt.dueDate ? new Date(editingDebt.dueDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditingDebt({ ...editingDebt, dueDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateMutation.mutate({
                                        id: editingDebt.id,
                                        data: {
                                            creditor: editingDebt.creditor,
                                            totalAmount: parseFloat(editingDebt.totalAmount),
                                            description: editingDebt.description,
                                            dueDate: editingDebt.dueDate
                                        }
                                    })}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                                >
                                    Actualizar
                                </button>
                                <button
                                    onClick={() => setEditingDebt(null)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Debts List */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Deudas por Acreedor</h2>
                    {debts.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No tienes deudas registradas</p>
                    ) : (
                        <div className="space-y-6">
                            {creditorGroups.map((group: any) => (
                                <div key={group.creditor} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">{group.creditor}</h3>
                                            <p className="text-sm text-gray-600">
                                                {group.debts.length} deuda{group.debts.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Total Pendiente</p>
                                            <p className="text-2xl font-bold text-red-600">
                                                {formatCOP(group.totalPending)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {group.debts.map((debt: any) => (
                                            <div key={debt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        {debt.description && (
                                                            <p className="text-sm font-semibold text-gray-900">{debt.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingDebt({
                                                                ...debt,
                                                                totalAmount: debt.totalAmount.toString()
                                                            })}
                                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('¿Eliminar esta deuda?')) {
                                                                    deleteMutation.mutate(debt.id);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                                                            title="Eliminar"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Total</p>
                                                        <p className="font-semibold">{formatCOP(parseFloat(debt.totalAmount))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Pagado</p>
                                                        <p className="font-semibold text-green-600">{formatCOP(parseFloat(debt.paidAmount))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Pendiente</p>
                                                        <p className="font-bold text-red-600">{formatCOP(debt.pendingAmount)}</p>
                                                    </div>
                                                    <div>
                                                        {debt.dueDate && (
                                                            <>
                                                                <p className="text-gray-600">Vence</p>
                                                                <p className="font-semibold">{new Date(debt.dueDate).toLocaleDateString('es-CO')}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {debt.pendingAmount > 0 && (
                                                    <button
                                                        onClick={() => handlePayment(debt)}
                                                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
                                                    >
                                                        💰 Registrar Pago
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Credits List */}
                {credits.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">💵 Créditos a Tu Favor</h2>
                        <div className="space-y-6">
                            {creditGroups.map((group: any) => (
                                <div key={group.creditor} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">{group.creditor}</h3>
                                            <p className="text-sm text-gray-600">
                                                {group.credits.length} crédito{group.credits.length > 1 ? 's' : ''} a favor
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Te deben</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {formatCOP(group.totalCredit)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {group.credits.map((credit: any) => (
                                            <div key={credit.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        {credit.description && (
                                                            <p className="text-sm font-semibold text-gray-900">{credit.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingDebt({
                                                                ...credit,
                                                                totalAmount: credit.totalAmount.toString()
                                                            })}
                                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('¿Eliminar este crédito?')) {
                                                                    deleteMutation.mutate(credit.id);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                                                            title="Eliminar"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Monto Original</p>
                                                        <p className="font-semibold text-green-600">
                                                            {formatCOP(Math.abs(parseFloat(credit.totalAmount)))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Te Deben</p>
                                                        <p className="font-bold text-green-600">
                                                            {formatCOP(credit.creditAmount || 0)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {credit.dueDate && (
                                                            <>
                                                                <p className="text-gray-600">Fecha</p>
                                                                <p className="font-semibold">
                                                                    {new Date(credit.dueDate).toLocaleDateString('es-CO')}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
