'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';

type ImportRow = {
    type: string;
    amount: number | string;
    categoryId: string;
    description: string;
    date: string;
    status: 'valid' | 'warning' | 'error';
    error?: string;
    originalCategory?: string;
    suggestedCategory?: any;
};

const STANDARD_COLUMNS: { [key: string]: string[] } = {
    date: ['fecha', 'date', 'dia', 'day'],
    type: ['tipo', 'type'],
    amount: ['monto', 'amount', 'valor', 'value', 'total'],
    category: ['categoria', 'category', 'categoría'],
    description: ['descripcion', 'description', 'concepto', 'detalle', 'descripción'],
};

export default function ImportTransactionsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({
        date: '', type: '', amount: '', category: '', description: ''
    });
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated,
    });

    const handleFileUpload = useCallback((file: File) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            if (jsonData.length < 2) {
                showToast('El archivo no tiene datos suficientes', 'error');
                return;
            }

            const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
            setHeaders(fileHeaders);

            const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            setRawData(dataRows);

            // Auto-detect column mapping
            const mapping: { [key: string]: string } = { date: '', type: '', amount: '', category: '', description: '' };
            fileHeaders.forEach((header) => {
                const headerLower = header.toLowerCase().trim();
                for (const [field, aliases] of Object.entries(STANDARD_COLUMNS)) {
                    if (aliases.includes(headerLower) && !mapping[field]) {
                        mapping[field] = header;
                    }
                }
            });
            setColumnMapping(mapping);
            setStep(2);
        };
        reader.readAsBinaryString(file);
    }, [showToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const processRows = async () => {
        if (!categories) return;

        const categoryMap = new Map<string, any>();
        categories.forEach((cat: any) => {
            categoryMap.set(cat.name.toLowerCase(), cat);
        });

        const processed: ImportRow[] = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const getRawCol = (field: string) => {
                const colName = columnMapping[field];
                if (!colName) return undefined;
                const idx = headers.indexOf(colName);
                return idx >= 0 ? row[idx] : undefined;
            };
            const getCol = (field: string) => {
                const raw = getRawCol(field);
                return raw != null ? String(raw).trim() : '';
            };

            const rawDateValue = getRawCol('date');
            const rawDate = getCol('date');
            const rawType = getCol('type');
            const rawAmount = getCol('amount');
            const rawCategory = getCol('category');
            const rawDescription = getCol('description');

            // Parse type
            let type = 'EXPENSE';
            const typeLower = rawType.toLowerCase();
            if (['ingreso', 'income', 'entrada'].includes(typeLower)) {
                type = 'INCOME';
            }

            // Parse amount
            let amount: number | string = parseFloat(String(rawAmount).replace(/[^\d.-]/g, ''));
            if (isNaN(amount) || amount <= 0) {
                processed.push({
                    type, amount: rawAmount, categoryId: '', description: rawDescription || `Fila ${i + 1}`,
                    date: rawDate, status: 'error', error: 'Monto invalido', originalCategory: rawCategory
                });
                continue;
            }

            // Parse date
            let dateStr = '';
            if (rawDate) {
                // Handle Excel serial date numbers
                if (typeof rawDateValue === 'number') {
                    const utcDays = Math.floor(rawDateValue - 25569);
                    const dateObj = new Date(utcDays * 86400 * 1000);
                    if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj.toISOString().split('T')[0];
                    }
                } else {
                    // Try common date formats
                    const dateObj = new Date(rawDate);
                    if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj.toISOString().split('T')[0];
                    } else {
                        // Try DD/MM/YYYY or DD-MM-YYYY
                        const parts = rawDate.split(/[/\-\.]/);
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            const testDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                            if (!isNaN(testDate.getTime())) {
                                dateStr = testDate.toISOString().split('T')[0];
                            }
                        }
                    }
                }
            }
            if (!dateStr) {
                processed.push({
                    type, amount, categoryId: '', description: rawDescription || `Fila ${i + 1}`,
                    date: rawDate, status: 'error', error: 'Fecha invalida', originalCategory: rawCategory
                });
                continue;
            }

            // Match category by name
            let categoryId = '';
            let status: 'valid' | 'warning' = 'valid';
            const catMatch = rawCategory ? categoryMap.get(rawCategory.toLowerCase()) : null;

            if (catMatch) {
                categoryId = catMatch.id;
            } else {
                status = 'warning';
            }

            processed.push({
                type, amount, categoryId, description: rawDescription || `Fila ${i + 1}`,
                date: dateStr, status, originalCategory: rawCategory
            });
        }

        // Batch auto-categorization for rows without a category match
        const needsSuggestion = processed
            .map((row, i) => ({ row, i }))
            .filter(({ row }) => row.status === 'warning' && !row.categoryId);

        const batchSize = 10;
        for (let b = 0; b < needsSuggestion.length; b += batchSize) {
            const batch = needsSuggestion.slice(b, b + batchSize);
            const results = await Promise.allSettled(
                batch.map(({ row }) => api.suggestCategory(row.description || row.originalCategory || '', row.type))
            );
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled' && result.value.suggestion) {
                    const { i } = batch[idx];
                    processed[i].categoryId = result.value.suggestion.categoryId;
                    processed[i].status = 'valid';
                    processed[i].suggestedCategory = result.value.suggestion.category;
                }
            });
        }

        setRows(processed);
        setStep(3);
    };

    const handleImport = async () => {
        const validRows = rows.filter(r => r.status !== 'error' && r.categoryId);
        if (validRows.length === 0) {
            showToast('No hay filas validas para importar', 'warning');
            return;
        }

        setImporting(true);
        try {
            const transactions = validRows.map(r => ({
                type: r.type,
                amount: Number(r.amount),
                categoryId: r.categoryId,
                description: r.description,
                date: r.date,
            }));
            const res = await api.bulkCreateTransactions(transactions);
            setResult(res);
            setStep(4);
            showToast(`${res.created} transacciones importadas`, 'success');
        } catch (error) {
            showToast('Error al importar transacciones', 'error');
        } finally {
            setImporting(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const validCount = rows.filter(r => r.status === 'valid' && r.categoryId).length;
    const warningCount = rows.filter(r => r.status === 'warning' || (r.status === 'valid' && !r.categoryId)).length;
    const errorCount = rows.filter(r => r.status === 'error').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/transactions" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Importar Transacciones
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📤 Subir Archivo</h2>
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition cursor-pointer"
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <p className="text-5xl mb-4">📂</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Arrastra tu archivo aqui
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                o haz click para seleccionar
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Formatos aceptados: .csv, .xlsx, .xls
                            </p>
                            <input
                                id="file-input"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 2 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🔗 Mapeo de Columnas</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Archivo: {fileName} ({rawData.length} filas detectadas)
                        </p>
                        <div className="space-y-4">
                            {(['date', 'type', 'amount', 'description', 'category'] as const).map((field) => (
                                <div key={field} className="flex items-center gap-4">
                                    <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                        {field === 'date' ? 'Fecha' : field === 'type' ? 'Tipo' : field === 'amount' ? 'Monto' : field === 'description' ? 'Descripcion' : 'Categoria'}
                                        {field !== 'category' && field !== 'type' && <span className="text-red-500"> *</span>}
                                    </label>
                                    <select
                                        value={columnMapping[field]}
                                        onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- No mapear --</option>
                                        {headers.map((h) => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    {columnMapping[field] && (
                                        <span className="text-green-500 text-lg">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-lg transition"
                            >
                                Atras
                            </button>
                            <button
                                onClick={processRows}
                                disabled={!columnMapping.date || !columnMapping.amount || !columnMapping.description}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview */}
                {step === 3 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">👁️ Vista Previa</h2>
                        <div className="flex gap-4 mb-6">
                            <span className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                ✓ {validCount} validas
                            </span>
                            <span className="text-sm px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                                ⚠ {warningCount} sin categoria
                            </span>
                            <span className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                ✕ {errorCount} errores
                            </span>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left">#</th>
                                        <th className="px-3 py-2 text-left">Estado</th>
                                        <th className="px-3 py-2 text-left">Tipo</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                        <th className="px-3 py-2 text-left">Descripcion</th>
                                        <th className="px-3 py-2 text-right">Monto</th>
                                        <th className="px-3 py-2 text-left">Categoria</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i} className={`border-b dark:border-gray-700 ${
                                            row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' :
                                            row.status === 'warning' || !row.categoryId ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                                        }`}>
                                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                                            <td className="px-3 py-2">
                                                {row.status === 'error' ? '🔴' : row.categoryId ? '🟢' : '🟡'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={row.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                                                    {row.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">{row.date}</td>
                                            <td className="px-3 py-2 max-w-[200px] truncate">{row.description}</td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                {typeof row.amount === 'number' ? formatCOP(row.amount) : row.amount}
                                            </td>
                                            <td className="px-3 py-2">
                                                {row.status === 'error' ? (
                                                    <span className="text-red-600 text-xs">{row.error}</span>
                                                ) : row.categoryId ? (
                                                    <span className="text-xs">
                                                        {row.suggestedCategory ? `🤖 ${row.suggestedCategory.icon} ${row.suggestedCategory.name}` :
                                                            categories?.find((c: any) => c.id === row.categoryId)?.name || 'OK'}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={row.categoryId}
                                                        onChange={(e) => {
                                                            const updated = [...rows];
                                                            updated[i] = { ...row, categoryId: e.target.value, status: e.target.value ? 'valid' : 'warning' };
                                                            setRows(updated);
                                                        }}
                                                        className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {categories?.filter((c: any) => c.type === row.type).map((c: any) => (
                                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-lg transition"
                            >
                                Atras
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || validCount === 0}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                            >
                                {importing ? 'Importando...' : `Importar ${validCount} transacciones`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Result */}
                {step === 4 && result && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                        <p className="text-5xl mb-4">✅</p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Importacion Completa</h2>
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                                <p className="text-3xl font-bold text-green-600">{result.created}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Creadas</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                                <p className="text-3xl font-bold text-red-600">{result.totalErrors}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Errores</p>
                            </div>
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <div className="text-left mb-6 max-w-md mx-auto">
                                <p className="font-medium text-gray-900 dark:text-white mb-2">Errores:</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {result.errors.map((err: any, i: number) => (
                                        <p key={i} className="text-sm text-red-600">
                                            Fila {err.row}: {err.error}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Link
                            href="/transactions"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
                        >
                            Ver Transacciones
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
