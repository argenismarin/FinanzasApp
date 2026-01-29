'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCOP } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CalculatorsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'compound' | 'loan' | 'savings' | 'retirement'>('compound');

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Calculadoras Financieras" emoji="🧮" subtitle="Herramientas para planificar tu futuro financiero" />

            {/* Tabs */}
            <Card padding="sm" className="mb-4 sm:mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                        onClick={() => setActiveTab('compound')}
                        className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition text-xs sm:text-sm min-h-[44px] ${
                            activeTab === 'compound'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        💰 Interes Compuesto
                    </button>
                    <button
                        onClick={() => setActiveTab('loan')}
                        className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition text-xs sm:text-sm min-h-[44px] ${
                            activeTab === 'loan'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        🏦 Prestamo
                    </button>
                    <button
                        onClick={() => setActiveTab('savings')}
                        className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition text-xs sm:text-sm min-h-[44px] ${
                            activeTab === 'savings'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        🎯 Meta de Ahorro
                    </button>
                    <button
                        onClick={() => setActiveTab('retirement')}
                        className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition text-xs sm:text-sm min-h-[44px] ${
                            activeTab === 'retirement'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        👴 Jubilacion
                    </button>
                </div>
            </Card>

            {/* Calculators */}
            {activeTab === 'compound' && <CompoundInterestCalculator />}
            {activeTab === 'loan' && <LoanCalculator />}
            {activeTab === 'savings' && <SavingsGoalCalculator />}
            {activeTab === 'retirement' && <RetirementCalculator />}
        </div>
    );
}

// Compound Interest Calculator
function CompoundInterestCalculator() {
    const [principal, setPrincipal] = useState('');
    const [rate, setRate] = useState('');
    const [years, setYears] = useState('');
    const [monthlyContribution, setMonthlyContribution] = useState('');
    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        const p = parseFloat(principal) || 0;
        const r = (parseFloat(rate) || 0) / 100 / 12;
        const n = (parseFloat(years) || 0) * 12;
        const pmt = parseFloat(monthlyContribution) || 0;

        const futureValue = p * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
        const totalContributions = p + (pmt * n);
        const totalInterest = futureValue - totalContributions;

        setResult({ futureValue, totalContributions, totalInterest });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">💰 Calculadora de Interes Compuesto</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capital Inicial</label>
                        <CurrencyInput value={principal} onChange={setPrincipal} placeholder="Monto inicial" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tasa de Interes Anual (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="5.5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Años</label>
                        <input
                            type="number"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aporte Mensual (Opcional)</label>
                        <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} placeholder="Aporte mensual" />
                    </div>
                    <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                        Calcular
                    </Button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Resultados</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Valor Futuro</p>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCOP(result.futureValue)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Invertido</p>
                                <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{formatCOP(result.totalContributions)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Intereses Ganados</p>
                                <p className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">{formatCOP(result.totalInterest)}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">💡 Con disciplina y tiempo, tu dinero trabaja para ti</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// Loan Calculator
function LoanCalculator() {
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [months, setMonths] = useState('');
    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        const p = parseFloat(amount) || 0;
        const r = (parseFloat(rate) || 0) / 100 / 12;
        const n = parseFloat(months) || 0;

        const monthlyPayment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayment = monthlyPayment * n;
        const totalInterest = totalPayment - p;

        setResult({ monthlyPayment, totalPayment, totalInterest, loanAmount: p });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">🏦 Calculadora de Prestamo</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto del Prestamo</label>
                        <CurrencyInput value={amount} onChange={setAmount} placeholder="Monto a solicitar" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tasa de Interes Anual (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="12.5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plazo (meses)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="36"
                        />
                    </div>
                    <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                        Calcular
                    </Button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Resultados</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Cuota Mensual</p>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(result.monthlyPayment)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total a Pagar</p>
                                <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{formatCOP(result.totalPayment)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Intereses Totales</p>
                                <p className="text-lg sm:text-xl font-semibold text-red-600 dark:text-red-400">{formatCOP(result.totalInterest)}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">⚠️ Asegurate de que la cuota no supere el 30% de tus ingresos</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// Savings Goal Calculator
function SavingsGoalCalculator() {
    const [goal, setGoal] = useState('');
    const [current, setCurrent] = useState('');
    const [months, setMonths] = useState('');
    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        const g = parseFloat(goal) || 0;
        const c = parseFloat(current) || 0;
        const m = parseFloat(months) || 1;

        const remaining = g - c;
        const monthly = remaining / m;
        const weekly = monthly / 4.33;
        const daily = monthly / 30;

        setResult({ remaining, monthly, weekly, daily, progress: (c / g) * 100 });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">🎯 Calculadora de Meta de Ahorro</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meta de Ahorro</label>
                        <CurrencyInput value={goal} onChange={setGoal} placeholder="Meta a alcanzar" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ahorro Actual</label>
                        <CurrencyInput value={current} onChange={setCurrent} placeholder="¿Cuanto tienes?" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plazo (meses)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="12"
                        />
                    </div>
                    <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                        Calcular
                    </Button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Plan de Ahorro</h3>
                        <div className="space-y-4">
                            <div className="mb-4">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Progreso Actual</p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.min(result.progress, 100)}%` }} />
                                </div>
                                <p className="text-right text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{result.progress.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Te Falta</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(result.remaining)}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded">
                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Mensual</p>
                                    <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">{formatCOP(result.monthly)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded">
                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Semanal</p>
                                    <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">{formatCOP(result.weekly)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded">
                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Diario</p>
                                    <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">{formatCOP(result.daily)}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">✨ Pequeños ahorros consistentes logran grandes metas</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// Retirement Calculator
function RetirementCalculator() {
    const [currentAge, setCurrentAge] = useState('');
    const [retirementAge, setRetirementAge] = useState('');
    const [monthlyExpenses, setMonthlyExpenses] = useState('');
    const [currentSavings, setCurrentSavings] = useState('');
    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        const yearsToRetirement = (parseFloat(retirementAge) || 65) - (parseFloat(currentAge) || 30);
        const expenses = parseFloat(monthlyExpenses) || 0;
        const savings = parseFloat(currentSavings) || 0;

        const yearsInRetirement = 25;
        const totalNeeded = expenses * 12 * yearsInRetirement;
        const stillNeeded = Math.max(0, totalNeeded - savings);
        const monthlySavings = stillNeeded / (yearsToRetirement * 12);

        setResult({ totalNeeded, stillNeeded, monthlySavings, yearsToRetirement, progress: (savings / totalNeeded) * 100 });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">👴 Calculadora de Jubilacion</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Edad Actual</label>
                        <input
                            type="number"
                            value={currentAge}
                            onChange={(e) => setCurrentAge(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Edad de Jubilacion</label>
                        <input
                            type="number"
                            value={retirementAge}
                            onChange={(e) => setRetirementAge(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px]"
                            placeholder="65"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gastos Mensuales Esperados</label>
                        <CurrencyInput value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="Gastos en jubilacion" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ahorros Actuales</label>
                        <CurrencyInput value={currentSavings} onChange={setCurrentSavings} placeholder="¿Cuanto tienes?" />
                    </div>
                    <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                        Calcular
                    </Button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Plan de Jubilacion</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Necesario</p>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{formatCOP(result.totalNeeded)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Para 25 años de jubilacion</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Aun Necesitas</p>
                                <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{formatCOP(result.stillNeeded)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Ahorro Mensual Requerido</p>
                                <p className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400">{formatCOP(result.monthlySavings)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Durante {result.yearsToRetirement} años</p>
                            </div>
                            <div className="mb-4">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Progreso</p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${Math.min(result.progress, 100)}%` }} />
                                </div>
                                <p className="text-right text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{result.progress.toFixed(1)}%</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">🌟 Nunca es tarde para empezar. ¡Mientras antes, mejor!</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

