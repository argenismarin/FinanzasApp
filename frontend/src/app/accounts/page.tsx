'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

export default function AccountsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'CHECKING',
        balance: '',
        currency: 'COP'
    });
    const [transferData, setTransferData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: ''
    });

    const { data: accounts, isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json()),
        enabled: isAuthenticated
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            setShowCreateModal(false);
            setFormData({ name: '', type: 'CHECKING', balance: '', currency: 'COP' });
        }
    });

    const transferMutation = useMutation({
        mutationFn: (data: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            setShowTransferModal(false);
            setTransferData({ fromAccountId: '', toAccountId: '', amount: '' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
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

    const handleTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        transferMutation.mutate(transferData);
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'CHECKING': return '🏦';
            case 'SAVINGS': return '💰';
            case 'CREDIT_CARD': return '💳';
            case 'CASH': return '💵';
            default: return '🏦';
        }
    };

    const totalBalance = accounts?.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                        ← Cuentas Bancarias
                    </Link>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                            🔄 Transferir
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                            + Nueva Cuenta
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Total Balance */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <h2 className="text-lg opacity-90 mb-2">Balance Total</h2>
                    <p className="text-4xl font-bold">${totalBalance.toLocaleString()}</p>
                    <p className="text-sm opacity-75 mt-2">{accounts?.length || 0} cuenta(s)</p>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : accounts && accounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map((account: any) => (
                            <div key={account.id} className="bg-white rounded-2xl shadow-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{getAccountIcon(account.type)}</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{account.name}</h3>
                                            <p className="text-sm text-gray-500">{account.type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(account.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-sm text-gray-600 mb-1">Balance</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        ${Number(account.balance).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{account.currency}</p>
                                </div>

                                {!account.isActive && (
                                    <div className="mt-4 bg-gray-100 text-gray-600 text-center py-2 rounded-lg text-sm">
                                        Cuenta Inactiva
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-4">💳</p>
                        <p className="text-gray-600 mb-4">No tienes cuentas bancarias</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                        >
                            Crear Primera Cuenta
                        </button>
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Nueva Cuenta Bancaria</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de la Cuenta
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: Cuenta Corriente Bancolombia"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Cuenta
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="CHECKING">🏦 Cuenta Corriente</option>
                                    <option value="SAVINGS">💰 Cuenta de Ahorros</option>
                                    <option value="CREDIT_CARD">💳 Tarjeta de Crédito</option>
                                    <option value="CASH">💵 Efectivo</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Balance Inicial
                                </label>
                                <input
                                    type="number"
                                    value={formData.balance}
                                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="1000000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Moneda
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="COP">COP - Peso Colombiano</option>
                                    <option value="USD">USD - Dólar</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
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

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Transferir entre Cuentas</h2>
                        <form onSubmit={handleTransfer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Desde
                                </label>
                                <select
                                    value={transferData.fromAccountId}
                                    onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Seleccionar cuenta origen</option>
                                    {accounts?.map((acc: any) => (
                                        <option key={acc.id} value={acc.id}>
                                            {getAccountIcon(acc.type)} {acc.name} (${Number(acc.balance).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hacia
                                </label>
                                <select
                                    value={transferData.toAccountId}
                                    onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Seleccionar cuenta destino</option>
                                    {accounts?.filter((acc: any) => acc.id !== transferData.fromAccountId).map((acc: any) => (
                                        <option key={acc.id} value={acc.id}>
                                            {getAccountIcon(acc.type)} {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monto a Transferir
                                </label>
                                <input
                                    type="number"
                                    value={transferData.amount}
                                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                    required
                                    min="0"
                                    step="1000"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="100000"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={transferMutation.isPending}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                                >
                                    {transferMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
