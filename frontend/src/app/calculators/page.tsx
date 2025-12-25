'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCOP } from '@/lib/utils';

export default function CalculatorsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'compound' | 'loan' | 'savings' | 'retirement'>('compound');

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-purple-600 hover:text-purple-700 flex items-center gap-2"
                    >
                        ← Volver al Dashboard
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🧮 Calculadoras Financieras</h1>
                    <p className="text-gray-600">Herramientas para planificar tu futuro financiero</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-xl mb-6 p-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => setActiveTab('compound')}
                            className={`py-3 px-4 rounded-lg font-semibold transition ${
                                activeTab === 'compound'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            💰 Interés Compuesto
                        </button>
                        <button
                            onClick={() => setActiveTab('loan')}
                            className={`py-3 px-4 rounded-lg font-semibold transition ${
                                activeTab === 'loan'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            🏦 Préstamo
                        </button>
                        <button
                            onClick={() => setActiveTab('savings')}
                            className={`py-3 px-4 rounded-lg font-semibold transition ${
                                activeTab === 'savings'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            🎯 Meta de Ahorro
                        </button>
                        <button
                            onClick={() => setActiveTab('retirement')}
                            className={`py-3 px-4 rounded-lg font-semibold transition ${
                                activeTab === 'retirement'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            👴 Jubilación
                        </button>
                    </div>
                </div>

                {/* Calculators */}
                {activeTab === 'compound' && <CompoundInterestCalculator />}
                {activeTab === 'loan' && <LoanCalculator />}
                {activeTab === 'savings' && <SavingsGoalCalculator />}
                {activeTab === 'retirement' && <RetirementCalculator />}
            </div>
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

        // Future value with monthly contributions
        const futureValue = p * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
        const totalContributions = p + (pmt * n);
        const totalInterest = futureValue - totalContributions;

        setResult({
            futureValue,
            totalContributions,
            totalInterest
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Calculadora de Interés Compuesto</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Capital Inicial</label>
                        <CurrencyInput
                            value={principal}
                            onChange={setPrincipal}
                            placeholder="Monto inicial"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Interés Anual (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="5.5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Años</label>
                        <input
                            type="number"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Aporte Mensual (Opcional)</label>
                        <CurrencyInput
                            value={monthlyContribution}
                            onChange={setMonthlyContribution}
                            placeholder="Aporte mensual"
                        />
                    </div>
                    <button
                        onClick={calculate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold"
                    >
                        Calcular
                    </button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resultados</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Valor Futuro</p>
                                <p className="text-3xl font-bold text-purple-600">{formatCOP(result.futureValue)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Invertido</p>
                                <p className="text-xl font-semibold text-gray-900">{formatCOP(result.totalContributions)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Intereses Ganados</p>
                                <p className="text-xl font-semibold text-green-600">{formatCOP(result.totalInterest)}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <p className="text-xs text-gray-500">
                                    💡 Con disciplina y tiempo, tu dinero trabaja para ti
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
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

        // Monthly payment
        const monthlyPayment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayment = monthlyPayment * n;
        const totalInterest = totalPayment - p;

        setResult({
            monthlyPayment,
            totalPayment,
            totalInterest,
            loanAmount: p
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🏦 Calculadora de Préstamo</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Monto del Préstamo</label>
                        <CurrencyInput
                            value={amount}
                            onChange={setAmount}
                            placeholder="Monto a solicitar"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Interés Anual (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="12.5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plazo (meses)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="36"
                        />
                    </div>
                    <button
                        onClick={calculate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold"
                    >
                        Calcular
                    </button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resultados</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Cuota Mensual</p>
                                <p className="text-3xl font-bold text-blue-600">{formatCOP(result.monthlyPayment)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total a Pagar</p>
                                <p className="text-xl font-semibold text-gray-900">{formatCOP(result.totalPayment)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Intereses Totales</p>
                                <p className="text-xl font-semibold text-red-600">{formatCOP(result.totalInterest)}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <p className="text-xs text-gray-500">
                                    ⚠️ Asegúrate de que la cuota no supere el 30% de tus ingresos
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
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

        setResult({
            remaining,
            monthly,
            weekly,
            daily,
            progress: (c / g) * 100
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Calculadora de Meta de Ahorro</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta de Ahorro</label>
                        <CurrencyInput
                            value={goal}
                            onChange={setGoal}
                            placeholder="Meta a alcanzar"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ahorro Actual</label>
                        <CurrencyInput
                            value={current}
                            onChange={setCurrent}
                            placeholder="¿Cuánto tienes?"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plazo (meses)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="12"
                        />
                    </div>
                    <button
                        onClick={calculate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold"
                    >
                        Calcular
                    </button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Plan de Ahorro</h3>
                        <div className="space-y-4">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Progreso Actual</p>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                        className="bg-green-500 h-3 rounded-full"
                                        style={{ width: `${Math.min(result.progress, 100)}%` }}
                                    />
                                </div>
                                <p className="text-right text-sm text-gray-600 mt-1">{result.progress.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Te Falta</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCOP(result.remaining)}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-600">Mensual</p>
                                    <p className="text-sm font-bold text-green-600">{formatCOP(result.monthly)}</p>
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-600">Semanal</p>
                                    <p className="text-sm font-bold text-green-600">{formatCOP(result.weekly)}</p>
                                </div>
                                <div className="bg-white p-3 rounded">
                                    <p className="text-xs text-gray-600">Diario</p>
                                    <p className="text-sm font-bold text-green-600">{formatCOP(result.daily)}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <p className="text-xs text-gray-500">
                                    ✨ Pequeños ahorros consistentes logran grandes metas
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
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

        // Assume 25 years of retirement
        const yearsInRetirement = 25;
        const totalNeeded = expenses * 12 * yearsInRetirement;
        const stillNeeded = Math.max(0, totalNeeded - savings);
        const monthlySavings = stillNeeded / (yearsToRetirement * 12);

        setResult({
            totalNeeded,
            stillNeeded,
            monthlySavings,
            yearsToRetirement,
            progress: (savings / totalNeeded) * 100
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">👴 Calculadora de Jubilación</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Edad Actual</label>
                        <input
                            type="number"
                            value={currentAge}
                            onChange={(e) => setCurrentAge(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Edad de Jubilación</label>
                        <input
                            type="number"
                            value={retirementAge}
                            onChange={(e) => setRetirementAge(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="65"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gastos Mensuales Esperados</label>
                        <CurrencyInput
                            value={monthlyExpenses}
                            onChange={setMonthlyExpenses}
                            placeholder="Gastos en jubilación"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ahorros Actuales</label>
                        <CurrencyInput
                            value={currentSavings}
                            onChange={setCurrentSavings}
                            placeholder="¿Cuánto tienes?"
                        />
                    </div>
                    <button
                        onClick={calculate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold"
                    >
                        Calcular
                    </button>
                </div>
                {result && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Plan de Jubilación</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Necesario</p>
                                <p className="text-3xl font-bold text-orange-600">{formatCOP(result.totalNeeded)}</p>
                                <p className="text-xs text-gray-500 mt-1">Para 25 años de jubilación</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Aún Necesitas</p>
                                <p className="text-xl font-semibold text-gray-900">{formatCOP(result.stillNeeded)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Ahorro Mensual Requerido</p>
                                <p className="text-xl font-semibold text-blue-600">{formatCOP(result.monthlySavings)}</p>
                                <p className="text-xs text-gray-500 mt-1">Durante {result.yearsToRetirement} años</p>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Progreso</p>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                        className="bg-orange-500 h-3 rounded-full"
                                        style={{ width: `${Math.min(result.progress, 100)}%` }}
                                    />
                                </div>
                                <p className="text-right text-sm text-gray-600 mt-1">{result.progress.toFixed(1)}%</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <p className="text-xs text-gray-500">
                                    🌟 Nunca es tarde para empezar. ¡Mientras antes, mejor!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

