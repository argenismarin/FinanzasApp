'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: {
        icon: 'text-3xl',
        title: 'text-base',
        description: 'text-sm',
        padding: 'py-6',
    },
    md: {
        icon: 'text-4xl sm:text-5xl',
        title: 'text-lg sm:text-xl',
        description: 'text-sm sm:text-base',
        padding: 'py-8 sm:py-12',
    },
    lg: {
        icon: 'text-5xl sm:text-6xl',
        title: 'text-xl sm:text-2xl',
        description: 'text-base',
        padding: 'py-12 sm:py-16',
    },
};

export function EmptyState({
    icon = '📭',
    title,
    description,
    action,
    size = 'md'
}: EmptyStateProps) {
    const classes = sizeClasses[size];

    return (
        <div className={`text-center ${classes.padding}`}>
            <div className={`${classes.icon} mb-4`} role="img" aria-hidden="true">
                {icon}
            </div>
            <h3 className={`${classes.title} font-bold text-gray-900 dark:text-white mb-2`}>
                {title}
            </h3>
            {description && (
                <p className={`${classes.description} text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto`}>
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
}

// Preset empty states for common use cases
export function NoTransactionsEmpty({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon="📝"
            title="No hay transacciones"
            description="Comienza agregando tu primera transaccion para llevar el control de tus finanzas"
            action={
                onAdd && (
                    <button
                        onClick={onAdd}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        + Nueva Transaccion
                    </button>
                )
            }
        />
    );
}

export function NoDebtsEmpty({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon="💳"
            title="No tienes deudas registradas"
            description="Registra tus deudas para llevar un mejor control de tus pagos"
            action={
                onAdd && (
                    <button
                        onClick={onAdd}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        + Nueva Deuda
                    </button>
                )
            }
        />
    );
}

export function NoBudgetsEmpty({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon="📊"
            title="Sin presupuestos"
            description="Crea presupuestos para controlar tus gastos por categoria"
            action={
                onAdd && (
                    <button
                        onClick={onAdd}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        + Nuevo Presupuesto
                    </button>
                )
            }
        />
    );
}

export function NoSavingsEmpty({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon="🏦"
            title="No tienes ahorros registrados"
            description="Crea cajitas o bolsillos para guardar tu dinero"
            action={
                onAdd && (
                    <button
                        onClick={onAdd}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        + Nuevo Ahorro
                    </button>
                )
            }
        />
    );
}
