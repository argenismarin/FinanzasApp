'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Cuentas Bancarias" emoji="🏦">
                <Button
                    onClick={() => setShowTransferModal(true)}
                    variant="secondary"
                    size="md"
                >
                    <span className="mr-1.5">🔄</span>
                    <span className="hidden sm:inline">Transferir</span>
                </Button>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="primary"
                    size="md"
                >
                    <span className="mr-1.5">+</span>
                    <span className="hidden sm:inline">Nueva Cuenta</span>
                    <span className="sm:hidden">Nueva</span>
                </Button>
            </PageHeader>

            {/* Total Balance */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 text-white">
                <h2 className="text-sm sm:text-base md:text-lg opacity-90 mb-1 sm:mb-2">Balance Total</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold">${totalBalance.toLocaleString()}</p>
                <p className="text-xs sm:text-sm opacity-75 mt-1 sm:mt-2">{accounts?.length || 0} cuenta(s)</p>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : accounts && accounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {accounts.map((account: any) => (
                        <Card key={account.id} padding="md" hover>
                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-2xl sm:text-3xl md:text-4xl">{getAccountIcon(account.type)}</span>
                                    <div>
                                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">{account.name}</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{account.type}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteMutation.mutate(account.id)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                                    aria-label="Eliminar cuenta"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 sm:pt-4">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Balance</p>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                    ${Number(account.balance).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{account.currency}</p>
                            </div>

                            {!account.isActive && (
                                <div className="mt-3 sm:mt-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-center py-2 rounded-lg text-xs sm:text-sm">
                                    Cuenta Inactiva
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-3xl sm:text-4xl mb-4">💳</p>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes cuentas bancarias</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        Crear Primera Cuenta
                    </Button>
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nueva Cuenta Bancaria">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre de la Cuenta
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="Ej: Cuenta Corriente Bancolombia"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Cuenta
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                        >
                            <option value="CHECKING">🏦 Cuenta Corriente</option>
                            <option value="SAVINGS">💰 Cuenta de Ahorros</option>
                            <option value="CREDIT_CARD">💳 Tarjeta de Credito</option>
                            <option value="CASH">💵 Efectivo</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Balance Inicial
                        </label>
                        <input
                            type="number"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                            required
                            min="0"
                            step="1000"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="1000000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Moneda
                        </label>
                        <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                        >
                            <option value="COP">COP - Peso Colombiano</option>
                            <option value="USD">USD - Dolar</option>
                            <option value="EUR">EUR - Euro</option>
                        </select>
                    </div>

                    <ModalFooter>
                        <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creando...' : 'Crear'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Transfer Modal */}
            <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transferir entre Cuentas">
                <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Desde
                        </label>
                        <select
                            value={transferData.fromAccountId}
                            onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Hacia
                        </label>
                        <select
                            value={transferData.toAccountId}
                            onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Monto a Transferir
                        </label>
                        <input
                            type="number"
                            value={transferData.amount}
                            onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                            required
                            min="0"
                            step="1000"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="100000"
                        />
                    </div>

                    <ModalFooter>
                        <Button type="button" variant="secondary" onClick={() => setShowTransferModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={transferMutation.isPending}>
                            {transferMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    );
}
