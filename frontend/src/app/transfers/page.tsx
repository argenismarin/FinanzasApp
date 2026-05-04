'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { formatCOP, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QueryStateBoundary } from '@/components/ui/QueryStateBoundary';
import ExportMenu from '@/components/ExportMenu';
import { transferSchema, type TransferFormData } from '@/lib/schemas';

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
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const transferForm = useForm<TransferFormData>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            fromAccountId: '',
            toAccountId: '',
            amount: 0,
            description: '',
            transferDate: getTodayString()
        }
    });
    const fromAccountId = transferForm.watch('fromAccountId');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch accounts
    const accountsQuery = useQuery<Account[]>({
        queryKey: ['transfer-accounts'],
        queryFn: () => api.getAccountsForTransfer(),
        enabled: isAuthenticated
    });
    const accounts = accountsQuery.data;

    // Fetch transfers
    const transfersQuery = useQuery<Transfer[]>({
        queryKey: ['transfers'],
        queryFn: () => api.getTransfers(),
        enabled: isAuthenticated
    });

    // Create transfer mutation
    const createMutation = useMutation({
        mutationFn: (data: any) => api.createTransfer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['transfer-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['savings'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            setShowModal(false);
            transferForm.reset({
                fromAccountId: '',
                toAccountId: '',
                amount: 0,
                description: '',
                transferDate: getTodayString()
            });
            showToast('Transferencia realizada', 'success');
        },
        onError: (error: Error) => showToast(error.message, 'error')
    });

    // Delete transfer mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteTransfer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['transfer-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            showToast('Transferencia revertida', 'success');
        },
        onError: () => showToast('Error al revertir', 'error')
    });

    const handleSubmit = transferForm.handleSubmit((data) => {
        createMutation.mutate({
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            amount: data.amount,
            description: data.description || undefined,
            transferDate: data.transferDate
        });
    });

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            ← Volver al Dashboard
                        </Link>
                        <div className="flex items-center gap-2">
                            <ExportMenu type="transfers" />
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                + Nueva Transferencia
                            </button>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">↔️ Transferencias</h1>
                    <p className="text-gray-600 dark:text-gray-400">Mueve dinero entre tus cuentas</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Accounts Summary */}
                {accounts && accounts.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {accounts.slice(0, 4).map((account) => (
                            <div key={account.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{account.icon}</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{account.name}</span>
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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Transferencia Rápida</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                                    <select
                                        {...transferForm.register('fromAccountId')}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Seleccionar cuenta</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.icon} {account.name} ({formatCOP(account.balance)})
                                            </option>
                                        ))}
                                    </select>
                                    {transferForm.formState.errors.fromAccountId && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transferForm.formState.errors.fromAccountId.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hacia</label>
                                    <select
                                        {...transferForm.register('toAccountId')}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Seleccionar cuenta</option>
                                        {accounts
                                            .filter(a => a.id !== fromAccountId)
                                            .map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.icon} {account.name} ({formatCOP(account.balance)})
                                                </option>
                                            ))}
                                    </select>
                                    {transferForm.formState.errors.toAccountId && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transferForm.formState.errors.toAccountId.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                                    <CurrencyInput
                                        value={transferForm.watch('amount') ?? ''}
                                        onChange={(value) => transferForm.setValue('amount', parseFloat(value) || 0, { shouldValidate: true })}
                                        placeholder="100.000"
                                    />
                                    {transferForm.formState.errors.amount && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transferForm.formState.errors.amount.message}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Transfer History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Historial de Transferencias</h2>
                    </div>

                    <QueryStateBoundary
                        query={transfersQuery}
                        emptyState={
                            <div className="p-12 text-center">
                                <p className="text-6xl mb-4">↔️</p>
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay transferencias</h3>
                                <p className="text-gray-500 dark:text-gray-400">Mueve dinero entre tus cuentas para verlo aquí</p>
                            </div>
                        }
                    >
                        {(transfersList: Transfer[]) => (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {transfersList.map((transfer) => {
                                const fromAcc = getAccountById(transfer.fromAccountId) || transfer.fromAccount;
                                const toAcc = getAccountById(transfer.toAccountId) || transfer.toAccount;

                                return (
                                    <div key={transfer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                                                    <span className="text-2xl">↔️</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 dark:text-white">{fromAcc?.name || 'Cuenta'}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium text-gray-900 dark:text-white">{toAcc?.name || 'Cuenta'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                    {formatCOP(transfer.amount)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setConfirmMessage('¿Revertir esta transferencia?');
                                                        setConfirmAction(() => () => deleteMutation.mutate(transfer.id));
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
                        )}
                    </QueryStateBoundary>
                </div>

                {/* No Accounts Warning */}
                {accounts && accounts.length < 2 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mt-8 text-center">
                        <p className="text-yellow-800 dark:text-yellow-200 mb-4">
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

            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction?.()}
                message={confirmMessage}
                confirmLabel="Revertir"
                variant="danger"
            />
        </div>
    );
}
