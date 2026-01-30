'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={() => this.setState({ hasError: false, error: null })}
                />
            );
        }

        return this.props.children;
    }
}

interface ErrorFallbackProps {
    error?: Error | null;
    onRetry?: () => void;
    title?: string;
    description?: string;
}

export function ErrorFallback({
    error,
    onRetry,
    title = 'Algo salio mal',
    description = 'Hubo un error inesperado. Por favor intenta de nuevo.'
}: ErrorFallbackProps) {
    return (
        <div className="min-h-[300px] flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="text-5xl mb-4" role="img" aria-hidden="true">
                    😵
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {description}
                </p>
                {error && process.env.NODE_ENV === 'development' && (
                    <details className="text-left bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 text-sm">
                        <summary className="cursor-pointer text-red-700 dark:text-red-400 font-medium">
                            Detalles del error
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 dark:text-red-300 overflow-auto">
                            {error.message}
                            {error.stack && `\n\n${error.stack}`}
                        </pre>
                    </details>
                )}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        Intentar de nuevo
                    </button>
                )}
            </div>
        </div>
    );
}

// Simple error message component for inline errors
interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <p className="text-red-700 dark:text-red-300 text-sm">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                >
                    Reintentar
                </button>
            )}
        </div>
    );
}
