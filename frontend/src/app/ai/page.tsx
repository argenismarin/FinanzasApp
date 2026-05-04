'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import CurrencyInput from '@/components/CurrencyInput';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface SpendingAnalysis {
    analysis: string;
    transactionsCount: number;
    period: string;
}

interface BudgetSuggestion {
    categoryId: string;
    categoryName: string;
    icon: string;
    suggestedAmount: number;
}

export default function AIPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'budget'>('chat');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [question, setQuestion] = useState('');
    const [includeContext, setIncludeContext] = useState(true);
    const [analysisMonths, setAnalysisMonths] = useState(1);
    const [spendingAnalysis, setSpendingAnalysis] = useState<SpendingAnalysis | null>(null);
    const [budgetIncome, setBudgetIncome] = useState('');
    const [budgetSuggestions, setBudgetSuggestions] = useState<BudgetSuggestion[] | null>(null);
    const [budgetTotal, setBudgetTotal] = useState(0);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Chat mutation
    const chatMutation = useMutation({
        mutationFn: (data: { question: string; includeContext: boolean }) =>
            api.askFinancialAdvice(data.question, data.includeContext),
        onSuccess: (data) => {
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.advice }]);
        },
        onError: () => {
            setChatMessages(prev => prev.slice(0, -1)); // Remove pending user message
            showToast('Error al obtener respuesta del asesor', 'error');
        }
    });

    // Analysis mutation
    const analysisMutation = useMutation({
        mutationFn: (months: number) => api.analyzeSpending(months),
        onSuccess: (data) => {
            setSpendingAnalysis(data);
        },
        onError: () => showToast('Error al analizar gastos', 'error')
    });

    // Budget suggestion mutation
    const budgetMutation = useMutation({
        mutationFn: (income: number) => api.suggestBudget(income),
        onSuccess: (data) => {
            setBudgetSuggestions(data.suggestions);
            setBudgetTotal(data.total);
        },
        onError: () => showToast('Error al generar sugerencia de presupuesto', 'error')
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || chatMutation.isPending) return;

        const userMessage = question.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setQuestion('');
        chatMutation.mutate({ question: userMessage, includeContext });
    };

    const handleAnalyze = () => {
        analysisMutation.mutate(analysisMonths);
    };

    const handleSuggestBudget = (e: React.FormEvent) => {
        e.preventDefault();
        const income = parseFloat(budgetIncome.replace(/\./g, ''));
        if (!income || income <= 0) {
            showToast('Ingresa un ingreso mensual valido', 'error');
            return;
        }
        budgetMutation.mutate(income);
    };

    const suggestedQuestions = [
        'Como puedo ahorrar mas dinero cada mes?',
        'Cual es la mejor estrategia para pagar mis deudas?',
        'Como deberia distribuir mi presupuesto mensual?',
        'Que porcentaje de mis ingresos deberia ahorrar?',
    ];

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
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">Asesor Financiero IA</h1>
                    <p className="text-gray-600 dark:text-gray-400">Obtiene consejos personalizados con inteligencia artificial</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: 'chat' as const, label: 'Chat Asesor', icon: '💬' },
                        { id: 'analysis' as const, label: 'Analisis de Gastos', icon: '📊' },
                        { id: 'budget' as const, label: 'Sugerencia de Presupuesto', icon: '💡' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        {/* Messages */}
                        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                            {chatMessages.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-5xl mb-4">🤖</p>
                                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Asesor Financiero Personal
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        Hazme cualquier pregunta sobre finanzas personales. Puedo analizar tu situacion real si activas el contexto financiero.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                                        {suggestedQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setQuestion(q);
                                                }}
                                                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 text-sm transition"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    }`}>
                                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}

                            {chatMutation.isPending && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            <span className="text-sm">Pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeContext}
                                        onChange={(e) => setIncludeContext(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    Incluir mi contexto financiero real
                                </label>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Escribe tu pregunta financiera..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    disabled={chatMutation.isPending}
                                />
                                <button
                                    type="submit"
                                    disabled={chatMutation.isPending || !question.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    Enviar
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analisis de Patrones de Gasto</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            La IA analizara tus transacciones y te dara insights sobre tus habitos de gasto.
                        </p>

                        <div className="flex items-end gap-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periodo</label>
                                <select
                                    value={analysisMonths}
                                    onChange={(e) => setAnalysisMonths(parseInt(e.target.value))}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value={1}>Ultimo mes</option>
                                    <option value={3}>Ultimos 3 meses</option>
                                    <option value={6}>Ultimos 6 meses</option>
                                    <option value={12}>Ultimo ano</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={analysisMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                            >
                                {analysisMutation.isPending ? 'Analizando...' : 'Analizar Gastos'}
                            </button>
                        </div>

                        {analysisMutation.isPending && (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-500 dark:text-gray-400">Analizando tus patrones de gasto con IA...</p>
                                </div>
                            </div>
                        )}

                        {spendingAnalysis && !analysisMutation.isPending && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">📊</span>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resultado del Analisis</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {spendingAnalysis.period} — {spendingAnalysis.transactionsCount} transacciones analizadas
                                </p>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                        {spendingAnalysis.analysis}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!spendingAnalysis && !analysisMutation.isPending && (
                            <div className="text-center py-12">
                                <p className="text-5xl mb-4">📊</p>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Selecciona un periodo y haz clic en Analizar para obtener insights personalizados
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Budget Suggestion Tab */}
                {activeTab === 'budget' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sugerencia de Presupuesto con IA</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Ingresa tu ingreso mensual y la IA te sugerira como distribuir tu presupuesto usando la regla 50/30/20.
                        </p>

                        <form onSubmit={handleSuggestBudget} className="flex items-end gap-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ingreso mensual
                                </label>
                                <CurrencyInput
                                    value={budgetIncome}
                                    onChange={(value) => setBudgetIncome(value)}
                                    placeholder="3.000.000"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={budgetMutation.isPending || !budgetIncome}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                            >
                                {budgetMutation.isPending ? 'Generando...' : 'Generar Presupuesto'}
                            </button>
                        </form>

                        {budgetMutation.isPending && (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-500 dark:text-gray-400">Generando sugerencia de presupuesto...</p>
                                </div>
                            </div>
                        )}

                        {budgetSuggestions && !budgetMutation.isPending && (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    {budgetSuggestions.map((suggestion, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-2xl">{suggestion.icon}</span>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{suggestion.categoryName}</span>
                                            </div>
                                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                {formatCOP(suggestion.suggestedAmount)}
                                            </p>
                                            {budgetIncome && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {Math.round((suggestion.suggestedAmount / parseFloat(budgetIncome.replace(/\./g, ''))) * 100)}% del ingreso
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center justify-between">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Total presupuestado:</span>
                                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(budgetTotal)}</span>
                                </div>
                            </div>
                        )}

                        {!budgetSuggestions && !budgetMutation.isPending && (
                            <div className="text-center py-12">
                                <p className="text-5xl mb-4">💡</p>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Ingresa tu ingreso mensual para obtener una sugerencia de presupuesto personalizada
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
