'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

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
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <p className="text-gray-600">Cargando balance...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-purple-600 hover:text-purple-700 flex items-center gap-2"
                    >
                        ← Volver al Dashboard
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Balance General</h1>
                    <p className="text-gray-600">Vista consolidada de tu situación financiera</p>
                </div>

                {/* Main Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Bank Balance */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-3xl">💰</div>
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {balance.breakdown.transactionsCount} transacciones
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Total en Banco/Efectivo</p>
                        <p className={`text-3xl font-bold ${balance.bankBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCOP(balance.bankBalance)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">De transacciones registradas</p>
                    </div>

                    {/* Total Savings */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-green-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-3xl">🏦</div>
                            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {balance.breakdown.savingsCount} cajitas
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Total en Ahorros</p>
                        <p className="text-3xl font-bold text-green-600">
                            {formatCOP(balance.totalSavings)}
                        </p>
                        <button
                            onClick={() => router.push('/savings')}
                            className="text-xs text-green-600 hover:text-green-700 mt-2 underline"
                        >
                            Ver ahorros →
                        </button>
                    </div>

                    {/* Total Debts */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-red-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-3xl">💳</div>
                            <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                {balance.breakdown.debtsCount} deudas
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Total de Deudas</p>
                        <p className="text-3xl font-bold text-red-600">
                            {formatCOP(balance.totalDebts)}
                        </p>
                        <button
                            onClick={() => router.push('/debts')}
                            className="text-xs text-red-600 hover:text-red-700 mt-2 underline"
                        >
                            Ver deudas →
                        </button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Net Worth */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Patrimonio Neto</h2>
                            <div className="text-4xl">📈</div>
                        </div>
                        <p className="text-5xl font-bold mb-4">{formatCOP(balance.netWorth)}</p>
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 text-sm">
                            <p className="mb-1">💰 Banco: {formatCOP(balance.bankBalance)}</p>
                            <p className="mb-1">🏦 + Ahorros: {formatCOP(balance.totalSavings)}</p>
                            <p className="mb-1 border-b border-white border-opacity-30 pb-1">
                                💳 - Deudas: {formatCOP(balance.totalDebts)}
                            </p>
                            <p className="font-bold mt-1">= {formatCOP(balance.netWorth)}</p>
                        </div>
                    </div>

                    {/* Available to Spend */}
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Disponible para Gastar</h2>
                            <div className="text-4xl">💸</div>
                        </div>
                        <p className={`text-5xl font-bold mb-4 ${balance.availableToSpend >= 0 ? '' : 'text-red-200'}`}>
                            {formatCOP(balance.availableToSpend)}
                        </p>
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 text-sm">
                            <p className="mb-1">💰 Banco: {formatCOP(balance.bankBalance)}</p>
                            <p className="text-xs mt-2 opacity-80">
                                (Dinero disponible en banco/efectivo)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => router.push('/transactions')}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg text-left transition"
                        >
                            <div className="text-2xl mb-2">💰</div>
                            <h3 className="font-semibold mb-1">Transacciones</h3>
                            <p className="text-sm text-blue-600">Ver ingresos y gastos</p>
                        </button>
                        <button
                            onClick={() => router.push('/savings')}
                            className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg text-left transition"
                        >
                            <div className="text-2xl mb-2">🏦</div>
                            <h3 className="font-semibold mb-1">Ahorros</h3>
                            <p className="text-sm text-green-600">Gestionar cajitas</p>
                        </button>
                        <button
                            onClick={() => router.push('/debts')}
                            className="bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-lg text-left transition"
                        >
                            <div className="text-2xl mb-2">💳</div>
                            <h3 className="font-semibold mb-1">Deudas</h3>
                            <p className="text-sm text-red-600">Gestionar pagos</p>
                        </button>
                    </div>
                </div>

                {/* Warning if negative */}
                {balance.availableToSpend < 0 && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <div className="flex items-start">
                            <div className="text-2xl mr-3">⚠️</div>
                            <div>
                                <h3 className="font-bold text-red-800 mb-1">Alerta: Saldo Negativo</h3>
                                <p className="text-sm text-red-700">
                                    Tu dinero disponible para gastar es negativo. Esto significa que has gastado más de lo que tienes
                                    (descontando los ahorros que no debes tocar).
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-bold text-purple-900 mb-2">📚 ¿Cómo se calculan estas métricas?</h3>
                    <div className="text-sm text-purple-800 space-y-1">
                        <p><strong>Total en Banco:</strong> Suma de todos tus ingresos menos todos tus gastos (transacciones)</p>
                        <p><strong>Total en Ahorros:</strong> Suma de todo el dinero guardado en cajitas/bolsillos</p>
                        <p><strong>Total de Deudas:</strong> Suma de todas las deudas pendientes de pago</p>
                        <p><strong>Patrimonio Neto:</strong> (Banco + Ahorros) - Deudas = Tu riqueza real</p>
                        <p><strong>Disponible para Gastar:</strong> Banco - Ahorros = Dinero que SÍ puedes usar</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
