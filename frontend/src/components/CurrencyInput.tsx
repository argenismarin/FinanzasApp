'use client';

import { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    /** Si true, permite valor 0 (default false para retrocompatibilidad) */
    allowZero?: boolean;
}

// Convierte cualquier value (string/number/empty) a string numérico limpio o ''
function toRawDigits(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number') {
        if (isNaN(value)) return '';
        return Math.trunc(Math.abs(value)).toString();
    }
    return value.replace(/[^\d]/g, '');
}

// Formatea string de dígitos a "1.234.567" (es-CO)
function formatDigits(digits: string): string {
    if (digits === '') return '';
    const num = parseInt(digits, 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('es-CO');
}

export default function CurrencyInput({
    value,
    onChange,
    placeholder = 'Ingrese monto',
    className = '',
    disabled = false,
    autoFocus = false,
    allowZero = false
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        const digits = toRawDigits(value);
        if (digits === '' || (digits === '0' && !allowZero)) {
            setDisplayValue('');
        } else {
            setDisplayValue(formatDigits(digits));
        }
    }, [value, allowZero]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^\d]/g, '');

        if (numericValue === '') {
            setDisplayValue('');
            onChange('');
            return;
        }

        setDisplayValue(formatDigits(numericValue));
        onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };

    // Cantidad numérica para el preview de formato COP
    const numericForPreview = displayValue === '' ? null : parseInt(displayValue.replace(/\./g, ''), 10);
    const showPreview = numericForPreview !== null && !isNaN(numericForPreview);

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold text-lg">
                $
            </span>
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px] sm:min-h-0 ${className}`}
            />
            {showPreview && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(numericForPreview)}
                </div>
            )}
        </div>
    );
}

// Versión más simple para inputs pequeños
export function SimpleCurrencyInput({
    value,
    onChange,
    placeholder = '$0',
    className = '',
    allowZero = false
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        const digits = toRawDigits(value);
        if (digits === '' || (digits === '0' && !allowZero)) {
            setDisplayValue('');
        } else {
            setDisplayValue(formatDigits(digits));
        }
    }, [value, allowZero]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^\d]/g, '');

        if (numericValue === '') {
            setDisplayValue('');
            onChange('');
            return;
        }

        setDisplayValue(formatDigits(numericValue));
        onChange(numericValue);
    };

    return (
        <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full pl-6 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${className}`}
            />
        </div>
    );
}

