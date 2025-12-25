'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        return () => {
            // Cleanup camera stream on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setShowCamera(true);
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setSelectedFile(file);
                        setPreview(canvas.toDataURL('image/jpeg'));
                        stopCamera();
                    }
                }, 'image/jpeg', 0.95);
            }
        }
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
                                    {showCamera ? (
                                        <div className="w-full h-full bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-auto"
                                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                                            />
                                            <div className="p-4 flex gap-2">
                                                <button
                                                    onClick={capturePhoto}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                                >
                                                    📷 Capturar Foto
                                                </button>
                                                <button
                                                    onClick={stopCamera}
                                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                                >
                                                    ❌ Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : preview ? (
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

                                {!showCamera && !preview && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={startCamera}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                        >
                                            📷 Abrir Cámara
                                        </button>
                                        <label className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer text-center">
                                            📁 Subir Archivo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}

                                {preview && !showCamera && (
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

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
