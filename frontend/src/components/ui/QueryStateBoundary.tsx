'use client';

import { ReactNode } from 'react';

interface QueryLike<T> {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
}

interface QueryStateBoundaryProps<T> {
    query: QueryLike<T>;
    children: (data: T) => ReactNode;
    /** Render cuando data es array vacío o falsy. Default: prompt amigable */
    emptyState?: ReactNode;
    /** Detectar "vacío" customizado (ej. data.items.length === 0) */
    isEmpty?: (data: T) => boolean;
    loadingLabel?: string;
}

/**
 * Maneja loading/error/empty/data uniformemente para React Query.
 * Reemplaza el patrón repetido de `if (isLoading) ... else if (data && data.length > 0) ...`
 * que olvida `isError` en la mayoría de páginas.
 *
 * Uso:
 * ```tsx
 * const goals = useQuery({ queryKey: ['goals'], queryFn: api.getGoals });
 * <QueryStateBoundary query={goals}>
 *   {(data) => <GoalsList goals={data} />}
 * </QueryStateBoundary>
 * ```
 */
export function QueryStateBoundary<T>({
    query,
    children,
    emptyState,
    isEmpty,
    loadingLabel = 'Cargando...'
}: QueryStateBoundaryProps<T>) {
    if (query.isLoading) {
        return (
            <div className="text-center py-12">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
                    role="status"
                    aria-label={loadingLabel}
                />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</p>
            </div>
        );
    }

    if (query.isError) {
        const message = (query.error as any)?.message || 'No se pudo cargar la información';
        return (
            <div className="text-center py-12">
                <div className="inline-flex flex-col items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 max-w-md mx-auto">
                    <span className="text-3xl">⚠️</span>
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                        Error al cargar
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
                    <button
                        onClick={() => query.refetch()}
                        className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const data = query.data;
    if (data === undefined || data === null) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No hay datos disponibles
            </div>
        );
    }

    const empty = isEmpty
        ? isEmpty(data)
        : Array.isArray(data) && data.length === 0;

    if (empty) {
        return (
            <>
                {emptyState ?? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No hay registros para mostrar
                    </div>
                )}
            </>
        );
    }

    return <>{children(data)}</>;
}
