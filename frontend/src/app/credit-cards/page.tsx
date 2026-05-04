'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { formatCOP, getTodayString } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QueryStateBoundary } from '@/components/ui/QueryStateBoundary';
import ExportMenu from '@/components/ExportMenu';

interface CreditCard {
    id: string;
    name: string;
    lastFourDigits: string | null;
    brand: string;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
    cutOffDay: number;
    paymentDueDay: number;
    minimumPayment: number | null;
    interestRate: number | null;
    color: string;
    usagePercentage: number;
    transactions: CreditCardTransaction[];
    payments: CreditCardPayment[];
}

interface CreditCardTransaction {
    id: string;
    amount: number;
    description: string;
    merchant: string | null;
    installments: number;
    currentInstallment: number;
    transactionDate: string;
    isPending: boolean;
}

interface CreditCardPayment {
    id: string;
    amount: number;
    paymentType: string;
    paymentDate: string;
}

interface CardsSummary {
    totalCards: number;
    totalLimit: number;
    totalBalance: number;
    totalAvailable: number;
    usagePercentage: number;
    upcomingPayments: {
        cardId: string;
        cardName: string;
        balance: number;
        dueDate: string;
        daysUntilDue: number;
        isOverdue: boolean;
        isUrgent: boolean;
    }[];
}

const CARD_BRANDS = [
    { value: 'VISA', label: 'Visa', icon: '💳' },
    { value: 'MASTERCARD', label: 'Mastercard', icon: '💳' },
    { value: 'AMERICAN_EXPRESS', label: 'American Express', icon: '💳' },
    { value: 'DINERS', label: 'Diners Club', icon: '💳' },
    { value: 'OTHER', label: 'Otra', icon: '💳' },
];

const CARD_COLORS = [
    '#1e40af', // Azul
    '#dc2626', // Rojo
    '#16a34a', // Verde
    '#7c3aed', // Púrpura
    '#ea580c', // Naranja
    '#0891b2', // Cyan
    '#be185d', // Rosa
    '#854d0e', // Marrón
    '#1f2937', // Gris oscuro
    '#fbbf24', // Dorado
];

