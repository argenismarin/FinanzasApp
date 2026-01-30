'use client';

import { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
}

export default function CurrencyInput({
    value,
    onChange,
    placeholder = 'Ingrese monto',
    className = '',
    disabled = false,
    autoFocus = false
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Convertir el valor numérico a formato con separadores
        if (value) {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) : value;
            if (!isNaN(numericValue) && numericValue > 0) {
                setDisplayValue(numericValue.toLocaleString('es-CO'));
            } else {
                setDisplayValue('');
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        
        // Remover todo excepto números
        const numericValue = inputValue.replace(/[^\d]/g, '');
        
        if (numericValue === '') {
            setDisplayValue('');
            onChange('');
            return;
        }

        // Formatear con separadores de miles
        const formatted = parseInt(numericValue).toLocaleString('es-CO');
        setDisplayValue(formatted);
        
        // Pasar el valor numérico sin formato al parent
        onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        // Seleccionar todo al hacer focus
        e.target.select();
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold text-lg">
                $
            </span>
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[48px] sm:min-h-0 ${className}`}
            />
            {displayValue && (
                <div className="mt-1 text-xs text-gray-500 text-right">
                    {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(parseInt(displayValue.replace(/\./g, '')))}
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
    className = ''
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value) {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) : value;
            if (!isNaN(numericValue) && numericValue > 0) {
                setDisplayValue(numericValue.toLocaleString('es-CO'));
            } else {
                setDisplayValue('');
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const numericValue = inputValue.replace(/[^\d]/g, '');
        
        if (numericValue === '') {
            setDisplayValue('');
            onChange('');
            return;
        }

        const formatted = parseInt(numericValue).toLocaleString('es-CO');
        setDisplayValue(formatted);
        onChange(numericValue);
    };

    return (
        <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg ${className}`}
            />
        </div>
    );
}

