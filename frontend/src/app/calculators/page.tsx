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
    const [activeTab, setActiveTab] = useState<'compound' | 'loan' | 'savings' | 'retirement' | 'debt-payoff' | 'budget'>('compound');

    const tabs = [
        { id: 'compound' as const, label: '💰 Interes Compuesto' },
        { id: 'loan' as const, label: '🏦 Prestamo' },
        { id: 'savings' as const, label: '🎯 Meta de Ahorro' },
        { id: 'retirement' as const, label: '👴 Jubilacion' },
        { id: 'debt-payoff' as const, label: '💳 Pago Deudas' },
        { id: 'budget' as const, label: '📋 Presupuesto' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader title="Calculadoras Financieras" emoji="🧮" subtitle="Herramientas para planificar tu futuro financiero" />

            {/* Tabs */}
            <Card padding="sm" className="mb-4 sm:mb-6">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition text-xs sm:text-sm min-h-[44px] ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Calculators */}
            {activeTab === 'compound' && <CompoundInterestCalculator />}
            {activeTab === 'loan' && <LoanCalculator />}
            {activeTab === 'savings' && <SavingsGoalCalculator />}
            {activeTab === 'retirement' && <RetirementCalculator />}
            {activeTab === 'debt-payoff' && <DebtPayoffCalculator />}
            {activeTab === 'budget' && <BudgetPlannerCalculator />}
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
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// Debt Payoff Calculator
function DebtPayoffCalculator() {
    const [debts, setDebts] = useState([{ name: '', balance: '', rate: '', minPayment: '' }]);
    const [extraPayment, setExtraPayment] = useState('');
    const [result, setResult] = useState<any>(null);

    const addDebt = () => {
        setDebts([...debts, { name: '', balance: '', rate: '', minPayment: '' }]);
    };

    const removeDebt = (index: number) => {
        if (debts.length > 1) {
            setDebts(debts.filter((_, i) => i !== index));
        }
    };

    const updateDebt = (index: number, field: string, value: string) => {
        const updated = [...debts];
        updated[index] = { ...updated[index], [field]: value };
        setDebts(updated);
    };

    const simulate = (sortedDebts: { name: string; balance: number; rate: number; minPayment: number }[], extra: number) => {
        const originalTotal = sortedDebts.reduce((s, d) => s + d.balance, 0);
        let totalInterest = 0;
        let months = 0;
        const remaining = sortedDebts.map(d => ({ ...d }));
        const maxMonths = 600; // 50 years cap

        while (remaining.some(d => d.balance > 0) && months < maxMonths) {
            months++;
            let extraLeft = extra;

            for (const d of remaining) {
                if (d.balance <= 0) continue;
                const interest = d.balance * (d.rate / 100 / 12);
                totalInterest += interest;
                d.balance += interest;
                const payment = Math.min(d.minPayment, d.balance);
                d.balance -= payment;
            }

            // Apply extra to first debt with balance
            for (const d of remaining) {
                if (d.balance <= 0 || extraLeft <= 0) continue;
                const applied = Math.min(extraLeft, d.balance);
                d.balance -= applied;
                extraLeft -= applied;
                break;
            }
        }

        return { months, totalInterest, totalPaid: originalTotal + totalInterest };
    };

    const calculate = () => {
        const parsed = debts
            .filter(d => d.balance && d.rate && d.minPayment)
            .map(d => ({
                name: d.name || 'Deuda',
                balance: parseFloat(d.balance) || 0,
                rate: parseFloat(d.rate) || 0,
                minPayment: parseFloat(d.minPayment) || 0,
            }));

        if (parsed.length === 0) return;

        const extra = parseFloat(extraPayment) || 0;
        const totalDebt = parsed.reduce((s, d) => s + d.balance, 0);
        const totalMin = parsed.reduce((s, d) => s + d.minPayment, 0);

        // Avalanche: highest rate first
        const avalanche = parsed.map(d => ({ ...d })).sort((a, b) => b.rate - a.rate);
        const avalancheResult = simulate(avalanche, extra);

        // Snowball: lowest balance first
        const snowball = parsed.map(d => ({ ...d })).sort((a, b) => a.balance - b.balance);
        const snowballResult = simulate(snowball, extra);

        setResult({
            totalDebt,
            totalMin,
            extra,
            avalanche: avalancheResult,
            snowball: snowballResult,
        });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">💳 Calculadora de Pago de Deudas</h2>

            <div className="space-y-4 mb-6">
                {debts.map((debt, i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deuda #{i + 1}</span>
                            {debts.length > 1 && (
                                <button onClick={() => removeDebt(i)} className="text-red-500 text-sm hover:text-red-700" aria-label={`Eliminar deuda ${i + 1}`}>
                                    Eliminar
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={debt.name}
                                    onChange={(e) => updateDebt(i, 'name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    placeholder="Ej: Visa"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo</label>
                                <input
                                    type="number"
                                    value={debt.balance}
                                    onChange={(e) => updateDebt(i, 'balance', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    placeholder="1000000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tasa Anual %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={debt.rate}
                                    onChange={(e) => updateDebt(i, 'rate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    placeholder="28.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pago Minimo</label>
                                <input
                                    type="number"
                                    value={debt.minPayment}
                                    onChange={(e) => updateDebt(i, 'minPayment', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    placeholder="50000"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addDebt}
                    className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition text-sm"
                >
                    + Agregar otra deuda
                </button>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pago extra mensual</label>
                    <CurrencyInput value={extraPayment} onChange={setExtraPayment} placeholder="Monto extra por mes" />
                </div>

                <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                    Comparar Estrategias
                </Button>
            </div>

            {result && (
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Avalanche */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">🏔️ Avalancha</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Mayor tasa de interes primero</p>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Meses para pagar</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.avalanche.months}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Total intereses</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCOP(result.avalanche.totalInterest)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Snowball */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">⛄ Bola de Nieve</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Menor saldo primero</p>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Meses para pagar</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.snowball.months}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Total intereses</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCOP(result.snowball.totalInterest)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="md:col-span-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white">
                        <p className="font-bold mb-1">💡 Recomendacion</p>
                        {result.avalanche.totalInterest <= result.snowball.totalInterest ? (
                            <p className="text-sm text-white/90">
                                La <strong>Avalancha</strong> te ahorra {formatCOP(result.snowball.totalInterest - result.avalanche.totalInterest)} en intereses.
                                Es la opcion matematicamente optima. Pero si necesitas motivacion rapida, la Bola de Nieve elimina deudas pequenas primero.
                            </p>
                        ) : (
                            <p className="text-sm text-white/90">
                                La <strong>Bola de Nieve</strong> es ligeramente mas economica en tu caso.
                                Ademas, eliminar deudas pequenas primero te dara motivacion para seguir adelante.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

// Budget Planner Calculator
function BudgetPlannerCalculator() {
    const [income, setIncome] = useState('');
    const [expenses, setExpenses] = useState([{ name: '', amount: '' }]);
    const [result, setResult] = useState<any>(null);

    const addExpense = () => {
        setExpenses([...expenses, { name: '', amount: '' }]);
    };

    const removeExpense = (index: number) => {
        if (expenses.length > 1) {
            setExpenses(expenses.filter((_, i) => i !== index));
        }
    };

    const updateExpense = (index: number, field: string, value: string) => {
        const updated = [...expenses];
        updated[index] = { ...updated[index], [field]: value };
        setExpenses(updated);
    };

    const calculate = () => {
        const monthlyIncome = parseFloat(income) || 0;
        if (monthlyIncome <= 0) return;

        const totalFixed = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const available = monthlyIncome - totalFixed;

        // 50/30/20 rule
        const needs50 = monthlyIncome * 0.5;
        const wants30 = monthlyIncome * 0.3;
        const savings20 = monthlyIncome * 0.2;

        setResult({
            monthlyIncome,
            totalFixed,
            available,
            fixedPct: (totalFixed / monthlyIncome) * 100,
            rule: { needs50, wants30, savings20 },
            suggested: {
                needs: Math.max(0, needs50 - totalFixed),
                wants: wants30,
                savings: savings20,
            }
        });
    };

    return (
        <Card padding="md">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">📋 Planificador de Presupuesto</h2>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ingreso Mensual</label>
                        <CurrencyInput value={income} onChange={setIncome} placeholder="Tu ingreso mensual" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gastos Fijos</label>
                        <div className="space-y-2">
                            {expenses.map((expense, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={expense.name}
                                        onChange={(e) => updateExpense(i, 'name', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        placeholder="Nombre (ej: Arriendo)"
                                    />
                                    <input
                                        type="number"
                                        value={expense.amount}
                                        onChange={(e) => updateExpense(i, 'amount', e.target.value)}
                                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        placeholder="Monto"
                                    />
                                    {expenses.length > 1 && (
                                        <button
                                            onClick={() => removeExpense(i)}
                                            className="text-red-500 hover:text-red-700 px-2"
                                            aria-label={`Eliminar gasto ${expense.name || i + 1}`}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addExpense}
                            className="mt-2 w-full py-1.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition text-sm"
                        >
                            + Agregar gasto fijo
                        </button>
                    </div>

                    <Button onClick={calculate} fullWidth className="!bg-purple-600 hover:!bg-purple-700">
                        Calcular
                    </Button>
                </div>

                {result && (
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Tu Presupuesto</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Ingreso:</span>
                                <span className="font-bold text-green-600">{formatCOP(result.monthlyIncome)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Gastos Fijos:</span>
                                <span className="font-bold text-red-600">-{formatCOP(result.totalFixed)}</span>
                            </div>
                            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">Disponible:</span>
                                <span className={`font-bold text-lg ${result.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCOP(result.available)}
                                </span>
                            </div>

                            {/* 50/30/20 Rule */}
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Regla 50/30/20</p>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">50% Necesidades</span>
                                            <span className="font-medium">{formatCOP(result.rule.needs50)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(result.fixedPct / 0.5, 100)}%` }} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            Tus fijos usan {result.fixedPct.toFixed(0)}% — {result.fixedPct <= 50 ? '✅ Bien' : '⚠️ Excede'}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">30% Deseos</span>
                                            <span className="font-medium">{formatCOP(result.rule.wants30)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">20% Ahorro</span>
                                            <span className="font-medium">{formatCOP(result.rule.savings20)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    💡 Intenta destinar al menos {formatCOP(result.rule.savings20)} al mes para ahorro e inversiones
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