export default function CreditCardsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [showNewCardModal, setShowNewCardModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<{
        cardId: string;
        transactionId: string;
        amount: string;
        description: string;
        merchant: string;
        installments: string;
        transactionDate: string;
    } | null>(null);

    const [newCard, setNewCard] = useState({
        name: '',
        lastFourDigits: '',
        brand: 'VISA',
        creditLimit: '',
        cutOffDay: '15',
        paymentDueDay: '5',
        interestRate: '',
        color: '#1e40af'
    });

    const [newTransaction, setNewTransaction] = useState({
        amount: '',
        description: '',
        merchant: '',
        installments: '1',
        transactionDate: getTodayString()
    });

    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentType: 'PARTIAL',
        paymentDate: getTodayString(),
        description: '',
        fromAccountId: ''
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch credit cards
    const cardsQuery = useQuery<CreditCard[]>({
        queryKey: ['credit-cards'],
        queryFn: () => api.getCreditCards(),
        enabled: isAuthenticated
    });
    const cards = cardsQuery.data;

    // Fetch bank accounts for payment source
    const { data: accounts } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: () => api.getAccounts(),
        enabled: isAuthenticated
    });

    // Fetch summary
    const { data: summary } = useQuery<CardsSummary>({
        queryKey: ['credit-cards-summary'],
        queryFn: () => api.getCreditCardsSummary(),
        enabled: isAuthenticated
    });

    // Create card mutation
    const createCardMutation = useMutation({
        mutationFn: (data: any) => api.createCreditCard(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowNewCardModal(false);
            setNewCard({
                name: '', lastFourDigits: '', brand: 'VISA', creditLimit: '',
                cutOffDay: '15', paymentDueDay: '5', interestRate: '', color: '#1e40af'
            });
            showToast('Tarjeta creada exitosamente', 'success');
        },
        onError: () => showToast('Error al crear la tarjeta', 'error')
    });

    // Add transaction mutation
    const addTransactionMutation = useMutation({
        mutationFn: ({ cardId, data }: { cardId: string; data: any }) => api.addCreditCardTransaction(cardId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowTransactionModal(false);
            setSelectedCard(null);
            setNewTransaction({
                amount: '', description: '', merchant: '', installments: '1',
                transactionDate: getTodayString()
            });
            showToast('Gasto registrado exitosamente', 'success');
        },
        onError: () => showToast('Error al registrar el gasto', 'error')
    });

    // Add payment mutation
    const addPaymentMutation = useMutation({
        mutationFn: ({ cardId, data }: { cardId: string; data: any }) => api.addCreditCardPayment(cardId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
            setShowPaymentModal(false);
            setSelectedCard(null);
            setNewPayment({
                amount: '', paymentType: 'PARTIAL',
                paymentDate: getTodayString(), description: '',
                fromAccountId: ''
            });
            showToast('Pago registrado exitosamente', 'success');
        },
        onError: () => showToast('Error al registrar el pago', 'error')
    });

    // Update CC transaction mutation
    const updateTransactionMutation = useMutation({
        mutationFn: ({ cardId, transactionId, data }: { cardId: string; transactionId: string; data: any }) =>
            api.updateCreditCardTransaction(cardId, transactionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setEditingTransaction(null);
            showToast('Gasto actualizado exitosamente', 'success');
        },
        onError: () => showToast('Error al actualizar el gasto', 'error')
    });

    // Delete CC transaction mutation
    const deleteTransactionMutation = useMutation({
        mutationFn: ({ cardId, transactionId }: { cardId: string; transactionId: string }) =>
            api.deleteCreditCardTransaction(cardId, transactionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            showToast('Gasto eliminado exitosamente', 'success');
        },
        onError: () => showToast('Error al eliminar el gasto', 'error')
    });

    // Delete card mutation
    const deleteCardMutation = useMutation({
        mutationFn: (cardId: string) => api.deleteCreditCard(cardId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            queryClient.invalidateQueries({ queryKey: ['credit-cards-summary'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            showToast('Tarjeta eliminada', 'success');
        },
        onError: () => showToast('Error al eliminar la tarjeta', 'error')
    });

    const handleCreateCard = (e: React.FormEvent) => {
        e.preventDefault();
        const limit = parseFloat(newCard.creditLimit.replace(/\./g, ''));
        if (!newCard.name.trim()) {
            showToast('El nombre de la tarjeta es requerido', 'error');
            return;
        }
        if (isNaN(limit) || limit <= 0) {
            showToast('El límite de crédito debe ser mayor a cero', 'error');
            return;
        }
        const cutOff = parseInt(newCard.cutOffDay);
        const dueDay = parseInt(newCard.paymentDueDay);
        if (isNaN(cutOff) || cutOff < 1 || cutOff > 31) {
            showToast('Día de corte debe estar entre 1 y 31', 'error');
            return;
        }
        if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
            showToast('Día de pago debe estar entre 1 y 31', 'error');
            return;
        }
        createCardMutation.mutate({
            ...newCard,
            creditLimit: limit,
            interestRate: newCard.interestRate ? parseFloat(newCard.interestRate) : null
        });
    };

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCard) return;
        const amount = parseFloat(newTransaction.amount.replace(/\./g, ''));
        if (isNaN(amount) || amount <= 0) {
            showToast('Ingresa un monto válido (mayor a cero)', 'error');
            return;
        }
        if (!newTransaction.description.trim()) {
            showToast('La descripción es requerida', 'error');
            return;
        }
        const installments = parseInt(newTransaction.installments);
        if (isNaN(installments) || installments < 1) {
            showToast('Las cuotas deben ser al menos 1', 'error');
            return;
        }
        addTransactionMutation.mutate({
            cardId: selectedCard.id,
            data: {
                ...newTransaction,
                amount,
                installments
            }
        });
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCard) return;
        const amount = parseFloat(newPayment.amount.replace(/\./g, ''));
        if (isNaN(amount) || amount <= 0) {
            showToast('Ingresa un monto válido (mayor a cero)', 'error');
            return;
        }
        if (!newPayment.paymentDate) {
            showToast('La fecha de pago es requerida', 'error');
            return;
        }
        const paymentData: any = {
            ...newPayment,
            amount
        };
        if (newPayment.fromAccountId) {
            paymentData.fromAccountId = newPayment.fromAccountId;
        } else {
            delete paymentData.fromAccountId;
        }
        addPaymentMutation.mutate({
            cardId: selectedCard.id,
            data: paymentData
        });
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 80) return 'text-red-600';
        if (percentage >= 50) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getUsageBarColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-red-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Tarjetas de Credito" emoji="💳" subtitle="Gestiona tus tarjetas y pagos">
                <ExportMenu type="credit-cards" />
                <Button onClick={() => setShowNewCardModal(true)}>
                    + Nueva Tarjeta
                </Button>
            </PageHeader>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Card padding="sm">
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Total Tarjetas</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCards}</p>
                    </Card>
                    <Card padding="sm">
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Cupo Total</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(summary.totalLimit)}</p>
                    </Card>
                    <Card padding="sm">
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Deuda Total</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{formatCOP(summary.totalBalance)}</p>
                    </Card>
                    <Card padding="sm">
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Disponible</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCOP(summary.totalAvailable)}</p>
                    </Card>
                </div>
            )}

                {/* Upcoming Payments Alert */}
                {summary && summary.upcomingPayments.length > 0 && (
                    <Card padding="md" className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 mb-6 sm:mb-8">
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2 text-sm sm:text-base">
                            <span>⚠️</span> Proximos Pagos
                        </h3>
                        <div className="mt-2 space-y-2">
                            {summary.upcomingPayments.map((payment) => (
                                <div key={payment.cardId} className={`flex justify-between items-center p-2 rounded text-sm ${payment.isOverdue ? 'bg-red-100 dark:bg-red-900/50' : payment.isUrgent ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-white dark:bg-gray-800'}`}>
                                    <span className="font-medium text-gray-900 dark:text-white">{payment.cardName}</span>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">{formatCOP(payment.balance)}</p>
                                        <p className={`text-xs sm:text-sm ${payment.isOverdue ? 'text-red-600 dark:text-red-400' : payment.isUrgent ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {payment.isOverdue ? 'Vencido' : `${payment.daysUntilDue} dias`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Credit Cards List */}
                <QueryStateBoundary
                    query={cardsQuery}
                    emptyState={
                        <Card padding="lg" className="text-center">
                            <p className="text-4xl sm:text-5xl md:text-6xl mb-4">💳</p>
                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No tienes tarjetas registradas</h3>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">Agrega tus tarjetas de crédito para llevar un control</p>
                            <Button onClick={() => setShowNewCardModal(true)}>
                                + Agregar Primera Tarjeta
                            </Button>
                        </Card>
                    }
                >
                    {(cardsList: CreditCard[]) => (
                    <div className="space-y-4 sm:space-y-6">
                        {cardsList.map((card) => (
                            <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
                                {/* Card Header */}
                                <div
                                    className="p-4 sm:p-6 cursor-pointer"
                                    style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)` }}
                                    onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                                >
                                    <div className="flex justify-between items-start text-white">
                                        <div>
                                            <p className="text-white/70 text-xs sm:text-sm">{card.brand}</p>
                                            <h3 className="text-base sm:text-lg md:text-xl font-bold">{card.name}</h3>
                                            {card.lastFourDigits && (
                                                <p className="text-white/80 mt-1 text-xs sm:text-sm">**** **** **** {card.lastFourDigits}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/70 text-xs sm:text-sm">Saldo Actual</p>
                                            <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatCOP(card.currentBalance)}</p>
                                        </div>
                                    </div>

                                    {/* Usage Bar */}
                                    <div className="mt-3 sm:mt-4">
                                        <div className="flex justify-between text-xs sm:text-sm text-white/80 mb-1">
                                            <span>Uso: {card.usagePercentage}%</span>
                                            <span>Disponible: {formatCOP(card.availableCredit)}</span>
                                        </div>
                                        <div className="w-full bg-white/30 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${card.usagePercentage >= 80 ? 'bg-red-400' : card.usagePercentage >= 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                                style={{ width: `${Math.min(card.usagePercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-white/80">
                                        <span>Corte: dia {card.cutOffDay}</span>
                                        <span>Pago: dia {card.paymentDueDay}</span>
                                        {card.interestRate && <span>Tasa: {card.interestRate}%</span>}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedCard === card.id && (
                                    <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700">
                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
                                            <Button
                                                onClick={() => {
                                                    setSelectedCard(card);
                                                    setShowTransactionModal(true);
                                                }}
                                                variant="danger"
                                                fullWidth
                                            >
                                                + Registrar Gasto
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedCard(card);
                                                    setNewPayment({ ...newPayment, amount: card.currentBalance.toString(), fromAccountId: '' });
                                                    setShowPaymentModal(true);
                                                }}
                                                variant="primary"
                                                fullWidth
                                                className="!bg-green-600 hover:!bg-green-700"
                                            >
                                                💰 Registrar Pago
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setConfirmMessage('¿Eliminar esta tarjeta?');
                                                    setConfirmAction(() => () => deleteCardMutation.mutate(card.id));
                                                }}
                                                variant="ghost"
                                                aria-label={`Eliminar tarjeta ${card.name}`}
                                            >
                                                🗑️
                                            </Button>
                                        </div>

                                        {/* Recent Transactions */}
                                        {card.transactions.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base mb-2">Ultimos Gastos</h4>
                                                <div className="space-y-2">
                                                    {card.transactions.map((t) => (
                                                        <div key={t.id} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                            <div>
                                                                <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{t.description}</p>
                                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                                    {t.merchant && `${t.merchant} • `}
                                                                    {new Date(t.transactionDate).toLocaleDateString('es-CO')}
                                                                    {t.installments > 1 && ` • Cuota ${t.currentInstallment}/${t.installments}`}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-red-600 dark:text-red-400 text-sm sm:text-base">-{formatCOP(t.amount)}</span>
                                                                <button
                                                                    onClick={() => setEditingTransaction({
                                                                        cardId: card.id,
                                                                        transactionId: t.id,
                                                                        amount: t.amount.toString(),
                                                                        description: t.description,
                                                                        merchant: t.merchant || '',
                                                                        installments: t.installments.toString(),
                                                                        transactionDate: t.transactionDate.split('T')[0],
                                                                    })}
                                                                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                                                                    aria-label={`Editar gasto ${t.description}`}
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmMessage('¿Eliminar este gasto?');
                                                                        setConfirmAction(() => () => deleteTransactionMutation.mutate({ cardId: card.id, transactionId: t.id }));
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                                                                    aria-label={`Eliminar gasto ${t.description}`}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Payments */}
                                        {card.payments.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base mb-2">Ultimos Pagos</h4>
                                                <div className="space-y-2">
                                                    {card.payments.map((p) => (
                                                        <div key={p.id} className="flex justify-between items-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                                            <div>
                                                                <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                                                                    {p.paymentType === 'FULL' ? 'Pago Total' :
                                                                     p.paymentType === 'MINIMUM' ? 'Pago Minimo' : 'Pago Parcial'}
                                                                </p>
                                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                                    {new Date(p.paymentDate).toLocaleDateString('es-CO')}
                                                                </p>
                                                            </div>
                                                            <span className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base">+{formatCOP(p.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    )}
                </QueryStateBoundary>

            {/* New Card Modal */}
            <Modal isOpen={showNewCardModal} onClose={() => setShowNewCardModal(false)} title="Nueva Tarjeta de Credito" size="lg">
                <form onSubmit={handleCreateCard} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la tarjeta</label>
                        <input
                            type="text"
                            value={newCard.name}
                            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                            placeholder="Ej: Visa Gold Bancolombia"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ultimos 4 digitos</label>
                            <input
                                type="text"
                                maxLength={4}
                                value={newCard.lastFourDigits}
                                onChange={(e) => setNewCard({ ...newCard, lastFourDigits: e.target.value.replace(/\D/g, '') })}
                                placeholder="1234"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Franquicia</label>
                            <select
                                value={newCard.brand}
                                onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            >
                                {CARD_BRANDS.map((b) => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cupo de credito</label>
                        <CurrencyInput
                            value={newCard.creditLimit}
                            onChange={(value) => setNewCard({ ...newCard, creditLimit: value })}
                            placeholder="5.000.000"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia de corte</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={newCard.cutOffDay}
                                onChange={(e) => setNewCard({ ...newCard, cutOffDay: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia limite de pago</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={newCard.paymentDueDay}
                                onChange={(e) => setNewCard({ ...newCard, paymentDueDay: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tasa de interes anual (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={newCard.interestRate}
                            onChange={(e) => setNewCard({ ...newCard, interestRate: e.target.value })}
                            placeholder="28.5"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color de la tarjeta</label>
                        <div className="flex flex-wrap gap-2">
                            {CARD_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setNewCard({ ...newCard, color })}
                                    className={`w-8 h-8 rounded-full transition ${newCard.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Seleccionar color ${color}`}
                                />
                            ))}
                        </div>
                    </div>

                    <ModalFooter>
                        <Button type="button" variant="secondary" onClick={() => setShowNewCardModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createCardMutation.isPending}>
                            {createCardMutation.isPending ? 'Guardando...' : 'Crear Tarjeta'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Transaction Modal */}
            <Modal
                isOpen={showTransactionModal && !!selectedCard}
                onClose={() => { setShowTransactionModal(false); setSelectedCard(null); }}
                title="Registrar Gasto"
            >
                {selectedCard && (
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm -mt-2 mb-4">{selectedCard.name}</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                            <CurrencyInput
                                value={newTransaction.amount}
                                onChange={(value) => setNewTransaction({ ...newTransaction, amount: value })}
                                placeholder="100.000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
                            <input
                                type="text"
                                value={newTransaction.description}
                                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                placeholder="Ej: Compra en Almacen XYZ"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comercio (opcional)</label>
                            <input
                                type="text"
                                value={newTransaction.merchant}
                                onChange={(e) => setNewTransaction({ ...newTransaction, merchant: e.target.value })}
                                placeholder="Ej: Exito, Falabella"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuotas</label>
                                <select
                                    value={newTransaction.installments}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, installments: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                >
                                    {[1, 2, 3, 6, 12, 18, 24, 36, 48].map((n) => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'cuota' : 'cuotas'}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={newTransaction.transactionDate}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                    required
                                />
                            </div>
                        </div>

                        <ModalFooter>
                            <Button type="button" variant="secondary" onClick={() => { setShowTransactionModal(false); setSelectedCard(null); }}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="danger" disabled={addTransactionMutation.isPending}>
                                {addTransactionMutation.isPending ? 'Guardando...' : 'Registrar Gasto'}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>

            {/* Edit CC Transaction Modal */}
            <Modal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                title="Editar Gasto de Tarjeta"
            >
                {editingTransaction && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateTransactionMutation.mutate({
                                cardId: editingTransaction.cardId,
                                transactionId: editingTransaction.transactionId,
                                data: {
                                    amount: parseFloat(editingTransaction.amount.replace(/\./g, '')),
                                    description: editingTransaction.description,
                                    merchant: editingTransaction.merchant || null,
                                    installments: parseInt(editingTransaction.installments),
                                    transactionDate: editingTransaction.transactionDate,
                                }
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                            <CurrencyInput
                                value={editingTransaction.amount}
                                onChange={(value) => setEditingTransaction({ ...editingTransaction, amount: value })}
                                placeholder="100.000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
                            <input
                                type="text"
                                value={editingTransaction.description}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comercio (opcional)</label>
                            <input
                                type="text"
                                value={editingTransaction.merchant}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, merchant: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuotas</label>
                                <select
                                    value={editingTransaction.installments}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, installments: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                >
                                    {[1, 2, 3, 6, 12, 18, 24, 36, 48].map((n) => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'cuota' : 'cuotas'}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={editingTransaction.transactionDate}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, transactionDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                    required
                                />
                            </div>
                        </div>
                        <ModalFooter>
                            <Button type="button" variant="secondary" onClick={() => setEditingTransaction(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={updateTransactionMutation.isPending}>
                                {updateTransactionMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal && !!selectedCard}
                onClose={() => { setShowPaymentModal(false); setSelectedCard(null); }}
                title="Registrar Pago"
            >
                {selectedCard && (
                    <form onSubmit={handleAddPayment} className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{selectedCard.name}</p>
                            <p className="text-lg font-semibold text-red-600 dark:text-red-400">Saldo: {formatCOP(selectedCard.currentBalance)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del pago</label>
                            <CurrencyInput
                                value={newPayment.amount}
                                onChange={(value) => setNewPayment({ ...newPayment, amount: value })}
                                placeholder={selectedCard.currentBalance.toString()}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de pago</label>
                            <select
                                value={newPayment.paymentType}
                                onChange={(e) => setNewPayment({ ...newPayment, paymentType: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            >
                                <option value="FULL">Pago Total</option>
                                <option value="MINIMUM">Pago Minimo</option>
                                <option value="PARTIAL">Pago Parcial</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha del pago</label>
                            <input
                                type="date"
                                value={newPayment.paymentDate}
                                onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuenta de pago (opcional)</label>
                            <select
                                value={newPayment.fromAccountId}
                                onChange={(e) => setNewPayment({ ...newPayment, fromAccountId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            >
                                <option value="">Sin cuenta asociada</option>
                                {accounts?.filter((a: any) => a.isActive).map((account: any) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} — {formatCOP(Number(account.balance))}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Si seleccionas una cuenta, el saldo se descontara automaticamente
                            </p>
                        </div>

                        <ModalFooter>
                            <Button type="button" variant="secondary" onClick={() => { setShowPaymentModal(false); setSelectedCard(null); }}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={addPaymentMutation.isPending} className="!bg-green-600 hover:!bg-green-700">
                                {addPaymentMutation.isPending ? 'Guardando...' : 'Confirmar Pago'}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>

            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction?.()}
                message={confirmMessage}
                confirmLabel="Eliminar"
                variant="danger"
            />
        </div>
    );
}
