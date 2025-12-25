'use client';

import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

// Widget de Comparación con Mes Anterior
export function ComparisonWidget({ title, current, previous, icon, type }: {
    title: string;
    current: number;
    previous: number;
    icon: string;
    type: 'income' | 'expense' | 'balance';
}) {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const isPositive = type === 'income' ? change > 0 : change < 0;
    
    const colors = {
        income: 'bg-green-50 border-green-200 text-green-700',
        expense: 'bg-red-50 border-red-200 text-red-700',
        balance: current >= 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'
    };

    return (
        <div className={`rounded-xl border-2 p-5 ${colors[type]}`}>
            <div className="flex justify-between items-start mb-3">
                <span className="text-3xl">{icon}</span>
                {change !== 0 && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {isPositive ? '↗' : '↙'} {Math.abs(change).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
            <p className="text-2xl font-bold mb-2">{formatCOP(current)}</p>
            <p className="text-xs opacity-70">
                Anterior: {formatCOP(previous)}
            </p>
        </div>
    );
}

// Widget de Top Categorías
export function TopCategoriesWidget({ categories }: { categories: any[] }) {
    if (!categories || categories.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Top Gastos del Mes</h3>
                <p className="text-gray-500 text-center py-8">No hay gastos este mes</p>
            </div>
        );
    }

    const maxTotal = Math.max(...categories.map((c: any) => c.total));

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Top Gastos del Mes</h3>
            <div className="space-y-4">
                {categories.map((cat: any, idx: number) => {
                    const percentage = (cat.total / maxTotal) * 100;
                    return (
                        <div key={idx}>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{cat.category.icon}</span>
                                    <span className="font-medium text-gray-900">{cat.category.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCOP(cat.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{cat.count} transacciones</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Widget de Alertas de Presupuesto
export function BudgetAlertsWidget({ alerts }: { alerts: any[] }) {
    if (!alerts || alerts.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-yellow-300">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-bold text-gray-900">Alertas de Presupuesto</h3>
            </div>
            <div className="space-y-3">
                {alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-orange-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{alert.category.icon}</span>
                                <span className="font-semibold text-gray-900">{alert.category.name}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                alert.percentage >= 100 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {alert.percentage}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Gastado: {formatCOP(alert.spent)}</span>
                            <span className="text-gray-600">Límite: {formatCOP(alert.budget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    alert.percentage >= 100 ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <Link
                href="/budgets"
                className="mt-4 block text-center text-sm text-orange-700 font-semibold hover:text-orange-800"
            >
                Ver todos los presupuestos →
            </Link>
        </div>
    );
}

// Widget de Recordatorios Próximos
export function UpcomingRemindersWidget({ reminders }: { reminders: any[] }) {
    if (!reminders || reminders.length === 0) {
        return null;
    }

    const today = new Date().getDate();

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔔</span>
                <h3 className="text-lg font-bold text-gray-900">Próximos Pagos</h3>
            </div>
            <div className="space-y-3">
                {reminders.map((reminder: any) => {
                    const daysUntil = reminder.dueDay - today;
                    const isUrgent = daysUntil <= 2;
                    
                    return (
                        <div 
                            key={reminder.id} 
                            className={`p-3 rounded-lg border-l-4 ${
                                isUrgent 
                                    ? 'bg-red-50 border-red-500' 
                                    : 'bg-blue-50 border-blue-500'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-xl">{reminder.category.icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-900">{reminder.name}</p>
                                        <p className="text-sm text-gray-600">
                                            Día {reminder.dueDay} • {formatCOP(reminder.amount)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    isUrgent 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {daysUntil === 0 ? 'HOY' : daysUntil === 1 ? 'Mañana' : `${daysUntil} días`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <Link
                href="/reminders"
                className="mt-4 block text-center text-sm text-blue-600 font-semibold hover:text-blue-700"
            >
                Ver todos los recordatorios →
            </Link>
        </div>
    );
}

// Widget de Progreso de Metas
export function GoalsProgressWidget({ goals }: { goals: any[] }) {
    if (!goals || goals.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="text-lg font-bold text-gray-900">Metas de Ahorro</h3>
            </div>
            <div className="space-y-4">
                {goals.map((goal: any) => (
                    <div key={goal.id} className="bg-white rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold text-gray-900">{goal.name}</p>
                            <span className="text-sm font-bold text-purple-600">{goal.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div 
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>{formatCOP(goal.current)}</span>
                            <span>{formatCOP(goal.target)}</span>
                        </div>
                        {goal.deadline && (
                            <p className="text-xs text-gray-500 mt-2">
                                📅 {new Date(goal.deadline).toLocaleDateString('es-CO', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                })}
                            </p>
                        )}
                    </div>
                ))}
            </div>
            <Link
                href="/goals"
                className="mt-4 block text-center text-sm text-purple-600 font-semibold hover:text-purple-700"
            >
                Ver todas las metas →
            </Link>
        </div>
    );
}

// Widget de Tendencia de 6 Meses
export function TrendWidget({ trend }: { trend: any[] }) {
    if (!trend || trend.length === 0) {
        return null;
    }

    const maxAmount = Math.max(...trend.map(t => Math.max(t.income, t.expense)));

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">📈 Tendencia (6 meses)</h3>
                <Link
                    href="/analytics"
                    className="text-sm text-blue-600 font-semibold hover:text-blue-700"
                >
                    Ver análisis completo →
                </Link>
            </div>
            <div className="space-y-4">
                {trend.map((month: any, idx: number) => {
                    const monthName = new Date(month.month + '-01').toLocaleDateString('es-CO', { 
                        month: 'short', 
                        year: '2-digit' 
                    });
                    const incomePercent = (month.income / maxAmount) * 100;
                    const expensePercent = (month.expense / maxAmount) * 100;
                    
                    return (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 w-20">{monthName}</span>
                                <div className="flex-1 flex gap-2">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-green-600">Ingreso</span>
                                            <span className="font-semibold">{formatCOP(month.income)}</span>
                                        </div>
                                        <div className="w-full bg-green-100 rounded-full h-2">
                                            <div 
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${incomePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-red-600">Gasto</span>
                                            <span className="font-semibold">{formatCOP(month.expense)}</span>
                                        </div>
                                        <div className="w-full bg-red-100 rounded-full h-2">
                                            <div 
                                                className="bg-red-500 h-2 rounded-full"
                                                style={{ width: `${expensePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                    month.balance >= 0 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    Balance: {formatCOP(month.balance)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

