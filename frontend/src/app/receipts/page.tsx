'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import CameraCapture from '@/components/CameraCapture';

export default function ReceiptsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [ocrData, setOcrData] = useState<any>(null);
    const [receiptId, setReceiptId] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleCameraCapture = (base64Data: string) => {
        // Convert base64 to blob and then to file
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/jpeg' });
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        setSelectedFile(file);
        setPreview(`data:image/jpeg;base64,${base64Data}`);
        setShowCamera(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadAndProcess = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setOcrData(null);

        try {
            // Step 1: Upload receipt
            const formData = new FormData();
            formData.append('receipt', selectedFile);

            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/receipts/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || 'Error al subir la factura');
            }

            const uploadData = await uploadResponse.json();
            setReceiptId(uploadData.id);

            // Step 2: Process with OCR
            setProcessing(true);
            const processResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/receipts/${uploadData.id}/process`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!processResponse.ok) {
                const errorData = await processResponse.json();
                throw new Error(errorData.details || errorData.error || 'Error al procesar con OCR');
            }

            const processData = await processResponse.json();
            setOcrData(processData.ocrData);
            alert('¡Factura procesada con éxito! ✅');

        } catch (error: any) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Camera Capture Modal - Full Screen */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}

            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                        ← Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        📸 Escanear Factura con OCR
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Upload/Camera Section */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Capturar Factura
                            </h2>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                                    {preview ? (
                                        <div className="w-full p-4 flex flex-col items-center">
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="max-h-80 rounded-lg"
                                            />
                                            <button
                                                onClick={() => { setPreview(null); setSelectedFile(null); setOcrData(null); }}
                                                className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
                                            >
                                                🗑️ Eliminar y tomar otra foto
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center py-16">
                                            <div className="text-center">
                                                <div className="text-6xl mb-4">📄</div>
                                                <p className="text-gray-600 text-lg">
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
                                        >
                                            <span className="text-2xl">📷</span>
                                            <span>Abrir Cámara</span>
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

                                {preview && (
                                    <button
                                        onClick={handleUploadAndProcess}
                                        disabled={!selectedFile || uploading || processing}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? '📤 Subiendo...' : processing ? '🤖 Procesando con IA...' : '🔍 Analizar con OpenAI'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* OCR Results */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Datos Extraídos
                            </h2>

                            {ocrData ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Monto
                                        </label>
                                        <p className="text-2xl font-bold text-green-600">
                                            ${ocrData.amount || 0} {ocrData.currency || 'COP'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha
                                        </label>
                                        <p className="text-lg">{ocrData.date || 'No detectada'}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Comercio
                                        </label>
                                        <p className="text-lg">{ocrData.merchant || 'No detectado'}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Categoría Sugerida
                                        </label>
                                        <p className="text-lg">{ocrData.category || 'No detectada'}</p>
                                    </div>

                                    {ocrData.items && ocrData.items.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Items
                                            </label>
                                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                {ocrData.items.map((item: any, i: number) => (
                                                    <li key={i}>
                                                        {item.description} x{item.quantity} - ${item.price}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Link
                                        href={`/transactions/new?amount=${ocrData.amount}&description=${ocrData.merchant || ''}&date=${ocrData.date || ''}`}
                                        className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
                                    >
                                        ✅ Crear Transacción
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-4xl mb-4">🤖</p>
                                    <p>Sube una factura para ver los datos extraídos</p>
                                    <p className="text-sm mt-2">Powered by OpenAI Vision API</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            💡 Cómo funciona
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>1. Toma una foto con la cámara o sube una imagen guardada</li>
                            <li>2. La IA de OpenAI analizará la factura automáticamente</li>
                            <li>3. Revisa los datos extraídos (monto, fecha, comercio, items)</li>
                            <li>4. Crea la transacción con un click</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
