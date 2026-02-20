'use client';

import { formatCOP } from '@/lib/utils';

interface ForecastData {
    currentMonth: {
        spent: number;
        avgDaily: number;
        projected: number;
        daysElapsed: number;
        daysRemaining: number;
        daysInMonth: number;
    };
    historical: {
        weightedAvg: number;
        months: { month: string; total: number }[];
    };
    comparison: {
        pctDiff: number;
        isAboveAvg: boolean;
    };
    categoryForecasts: {
        name: string;
        icon: string;
        spent: number;
        projected: number;
        historicalAvg: number;
        trend: number;
    }[];
}

export default function ForecastWidget({ data }: { data: ForecastData }) {
    const { currentMonth, historical, comparison, categoryForecasts } = data;
    const progressPct = (currentMonth.daysElapsed / currentMonth.daysInMonth) * 100;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                🔮 Pronostico de Gastos
            </h2>

            {/* Month progress bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Dia {currentMonth.daysElapsed}</span>
                    <span>{currentMonth.daysRemaining} dias restantes</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Gastado</p>
                    <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{formatCOP(currentMonth.spent)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Proyectado</p>
                    <p className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">{formatCOP(currentMonth.projected)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Promedio</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">{formatCOP(historical.weightedAvg)}</p>
                </div>
            </div>

            {/* Comparison indicator */}
            <div className={`rounded-lg p-3 mb-4 ${
                comparison.isAboveAvg
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            }`}>
                <p className={`text-sm font-medium ${
                    comparison.isAboveAvg ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                    {comparison.isAboveAvg ? '↑' : '↓'} {Math.abs(comparison.pctDiff)}% {comparison.isAboveAvg ? 'sobre' : 'debajo de'} tu promedio
                </p>
            </div>

            {/* Top 3 categories */}
            {categoryForecasts.length > 0 && (
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top categorias</p>
                    <div className="space-y-2">
                        {categoryForecasts.slice(0, 3).map((cat, i) => (
                            <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <span>{cat.icon}</span>
                                    <span className="text-gray-900 dark:text-white">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCOP(cat.spent)}</span>
                                    <span className={`text-[10px] sm:text-xs ${(cat.trend || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {(cat.trend || 0) > 0 ? '↑' : '↓'}{Math.abs(cat.trend || 0)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
