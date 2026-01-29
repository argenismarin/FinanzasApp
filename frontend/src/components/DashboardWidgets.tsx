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
        income: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300',
        expense: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300',
        balance: current >= 0
            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
    };

    return (
        <div className={`rounded-xl sm:rounded-2xl border-2 p-3 sm:p-5 ${colors[type]}`}>
            <div className="flex justify-between items-start mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl md:text-3xl">{icon}</span>
                {change !== 0 && (
                    <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                        isPositive ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                    }`}>
                        {isPositive ? '↗' : '↙'} {Math.abs(change).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-xs sm:text-sm font-medium opacity-80 mb-1">{title}</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">{formatCOP(current)}</p>
            <p className="text-[10px] sm:text-xs opacity-70">
                Anterior: {formatCOP(previous)}
            </p>
        </div>
    );
}

// Widget de Top Categorías
export function TopCategoriesWidget({ categories }: { categories: any[] }) {
    if (!categories || categories.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">📊 Top Gastos del Mes</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No hay gastos este mes</p>
            </div>
        );
    }

    const maxTotal = Math.max(...categories.map((c: any) => c.total));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">📊 Top Gastos del Mes</h3>
            <div className="space-y-3 sm:space-y-4">
                {categories.map((cat: any, idx: number) => {
                    const percentage = (cat.total / maxTotal) * 100;
                    return (
                        <div key={idx}>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="text-base sm:text-xl">{cat.category.icon}</span>
                                    <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{cat.category.name}</span>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">{formatCOP(cat.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{cat.count} transacciones</p>
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
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-yellow-300 dark:border-yellow-700">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl sm:text-2xl">⚠️</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Alertas de Presupuesto</h3>
            </div>
            <div className="space-y-3">
                {alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border-l-4 border-orange-500">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-base sm:text-xl">{alert.category.icon}</span>
                                <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">{alert.category.name}</span>
                            </div>
                            <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                                alert.percentage >= 100 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                            }`}>
                                {alert.percentage}%
                            </span>
                        </div>
                        <div className="flex justify-between text-[10px] sm:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Gastado: {formatCOP(alert.spent)}</span>
                            <span className="text-gray-600 dark:text-gray-400">Limite: {formatCOP(alert.budget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
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
                className="mt-4 block text-center text-xs sm:text-sm text-orange-700 dark:text-orange-400 font-semibold hover:text-orange-800 dark:hover:text-orange-300"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl sm:text-2xl">🔔</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Proximos Pagos</h3>
            </div>
            <div className="space-y-3">
                {reminders.map((reminder: any) => {
                    const daysUntil = reminder.dueDay - today;
                    const isUrgent = daysUntil <= 2;

                    return (
                        <div
                            key={reminder.id}
                            className={`p-2 sm:p-3 rounded-lg border-l-4 ${
                                isUrgent
                                    ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
                                    : 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1 sm:gap-2 flex-1">
                                    <span className="text-base sm:text-xl">{reminder.category.icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">{reminder.name}</p>
                                        <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                                            Dia {reminder.dueDay} • {formatCOP(reminder.amount)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                                    isUrgent
                                        ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                }`}>
                                    {daysUntil === 0 ? 'HOY' : daysUntil === 1 ? 'Mañana' : `${daysUntil} dias`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <Link
                href="/reminders"
                className="mt-4 block text-center text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300"
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
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl sm:text-2xl">🎯</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Metas de Ahorro</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
                {goals.map((goal: any) => (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">{goal.name}</p>
                            <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">{goal.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3 mb-2">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 sm:h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatCOP(goal.current)}</span>
                            <span>{formatCOP(goal.target)}</span>
                        </div>
                        {goal.deadline && (
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">
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
                className="mt-4 block text-center text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">📈 Tendencia (6 meses)</h3>
                <Link
                    href="/analytics"
                    className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300"
                >
                    Ver analisis completo →
                </Link>
            </div>
            <div className="space-y-3 sm:space-y-4">
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
                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 w-14 sm:w-20">{monthName}</span>
                                <div className="flex-1 flex gap-1 sm:gap-2">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                                            <span className="text-green-600 dark:text-green-400">Ingreso</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{formatCOP(month.income)}</span>
                                        </div>
                                        <div className="w-full bg-green-100 dark:bg-green-900/50 rounded-full h-1.5 sm:h-2">
                                            <div
                                                className="bg-green-500 h-1.5 sm:h-2 rounded-full"
                                                style={{ width: `${incomePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                                            <span className="text-red-600 dark:text-red-400">Gasto</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{formatCOP(month.expense)}</span>
                                        </div>
                                        <div className="w-full bg-red-100 dark:bg-red-900/50 rounded-full h-1.5 sm:h-2">
                                            <div
                                                className="bg-red-500 h-1.5 sm:h-2 rounded-full"
                                                style={{ width: `${expensePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                                    month.balance >= 0
                                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                        : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
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

// Widget de Progreso del Checklist Mensual
export function ChecklistProgressWidget({ checklistProgress }: { checklistProgress: any }) {
    if (!checklistProgress || checklistProgress.total === 0) {
        return null;
    }

    const percentage = Math.round((checklistProgress.completed / checklistProgress.total) * 100);

    return (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-teal-200 dark:border-teal-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">✅</span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Checklist del Mes</h3>
                </div>
                <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                    percentage === 100
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                        : percentage >= 50
                            ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                }`}>
                    {checklistProgress.completed}/{checklistProgress.total}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Completados</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                    <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 sm:h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* Amount Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 mb-4">
                <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Pagado este mes:</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">{formatCOP(checklistProgress.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Total del mes:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCOP(checklistProgress.totalAmount)}</span>
                </div>
            </div>

            {/* Pending Items */}
            {checklistProgress.pendingItems && checklistProgress.pendingItems.length > 0 && (
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pendientes:</p>
                    <div className="space-y-2">
                        {checklistProgress.pendingItems.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span>{item.category?.icon || '📌'}</span>
                                    <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCOP(item.amount)}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 block">Dia {item.dueDay}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Link
                href="/checklist"
                className="mt-4 block text-center text-xs sm:text-sm text-teal-600 dark:text-teal-400 font-semibold hover:text-teal-700 dark:hover:text-teal-300"
            >
                Ir al Checklist →
            </Link>
        </div>
    );
}
