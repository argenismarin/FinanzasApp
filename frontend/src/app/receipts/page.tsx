'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import CameraCapture from '@/components/CameraCapture';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';

interface OcrData {
    amount: number;
    date: string;
    merchant?: string;
    category?: string;
    items?: Array<{
        name: string;
        quantity?: number;
        price?: number;
    }>;
    confidence: number;
}

interface Category {
    id: string;
    name: string;
    type: string;
    icon: string;
}

export default function ReceiptsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [preview, setPreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [ocrData, setOcrData] = useState<OcrData | null>(null);
    const [receiptId, setReceiptId] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [creatingTransaction, setCreatingTransaction] = useState(false);

    // Editable form fields
    const [editAmount, setEditAmount] = useState<string>('');
    const [editDate, setEditDate] = useState<string>('');
    const [editDescription, setEditDescription] = useState<string>('');
    const [editCategoryId, setEditCategoryId] = useState<string>('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Load categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await api.get('/categories');
                const expenseCategories = response.data.filter((c: Category) => c.type === 'EXPENSE');
                setCategories(expenseCategories);
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        if (isAuthenticated) {
            loadCategories();
        }
    }, [isAuthenticated]);

    // Update form when OCR data changes
    useEffect(() => {
        if (ocrData) {
            setEditAmount(ocrData.amount?.toString() || '');
            setEditDate(ocrData.date || new Date().toISOString().split('T')[0]);
            setEditDescription(ocrData.merchant || '');

            // Try to match suggested category
            if (ocrData.category && categories.length > 0) {
                const matchedCategory = categories.find(c =>
                    c.name.toLowerCase().includes(ocrData.category!.toLowerCase()) ||
                    ocrData.category!.toLowerCase().includes(c.name.toLowerCase())
                );
                if (matchedCategory) {
                    setEditCategoryId(matchedCategory.id);
                }
            }
        }
    }, [ocrData, categories]);

    const handleCameraCapture = (base64Data: string) => {
        setPreview(`data:image/jpeg;base64,${base64Data}`);
        setShowCamera(false);
        setOcrData(null);
        setReceiptId(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setOcrData(null);
                setReceiptId(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProcessOCR = async () => {
        if (!preview) return;

        setProcessing(true);
        setOcrData(null);

        try {
            // Send base64 image directly to backend
            const response = await api.post('/receipts/upload', {
                imageBase64: preview
            });

            const data = response.data;
            setReceiptId(data.id);

            if (data.ocrError) {
                showToast(`OCR parcial: ${data.ocrError}`, 'warning');
            } else if (data.ocrData) {
                setOcrData(data.ocrData);
                showToast('Factura procesada con IA', 'success');
            }
        } catch (error: any) {
            console.error('Error:', error);
            showToast(error.response?.data?.error || 'Error al procesar factura', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateTransaction = async () => {
        if (!receiptId || !editAmount || !editCategoryId) {
            showToast('Completa monto y categoria', 'error');
            return;
        }

        setCreatingTransaction(true);

        try {
            await api.post(`/receipts/${receiptId}/create-transaction`, {
                amount: parseFloat(editAmount),
                description: editDescription,
                date: editDate,
                categoryId: editCategoryId
            });

            showToast('Transaccion creada exitosamente', 'success');

            // Reset form
            setPreview(null);
            setOcrData(null);
            setReceiptId(null);
            setEditAmount('');
            setEditDate('');
            setEditDescription('');
            setEditCategoryId('');

            // Optionally redirect to transactions
            router.push('/transactions');
        } catch (error: any) {
            console.error('Error:', error);
            showToast(error.response?.data?.error || 'Error al crear transaccion', 'error');
        } finally {
            setCreatingTransaction(false);
        }
    };

    const resetForm = () => {
        setPreview(null);
        setOcrData(null);
        setReceiptId(null);
        setEditAmount('');
        setEditDate('');
        setEditDescription('');
        setEditCategoryId('');
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Camera Capture Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}

            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900 dark:text-white">
                        ← Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                        Escanear Factura con OCR
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Upload/Camera Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Capturar Factura
                            </h2>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                                    {preview ? (
                                        <div className="w-full p-4 flex flex-col items-center">
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="max-h-80 rounded-lg"
                                            />
                                            <button
                                                onClick={resetForm}
                                                className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
                                                aria-label="Eliminar imagen"
                                            >
                                                Eliminar y tomar otra foto
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center py-16">
                                            <div className="text-center">
                                                <div className="text-6xl mb-4">📄</div>
                                                <p className="text-gray-600 dark:text-gray-400 text-lg">
                                                    Toma una foto o sube una imagen
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!preview && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setShowCamera(true)}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            aria-label="Abrir camara"
                                        >
                                            <span className="text-2xl">📷</span>
                                            <span>Abrir Camara</span>
                                        </button>
                                        <label className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all cursor-pointer text-center shadow-lg flex items-center justify-center gap-2">
                                            <span className="text-2xl">📁</span>
                                            <span>Subir Archivo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}

                                {preview && !ocrData && (
                                    <button
                                        onClick={handleProcessOCR}
                                        disabled={processing}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Analizar con OpenAI"
                                    >
                                        {processing ? 'Procesando con IA...' : 'Analizar con OpenAI'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* OCR Results & Editable Form */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                {ocrData ? 'Datos Extraidos' : 'Esperando Imagen'}
                            </h2>

                            {ocrData ? (
                                <div className="space-y-4">
                                    {/* Confidence indicator */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Confianza:</span>
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    ocrData.confidence >= 80 ? 'bg-green-500' :
                                                    ocrData.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${ocrData.confidence}%` }}
                                            />
                                        </div>
                                        <span className="font-medium">{ocrData.confidence}%</span>
                                    </div>

                                    {/* Editable Amount */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Monto *
                                        </label>
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="0"
                                        />
                                        {editAmount && (
                                            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                                {formatCOP(parseFloat(editAmount))}
                                            </p>
                                        )}
                                    </div>

                                    {/* Editable Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Fecha *
                                        </label>
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Editable Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Descripcion / Comercio
                                        </label>
                                        <input
                                            type="text"
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Nombre del comercio"
                                        />
                                    </div>

                                    {/* Category Select */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Categoria *
                                        </label>
                                        <select
                                            value={editCategoryId}
                                            onChange={(e) => setEditCategoryId(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="">Seleccionar categoria</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.icon} {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                        {ocrData.category && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Sugerida por IA: {ocrData.category}
                                            </p>
                                        )}
                                    </div>

                                    {/* Items if available */}
                                    {ocrData.items && ocrData.items.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Items detectados
                                            </label>
                                            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                                {ocrData.items.map((item, i) => (
                                                    <li key={i}>
                                                        {item.name} {item.quantity ? `x${item.quantity}` : ''} {item.price ? `- $${item.price}` : ''}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Create Transaction Button */}
                                    <button
                                        onClick={handleCreateTransaction}
                                        disabled={creatingTransaction || !editAmount || !editCategoryId}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Crear transaccion"
                                    >
                                        {creatingTransaction ? 'Creando...' : 'Crear Transaccion'}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p className="text-4xl mb-4">🤖</p>
                                    <p>Sube una factura para ver los datos extraidos</p>
                                    <p className="text-sm mt-2">Powered by OpenAI Vision API</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Como funciona
                        </h3>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>1. Toma una foto con la camara o sube una imagen guardada</li>
                            <li>2. La IA de OpenAI analizara la factura automaticamente</li>
                            <li>3. Revisa y edita los datos extraidos (monto, fecha, comercio)</li>
                            <li>4. Selecciona la categoria y crea la transaccion</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
