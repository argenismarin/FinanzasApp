'use client';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'red' | 'gray';
    fullScreen?: boolean;
    message?: string;
}

const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-4',
};

const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    gray: 'border-gray-600',
};

export function LoadingSpinner({
    size = 'md',
    color = 'blue',
    fullScreen = false,
    message
}: LoadingSpinnerProps) {
    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
                role="status"
                aria-label="Cargando"
            />
            {message && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                {spinner}
            </div>
        );
    }

    return spinner;
}

export function LoadingPage({ message = 'Cargando...' }: { message?: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <LoadingSpinner size="lg" message={message} />
        </div>
    );
}

export function LoadingCard() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
    );
}
