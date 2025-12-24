'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

export default function ReceiptsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [ocrData, setOcrData] = useState<any>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

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

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('receipt', selectedFile);

            const response = await fetch('http://localhost:3001/api/receipts/upload', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setOcrData(data.extractedData);
            alert('¡Factura procesada con éxito!');
        } catch (error) {
            alert('Error al procesar la factura');
        } finally {
            setUploading(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                < div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" ></div >
            </div >
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
                        {/* Upload Section */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Subir Factura
                            </h2>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    {preview ? (
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="max-h-64 mx-auto rounded-lg"
                                        />
                                    ) : (
                                        <div>
                                            <div className="text-6xl mb-4">📄</div>
                                            <p className="text-gray-600">
                                                Selecciona una imagen de tu factura
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="w-full"
                                />

                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? 'Procesando...' : '🔍 Analizar con IA'}
                                </button>
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
                                            {formatCOP(ocrData.amount || 0)}
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
                                            <ul className="list-disc list-inside text-sm text-gray-600">
                                                {ocrData.items.map((item: string, i: number) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Link
                                        href="/transactions/new"
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
                            <li>1. Toma una foto clara de tu factura</li>
                            <li>2. Sube la imagen y espera el análisis</li>
                            <li>3. Revisa los datos extraídos automáticamente</li>
                            <li>4. Crea la transacción con un click</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
