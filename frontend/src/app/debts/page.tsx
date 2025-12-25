'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import ExportMenu from '@/components/ExportMenu';
import CurrencyInput from '@/components/CurrencyInput';

export default function DebtsPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState<any>(null);
    const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<string | null>(null);
    const [newDebt, setNewDebt] = useState({
        creditor: '',
        totalAmount: '',
        description: ''
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
            setNewDebt({ creditor: '', totalAmount: '', description: '' });
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
        mutationFn: async ({ id, amount, description }: { id: string; amount: number; description?: string }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${id}/pay`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ amount, description }),
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
            const description = prompt(`Descripción del pago (opcional):`) || '';
            payMutation.mutate({ 
                id: debt.id, 
                amount: parseFloat(amount),
                description: description 
            });
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

    // Group by creditor and separate debts from abonos
    const groupedDebts = debts.reduce((acc: any, debt: any) => {
        const creditor = debt.creditor;
        if (!acc[creditor]) {
            acc[creditor] = {
                creditor,
                debts: [],
                abonos: [],
                totalDebt: 0,
                totalAbonos: 0,
                netPending: 0
            };
        }

        // Separate by positive (debts) vs negative (abonos)
        if (debt.pendingAmount >= 0) {
            acc[creditor].debts.push(debt);
            acc[creditor].totalDebt += debt.pendingAmount;
        } else {
            acc[creditor].abonos.push(debt);
            acc[creditor].totalAbonos += Math.abs(debt.pendingAmount);
        }

        acc[creditor].netPending += debt.pendingAmount;
        return acc;
    }, {});

    const creditorGroups = Object.values(groupedDebts);

    // Separate stats for debts and abonos
    const actualDebts = debts.filter(d => d.pendingAmount > 0);
    const actualAbonos = debts.filter(d => d.pendingAmount < 0);
    
    // Count unique creditors for debts and abonos
    const debtCreditors = creditorGroups.filter((g: any) => g.netPending > 0);
    const abonoCreditors = creditorGroups.filter((g: any) => g.netPending < 0);
    
    // Total debt (only positive pending amounts)
    const totalDebt = actualDebts.reduce((sum: number, debt: any) => {
        return sum + debt.pendingAmount;
    }, 0);
    
    // Total abonos (only negative pending amounts, shown as positive)
    const totalAbonos = Math.abs(actualAbonos.reduce((sum: number, debt: any) => {
        return sum + debt.pendingAmount;
    }, 0));

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
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-red-600 hover:text-red-700 flex items-center gap-2"
                        >
                            ← Volver al Dashboard
                        </button>
                        <ExportMenu type="debts" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">💳 Deudas</h1>
                    <p className="text-gray-600">Gestiona tus deudas y pagos</p>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                            <p className="text-sm text-gray-600">💳 Total Deudas</p>
                            <p className="text-2xl font-bold text-red-600">{formatCOP(totalDebt)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {actualDebts.length} deuda{actualDebts.length !== 1 ? 's' : ''} • {debtCreditors.length} acreedor{debtCreditors.length !== 1 ? 'es' : ''}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                            <p className="text-sm text-gray-600">💚 A tu Favor</p>
                            <p className="text-2xl font-bold text-green-600">{formatCOP(totalAbonos)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {actualAbonos.length} abono{actualAbonos.length !== 1 ? 's' : ''} • {abonoCreditors.length} persona{abonoCreditors.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <p className="text-sm text-gray-600">📊 Saldo Neto</p>
                            <p className={`text-2xl font-bold ${(totalDebt - totalAbonos) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCOP(totalDebt - totalAbonos)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Deudas - Abonos
                            </p>
                        </div>
                        <div className="flex items-center">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Monto Total</label>
                                <CurrencyInput
                                    value={newDebt.totalAmount}
                                    onChange={(value) => setNewDebt({ ...newDebt, totalAmount: value })}
                                    placeholder="Ingrese el monto"
                                />
                            </div>
                            <textarea
                                placeholder="Descripción (opcional)"
                                value={newDebt.description}
                                onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                rows={2}
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateMutation.mutate({
                                        id: editingDebt.id,
                                        data: {
                                            creditor: editingDebt.creditor,
                                            totalAmount: parseFloat(editingDebt.totalAmount),
                                            description: editingDebt.description
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
                {actualDebts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">💳 Deudas Pendientes</h2>
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {actualDebts.length} deuda{actualDebts.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {actualDebts.length > 0 && (
                        <div className="space-y-6">
                            {creditorGroups.filter((g: any) => g.netPending > 0).map((group: any) => (
                                <div key={group.creditor} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">{group.creditor}</h3>
                                            <p className="text-sm text-gray-600">
                                                {group.debts.length} deuda{group.debts.length > 1 ? 's' : ''}
                                                {group.abonos.length > 0 && ` • ${group.abonos.length} abono${group.abonos.length > 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Saldo Neto</p>
                                            <p className={`text-2xl font-bold ${group.netPending >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCOP(Math.abs(group.netPending))}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Sección de Deudas */}
                                        {group.debts.length > 0 && (
                                            <div className="space-y-3">
                                                {group.debts.map((debt: any) => (
                                                    <div key={debt.id} className="bg-white border border-red-200 rounded-lg p-4">
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
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                                                </div>
                                                
                                                {/* Payment History */}
                                                {debt.payments && debt.payments.length > 0 && (
                                                    <div className="mt-3">
                                                        <button
                                                            onClick={() => setExpandedPaymentHistory(
                                                                expandedPaymentHistory === debt.id ? null : debt.id
                                                            )}
                                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                        >
                                                            {expandedPaymentHistory === debt.id ? '▼' : '▶'} 
                                                            Historial de pagos ({debt.payments.length})
                                                        </button>
                                                        {expandedPaymentHistory === debt.id && (
                                                            <div className="mt-2 space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
                                                                {debt.payments.map((payment: any) => (
                                                                    <div key={payment.id} className="flex justify-between items-start text-sm border-b border-blue-100 pb-2 last:border-b-0">
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900">
                                                                                💵 {formatCOP(parseFloat(payment.amount))}
                                                                            </p>
                                                                            {payment.description && (
                                                                                <p className="text-gray-600 text-xs">{payment.description}</p>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-gray-500 text-xs">
                                                                            {new Date(payment.paymentDate).toLocaleDateString('es-CO', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
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
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Empty State */}
                {debts.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <div className="text-6xl mb-4">💳</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes deudas ni abonos registrados</h3>
                        <p className="text-gray-600 mb-6">Comienza agregando una nueva deuda o abono a favor</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            + Agregar Primera Deuda
                        </button>
                    </div>
                )}

                {/* Abonos a tu Favor - Sección separada en verde */}
                {actualAbonos.length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-6 border-2 border-green-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="text-4xl">💚</div>
                                <div>
                                    <h2 className="text-2xl font-bold text-green-800">Saldos a tu Favor</h2>
                                    <p className="text-green-700 text-sm">Estos acreedores te deben dinero</p>
                                </div>
                            </div>
                            <span className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                                {actualAbonos.length} abono{actualAbonos.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="space-y-6">
                            {creditorGroups.filter((g: any) => g.netPending < 0).map((group: any) => (
                                <div key={group.creditor} className="bg-white border-2 border-green-400 rounded-lg p-5 shadow-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">{group.creditor}</h3>
                                            <p className="text-sm text-green-700 font-semibold">
                                                ✅ Te debe {formatCOP(Math.abs(group.netPending))}
                                            </p>
                                        </div>
                                        <div className="text-right bg-green-100 px-4 py-2 rounded-lg">
                                            <p className="text-sm text-green-700 font-semibold">A tu favor</p>
                                            <p className="text-3xl font-bold text-green-600">
                                                {formatCOP(Math.abs(group.netPending))}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {group.abonos.map((abono: any) => (
                                            <div key={abono.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        {abono.description && (
                                                            <p className="text-sm font-semibold text-gray-900">{abono.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingDebt({
                                                                ...abono,
                                                                totalAmount: abono.totalAmount.toString()
                                                            })}
                                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('¿Eliminar este abono?')) {
                                                                    deleteMutation.mutate(abono.id);
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
                                                        <p className="text-gray-600">Total Original</p>
                                                        <p className="font-semibold">{formatCOP(parseFloat(abono.totalAmount))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Ya pagaron</p>
                                                        <p className="font-semibold text-green-600">{formatCOP(parseFloat(abono.paidAmount))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Aún te deben</p>
                                                        <p className="font-bold text-green-600 text-lg">{formatCOP(Math.abs(abono.pendingAmount))}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Payment History para abonos */}
                                                {abono.payments && abono.payments.length > 0 && (
                                                    <div className="mt-3">
                                                        <button
                                                            onClick={() => setExpandedPaymentHistory(
                                                                expandedPaymentHistory === abono.id ? null : abono.id
                                                            )}
                                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                        >
                                                            {expandedPaymentHistory === abono.id ? '▼' : '▶'} 
                                                            Historial de cobros ({abono.payments.length})
                                                        </button>
                                                        {expandedPaymentHistory === abono.id && (
                                                            <div className="mt-2 space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
                                                                {abono.payments.map((payment: any) => (
                                                                    <div key={payment.id} className="flex justify-between items-start text-sm border-b border-blue-100 pb-2 last:border-b-0">
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900">
                                                                                💵 {formatCOP(parseFloat(payment.amount))}
                                                                            </p>
                                                                            {payment.description && (
                                                                                <p className="text-gray-600 text-xs">{payment.description}</p>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-gray-500 text-xs">
                                                                            {new Date(payment.paymentDate).toLocaleDateString('es-CO', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
