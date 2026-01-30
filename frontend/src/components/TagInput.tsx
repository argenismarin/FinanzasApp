'use client';

import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
}

const SUGGESTED_TAGS = [
    'trabajo',
    'personal',
    'emergencia',
    'vacaciones',
    'familia',
    'salud',
    'educacion',
    'entretenimiento',
    'hogar',
    'transporte',
    'ahorro',
    'inversion',
    'deuda',
    'regalo',
    'suscripcion',
    'mensual',
    'anual',
    'unico'
];

export default function TagInput({ tags, onChange, placeholder = 'Agregar etiqueta...', suggestions = SUGGESTED_TAGS }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const addTag = (tag: string) => {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag && !tags.includes(normalizedTag)) {
            onChange([...tags, normalizedTag]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const filteredSuggestions = suggestions.filter(
        s => s.includes(inputValue.toLowerCase()) && !tags.includes(s)
    );

    return (
        <div className="relative">
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                            #{tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:text-blue-900"
                                aria-label={`Eliminar etiqueta ${tag}`}
                            >
                                x
                            </button>
                        </span>
                    ))}
                </div>

                {/* Input */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="w-full outline-none text-sm"
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.slice(0, 8).map(suggestion => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                        >
                            #{suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Quick Suggestions */}
            {tags.length === 0 && !inputValue && (
                <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500">Sugerencias:</span>
                    {suggestions.slice(0, 6).map(suggestion => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"
                        >
                            +{suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
