'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import ExportMenu from '@/components/ExportMenu';
import CurrencyInput from '@/components/CurrencyInput';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';

export default function DebtsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState<any>(null);
    const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<string | null>(null);
    const [paymentModal, setPaymentModal] = useState<{ debt: any; amount: string; description: string } | null>(null);
    const [newDebt, setNewDebt] = useState({
        creditor: '',
        totalAmount: '',
        description: '',
        date: ''
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

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
            setNewDebt({ creditor: '', totalAmount: '', description: '', date: '' });
            showToast('Deuda registrada exitosamente', 'success');
        },
        onError: () => {
            showToast('Error al registrar la deuda', 'error');
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
            showToast('Deuda actualizada correctamente', 'success');
        },
        onError: () => {
            showToast('Error al actualizar la deuda', 'error');
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
            setPaymentModal(null);
            showToast(data.message || 'Pago registrado exitosamente', 'success');
        },
        onError: () => {
            showToast('Error al registrar el pago', 'error');
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
            showToast('Deuda eliminada correctamente', 'success');
        },
        onError: () => {
            showToast('Error al eliminar la deuda', 'error');
        },
    });

    const handlePayment = (debt: any) => {
        setPaymentModal({ debt, amount: '', description: '' });
    };

    const submitPayment = () => {
        if (!paymentModal) return;
        const amount = parseFloat(paymentModal.amount.replace(/\./g, ''));
        if (amount > 0) {
            payMutation.mutate({
                id: paymentModal.debt.id,
                amount,
                description: paymentModal.description
            });
        } else {
            showToast('Ingresa un monto valido', 'warning');
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Deudas" emoji="💳" subtitle="Gestiona tus deudas y pagos">
                <ExportMenu type="debts" />
            </PageHeader>

            {/* Summary Card */}
            <Card padding="md" className="mb-4 sm:mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-red-50 dark:bg-red-900/30 p-3 sm:p-4 rounded-lg border-l-4 border-red-500">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">💳 Total Deudas</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{formatCOP(totalDebt)}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {actualDebts.length} deuda{actualDebts.length !== 1 ? 's' : ''} • {debtCreditors.length} acreedor{debtCreditors.length !== 1 ? 'es' : ''}
                        </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-3 sm:p-4 rounded-lg border-l-4 border-green-500">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">💚 A tu Favor</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCOP(totalAbonos)}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {actualAbonos.length} abono{actualAbonos.length !== 1 ? 's' : ''} • {abonoCreditors.length} persona{abonoCreditors.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">📊 Saldo Neto</p>
                        <p className={`text-lg sm:text-xl md:text-2xl font-bold ${(totalDebt - totalAbonos) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCOP(totalDebt - totalAbonos)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Deudas - Abonos
                        </p>
                    </div>
                    <div className="flex items-center col-span-2 md:col-span-1">
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            variant="danger"
                            fullWidth
                        >
                            + Nueva Deuda
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Add Form */}
            {showAddForm && (
                <Card padding="md" className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Nueva Deuda</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Acreedor (persona o institucion)"
                            value={newDebt.creditor}
                            onChange={(e) => setNewDebt({ ...newDebt, creditor: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto Total</label>
                            <CurrencyInput
                                value={newDebt.totalAmount}
                                onChange={(value) => setNewDebt({ ...newDebt, totalAmount: value })}
                                placeholder="Ingrese el monto"
                            />
                        </div>
                        <textarea
                            placeholder="Descripcion (opcional)"
                            value={newDebt.description}
                            onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={2}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha de la Deuda</label>
                            <input
                                type="date"
                                value={newDebt.date || ''}
                                onChange={(e) => setNewDebt({ ...newDebt, date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fecha en que se origino la deuda (opcional)</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                onClick={() => createMutation.mutate(newDebt)}
                                disabled={!newDebt.creditor || !newDebt.totalAmount || createMutation.isPending}
                                variant="danger"
                                fullWidth
                            >
                                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                            </Button>
                            <Button
                                onClick={() => setShowAddForm(false)}
                                variant="secondary"
                                fullWidth
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Edit Form */}
            {editingDebt && (
                <Card padding="md" className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">✏️ Editar Deuda</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Acreedor"
                            value={editingDebt.creditor}
                            onChange={(e) => setEditingDebt({ ...editingDebt, creditor: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto Total</label>
                            <CurrencyInput
                                value={editingDebt.totalAmount}
                                onChange={(value) => setEditingDebt({ ...editingDebt, totalAmount: value })}
                                placeholder="Ingrese el monto"
                            />
                        </div>
                        <textarea
                            placeholder="Descripcion"
                            value={editingDebt.description || ''}
                            onChange={(e) => setEditingDebt({ ...editingDebt, description: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={2}
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                onClick={() => updateMutation.mutate({
                                    id: editingDebt.id,
                                    data: {
                                        creditor: editingDebt.creditor,
                                        totalAmount: parseFloat(editingDebt.totalAmount),
                                        description: editingDebt.description
                                    }
                                })}
                                fullWidth
                            >
                                Actualizar
                            </Button>
                            <Button
                                onClick={() => setEditingDebt(null)}
                                variant="secondary"
                                fullWidth
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Debts List */}
            {actualDebts.length > 0 && (
                <Card padding="md" className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">💳 Deudas Pendientes</h2>
                        <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold self-start sm:self-auto">
                            {actualDebts.length} deuda{actualDebts.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                        {creditorGroups.filter((g: any) => g.netPending > 0).map((group: any) => (
                            <div key={group.creditor} className="border-2 border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 bg-red-50 dark:bg-red-900/20">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                    <div>
                                        <h3 className="font-bold text-base sm:text-lg md:text-xl text-gray-900 dark:text-white">{group.creditor}</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            {group.debts.length} deuda{group.debts.length > 1 ? 's' : ''}
                                            {group.abonos.length > 0 && ` • ${group.abonos.length} abono${group.abonos.length > 1 ? 's' : ''}`}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Saldo Neto</p>
                                        <p className={`text-lg sm:text-xl md:text-2xl font-bold ${group.netPending >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {formatCOP(Math.abs(group.netPending))}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {group.debts.map((debt: any) => (
                                        <div key={debt.id} className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-3 sm:p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-lg sm:text-xl">💳</span>
                                                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                                            {debt.description || `Deuda con ${debt.creditor}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setEditingDebt({
                                                            ...debt,
                                                            totalAmount: debt.totalAmount.toString()
                                                        })}
                                                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 sm:p-2 rounded"
                                                        aria-label={`Editar deuda con ${debt.creditor}`}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('¿Eliminar esta deuda?')) {
                                                                deleteMutation.mutate(debt.id);
                                                            }
                                                        }}
                                                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 sm:p-2 rounded"
                                                        aria-label={`Eliminar deuda con ${debt.creditor}`}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Fecha */}
                                            <div className="flex flex-wrap gap-2 mb-3 text-[10px] sm:text-xs">
                                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 rounded-full">
                                                    <span>📅</span>
                                                    <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {new Date(debt.createdAt).toLocaleDateString('es-CO', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">Total</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{formatCOP(parseFloat(debt.totalAmount))}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">Pagado</p>
                                                    <p className="font-semibold text-green-600 dark:text-green-400">{formatCOP(parseFloat(debt.paidAmount))}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">Pendiente</p>
                                                    <p className="font-bold text-red-600 dark:text-red-400">{formatCOP(debt.pendingAmount)}</p>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            {debt.payments && debt.payments.length > 0 && (
                                                <div className="mt-3">
                                                    <button
                                                        onClick={() => setExpandedPaymentHistory(
                                                            expandedPaymentHistory === debt.id ? null : debt.id
                                                        )}
                                                        className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                                                    >
                                                        {expandedPaymentHistory === debt.id ? '▼' : '▶'}
                                                        Historial de pagos ({debt.payments.length})
                                                    </button>
                                                    {expandedPaymentHistory === debt.id && (
                                                        <div className="mt-2 space-y-2 bg-blue-50 dark:bg-blue-900/30 p-2 sm:p-3 rounded border border-blue-200 dark:border-blue-700">
                                                            {debt.payments.map((payment: any) => (
                                                                <div key={payment.id} className="flex justify-between items-start text-xs sm:text-sm border-b border-blue-100 dark:border-blue-800 pb-2 last:border-b-0">
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                                            💵 {formatCOP(parseFloat(payment.amount))}
                                                                        </p>
                                                                        {payment.description && (
                                                                            <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs">{payment.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">
                                                                        {new Date(payment.paymentDate).toLocaleDateString('es-CO', {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {debt.pendingAmount > 0 && (
                                                <Button
                                                    onClick={() => handlePayment(debt)}
                                                    variant="primary"
                                                    fullWidth
                                                    className="mt-3 !bg-green-600 hover:!bg-green-700"
                                                >
                                                    💰 Registrar Pago
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {debts.length === 0 && (
                <Card padding="lg" className="text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-4">💳</div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">No tienes deudas ni abonos registrados</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">Comienza agregando una nueva deuda o abono a favor</p>
                    <Button onClick={() => setShowAddForm(true)} variant="danger">
                        + Agregar Primera Deuda
                    </Button>
                </Card>
            )}

            {/* Abonos a tu Favor */}
            {actualAbonos.length > 0 ? (
                <Card padding="md" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl sm:text-3xl md:text-4xl">💚</div>
                            <div>
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-800 dark:text-green-200">Saldos a tu Favor</h2>
                                <p className="text-green-700 dark:text-green-300 text-xs sm:text-sm">
                                    Tienes {actualAbonos.length} saldo{actualAbonos.length !== 1 ? 's' : ''} a tu favor
                                </p>
                            </div>
                        </div>
                        <span className="bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold self-start sm:self-auto">
                            {actualAbonos.length} registro{actualAbonos.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {actualAbonos.map((abono: any) => (
                            <div key={abono.id} className="bg-white dark:bg-gray-800 border-2 border-green-400 dark:border-green-600 rounded-lg p-3 sm:p-4 md:p-5 shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-2 mb-2">
                                            <span className="text-xl sm:text-2xl">💚</span>
                                            <div className="flex-1">
                                                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                                    {abono.creditor}
                                                </p>
                                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">
                                                    {abono.description || 'Saldo a tu favor'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setEditingDebt({
                                                ...abono,
                                                totalAmount: abono.totalAmount.toString()
                                            })}
                                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 sm:p-2 rounded"
                                            aria-label={`Editar abono de ${abono.creditor}`}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Eliminar este abono?')) {
                                                    deleteMutation.mutate(abono.id);
                                                }
                                            }}
                                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 sm:p-2 rounded"
                                            aria-label={`Eliminar abono de ${abono.creditor}`}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Fecha */}
                                <div className="flex flex-wrap gap-2 mb-3 text-[10px] sm:text-xs">
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 rounded-full">
                                        <span>📅</span>
                                        <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {new Date(abono.createdAt).toLocaleDateString('es-CO', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                                    <div>
                                        <p className="text-gray-600 dark:text-gray-400">Total</p>
                                        <p className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 dark:text-white">{formatCOP(parseFloat(abono.totalAmount))}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 dark:text-gray-400">Cobrado</p>
                                        <p className="font-semibold text-green-600 dark:text-green-400 text-sm sm:text-base md:text-lg">{formatCOP(parseFloat(abono.paidAmount))}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 dark:text-gray-400">Te deben</p>
                                        <p className="font-bold text-green-600 dark:text-green-400 text-base sm:text-lg md:text-xl">{formatCOP(Math.abs(abono.pendingAmount))}</p>
                                    </div>
                                </div>

                                {/* Historial de cobros */}
                                {abono.payments && abono.payments.length > 0 && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setExpandedPaymentHistory(
                                                expandedPaymentHistory === abono.id ? null : abono.id
                                            )}
                                            className="text-xs sm:text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1 font-semibold"
                                        >
                                            {expandedPaymentHistory === abono.id ? '▼' : '▶'}
                                            Historial de cobros ({abono.payments.length})
                                        </button>
                                        {expandedPaymentHistory === abono.id && (
                                            <div className="mt-2 space-y-2 bg-green-50 dark:bg-green-900/30 p-2 sm:p-3 rounded border border-green-200 dark:border-green-700">
                                                {abono.payments.map((payment: any) => (
                                                    <div key={payment.id} className="flex justify-between items-start text-xs sm:text-sm border-b border-green-100 dark:border-green-800 pb-2 last:border-b-0">
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                                💵 {formatCOP(parseFloat(payment.amount))}
                                                            </p>
                                                            {payment.description && (
                                                                <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs">{payment.description}</p>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">
                                                            {new Date(payment.paymentDate).toLocaleDateString('es-CO', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
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
                </Card>
            ) : debts.length > 0 && (
                <Card padding="md" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-4">💚</div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Sin Saldos a tu Favor</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                        Los "Saldos a tu Favor" aparecen cuando alguien te debe dinero.
                    </p>
                </Card>
            )}

            {/* Payment Modal */}
            <Modal
                isOpen={!!paymentModal}
                onClose={() => setPaymentModal(null)}
                title="💰 Registrar Pago"
            >
                {paymentModal && (
                    <>
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Acreedor:</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{paymentModal.debt.creditor}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">Pendiente:</p>
                            <p className="font-bold text-red-600 dark:text-red-400">{formatCOP(paymentModal.debt.pendingAmount)}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Monto a pagar
                                </label>
                                <CurrencyInput
                                    value={paymentModal.amount}
                                    onChange={(value) => setPaymentModal({ ...paymentModal, amount: value })}
                                    placeholder="Ingrese el monto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Descripcion (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={paymentModal.description}
                                    onChange={(e) => setPaymentModal({ ...paymentModal, description: e.target.value })}
                                    placeholder="Ej: Pago parcial, Abono mensual..."
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                />
                            </div>
                            <ModalFooter>
                                <Button
                                    onClick={() => setPaymentModal(null)}
                                    variant="secondary"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={submitPayment}
                                    disabled={!paymentModal.amount || payMutation.isPending}
                                    className="!bg-green-600 hover:!bg-green-700"
                                >
                                    {payMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
                                </Button>
                            </ModalFooter>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
