'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';
import { formatCOP, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Account {
    id: string;
    name: string;
    type: 'bank' | 'saving';
    balance: number;
    icon: string;
}

interface Transfer {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    transferDate: string;
    fromAccount?: { name: string };
    toAccount?: { name: string };
}

export default function TransfersPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        description: '',
        transferDate: getTodayString()
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch accounts
    const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
        queryKey: ['transfer-accounts'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/transfers/accounts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    // Fetch transfers
    const { data: transfers, isLoading: transfersLoading } = useQuery<Transfer[]>({
        queryKey: ['transfers'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/transfers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        enabled: isAuthenticated
    });

    // Create transfer mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${API_URL}/transfers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['transfer-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['savings'] });
            setShowModal(false);
            setFormData({
                fromAccountId: '',
                toAccountId: '',
                amount: '',
                description: '',
                transferDate: getTodayString()
            });
            showToast('Transferencia realizada', 'success');
        },
        onError: (error: Error) => showToast(error.message, 'error')
    });

    // Delete transfer mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_URL}/transfers/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['transfer-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            showToast('Transferencia revertida', 'success');
        },
        onError: () => showToast('Error al revertir', 'error')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.fromAccountId === formData.toAccountId) {
            showToast('Las cuentas deben ser diferentes', 'error');
            return;
        }
        createMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount.replace(/\./g, ''))
        });
    };

    const getAccountById = (id: string) => {
        return accounts?.find(a => a.id === id);
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
                            + Nueva Transferencia
                        </button>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mt-4">↔️ Transferencias</h1>
                    <p className="text-gray-600">Mueve dinero entre tus cuentas</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Accounts Summary */}
                {accounts && accounts.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {accounts.slice(0, 4).map((account) => (
                            <div key={account.id} className="bg-white rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{account.icon}</span>
                                    <span className="font-medium text-gray-700 truncate">{account.name}</span>
                                </div>
                                <p className={`text-xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCOP(account.balance)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Transfer */}
                {accounts && accounts.length >= 2 && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Transferencia Rápida</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                                    <select
                                        value={formData.fromAccountId}
                                        onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar cuenta</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.icon} {account.name} ({formatCOP(account.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hacia</label>
                                    <select
                                        value={formData.toAccountId}
                                        onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar cuenta</option>
                                        {accounts
                                            .filter(a => a.id !== formData.fromAccountId)
                                            .map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.icon} {account.name} ({formatCOP(account.balance)})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                    <CurrencyInput
                                        value={formData.amount}
                                        onChange={(value) => setFormData({ ...formData, amount: value })}
                                        placeholder="100.000"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || !formData.fromAccountId || !formData.toAccountId || !formData.amount}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Transfer History */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-900">Historial de Transferencias</h2>
                    </div>

                    {transfersLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : transfers && transfers.length > 0 ? (
                        <div className="divide-y">
                            {transfers.map((transfer) => {
                                const fromAcc = getAccountById(transfer.fromAccountId) || transfer.fromAccount;
                                const toAcc = getAccountById(transfer.toAccountId) || transfer.toAccount;

                                return (
                                    <div key={transfer.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-100 p-3 rounded-full">
                                                    <span className="text-2xl">↔️</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{fromAcc?.name || 'Cuenta'}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium">{toAcc?.name || 'Cuenta'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(transfer.transferDate).toLocaleDateString('es-CO', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                        {transfer.description && ` • ${transfer.description}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl font-bold text-blue-600">
                                                    {formatCOP(transfer.amount)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('¿Revertir esta transferencia?')) {
                                                            deleteMutation.mutate(transfer.id);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 transition"
                                                    aria-label="Revertir transferencia"
                                                >
                                                    ↩️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <p className="text-6xl mb-4">↔️</p>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay transferencias</h3>
                            <p className="text-gray-500">Mueve dinero entre tus cuentas para verlo aquí</p>
                        </div>
                    )}
                </div>

                {/* No Accounts Warning */}
                {accounts && accounts.length < 2 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mt-8 text-center">
                        <p className="text-yellow-800 mb-4">
                            Necesitas al menos 2 cuentas para hacer transferencias
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="/accounts"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                + Crear Cuenta Bancaria
                            </Link>
                            <Link
                                href="/savings"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                + Crear Cajita de Ahorro
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
