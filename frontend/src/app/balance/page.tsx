'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BalancePage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        setAuthLoading(false);
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const { data: balanceData, isLoading } = useQuery({
        queryKey: ['balance'],
        queryFn: async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/balance`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch balance');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    const formatCOP = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const balance = balanceData || {
        bankBalance: 0,
        totalSavings: 0,
        totalDebts: 0,
        netWorth: 0,
        availableToSpend: 0,
        breakdown: { savingsCount: 0, debtsCount: 0, transactionsCount: 0 }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                title="Balance General"
                emoji="📊"
                subtitle="Vista consolidada de tu situacion financiera"
            />

            {/* Main Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Bank Balance */}
                <Card padding="md" className="border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-xl sm:text-2xl md:text-3xl">💰</div>
                        <div className="text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {balance.breakdown.transactionsCount} transacciones
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total en Banco/Efectivo</p>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${balance.bankBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCOP(balance.bankBalance)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">De transacciones registradas</p>
                </Card>

                {/* Total Savings */}
                <Card padding="md" className="border-l-4 border-green-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-xl sm:text-2xl md:text-3xl">🏦</div>
                        <div className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            {balance.breakdown.savingsCount} cajitas
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total en Ahorros</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                        {formatCOP(balance.totalSavings)}
                    </p>
                    <button
                        onClick={() => router.push('/savings')}
                        className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mt-2 underline"
                    >
                        Ver ahorros →
                    </button>
                </Card>

                {/* Total Debts */}
                <Card padding="md" className="border-l-4 border-red-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-xl sm:text-2xl md:text-3xl">💳</div>
                        <div className="text-[10px] sm:text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                            {balance.breakdown.debtsCount} deudas
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Deudas</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                        {formatCOP(balance.totalDebts)}
                    </p>
                    <button
                        onClick={() => router.push('/debts')}
                        className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2 underline"
                    >
                        Ver deudas →
                    </button>
                </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Net Worth */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-white">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Patrimonio Neto</h2>
                        <div className="text-2xl sm:text-3xl md:text-4xl">📈</div>
                    </div>
                    <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">{formatCOP(balance.netWorth)}</p>
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                        <p className="mb-1">💰 Banco: {formatCOP(balance.bankBalance)}</p>
                        <p className="mb-1">🏦 + Ahorros: {formatCOP(balance.totalSavings)}</p>
                        <p className="mb-1 border-b border-white border-opacity-30 pb-1">
                            💳 - Deudas: {formatCOP(balance.totalDebts)}
                        </p>
                        <p className="font-bold mt-1">= {formatCOP(balance.netWorth)}</p>
                    </div>
                </div>

                {/* Available to Spend */}
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-white">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Disponible para Gastar</h2>
                        <div className="text-2xl sm:text-3xl md:text-4xl">💸</div>
                    </div>
                    <p className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 ${balance.availableToSpend >= 0 ? '' : 'text-red-200'}`}>
                        {formatCOP(balance.availableToSpend)}
                    </p>
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                        <p className="mb-1">💰 Banco: {formatCOP(balance.bankBalance)}</p>
                        <p className="text-[10px] sm:text-xs mt-2 opacity-80">
                            (Dinero disponible en banco/efectivo)
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <Card padding="md">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Acciones Rapidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <button
                        onClick={() => router.push('/transactions')}
                        className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 sm:p-4 rounded-lg text-left transition"
                    >
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💰</div>
                        <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Transacciones</h3>
                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Ver ingresos y gastos</p>
                    </button>
                    <button
                        onClick={() => router.push('/savings')}
                        className="bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 p-3 sm:p-4 rounded-lg text-left transition"
                    >
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏦</div>
                        <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Ahorros</h3>
                        <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">Gestionar cajitas</p>
                    </button>
                    <button
                        onClick={() => router.push('/debts')}
                        className="bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 p-3 sm:p-4 rounded-lg text-left transition"
                    >
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💳</div>
                        <h3 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Deudas</h3>
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">Gestionar pagos</p>
                    </button>
                </div>
            </Card>

            {/* Warning if negative */}
            {balance.availableToSpend < 0 && (
                <div className="mt-4 sm:mt-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg">
                    <div className="flex items-start">
                        <div className="text-xl sm:text-2xl mr-2 sm:mr-3">⚠️</div>
                        <div>
                            <h3 className="font-bold text-red-800 dark:text-red-200 text-sm sm:text-base mb-1">Alerta: Saldo Negativo</h3>
                            <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                                Tu dinero disponible para gastar es negativo. Esto significa que has gastado mas de lo que tienes
                                (descontando los ahorros que no debes tocar).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-4 sm:mt-6 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 sm:p-4">
                <h3 className="font-bold text-purple-900 dark:text-purple-200 text-sm sm:text-base mb-2">📚 ¿Como se calculan estas metricas?</h3>
                <div className="text-xs sm:text-sm text-purple-800 dark:text-purple-300 space-y-1">
                    <p><strong>Total en Banco:</strong> Suma de todos tus ingresos menos todos tus gastos (transacciones)</p>
                    <p><strong>Total en Ahorros:</strong> Suma de todo el dinero guardado en cajitas/bolsillos</p>
                    <p><strong>Total de Deudas:</strong> Suma de todas las deudas pendientes de pago</p>
                    <p><strong>Patrimonio Neto:</strong> (Banco + Ahorros) - Deudas = Tu riqueza real</p>
                    <p><strong>Disponible para Gastar:</strong> Banco - Ahorros = Dinero que SI puedes usar</p>
                </div>
            </div>
        </div>
    );
}
