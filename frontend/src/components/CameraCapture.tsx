'use client';

import { useState, useRef, useEffect } from 'react';

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Usar cámara trasera en móviles
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsCameraReady(true);
                };
            }

            setStream(mediaStream);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data as base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
    };

    const confirmPhoto = () => {
        if (capturedImage) {
            // Extract base64 data without the data:image/jpeg;base64, prefix
            const base64Data = capturedImage.split(',')[1];
            onCapture(base64Data);
            stopCamera();
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center shadow-lg">
                <div>
                    <h2 className="text-white font-bold text-lg">📸 Capturar Factura</h2>
                    {!capturedImage && isCameraReady && (
                        <p className="text-white/80 text-xs mt-0.5">Posiciona y presiona el botón para capturar</p>
                    )}
                </div>
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    className="text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition"
                >
                    ✕ Cerrar
                </button>
            </div>

            {/* Camera/Preview Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
                {error ? (
                    <div className="text-center p-6">
                        <span className="text-6xl mb-4 block">📷</span>
                        <p className="text-white text-lg mb-4">{error}</p>
                        <button
                            onClick={startCamera}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Intentar de Nuevo
                        </button>
                    </div>
                ) : capturedImage ? (
                    // Show captured image
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                ) : (
                    // Show live camera feed
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay guide */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="border-4 border-white/50 rounded-lg w-11/12 max-w-md aspect-[3/4] shadow-2xl">
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                                        Centra la factura en este recuadro
                                    </p>
                                </div>
                            </div>
                            
                            {/* Floating Capture Button */}
                            {isCameraReady && (
                                <button
                                    onClick={capturePhoto}
                                    className="pointer-events-auto mt-8 bg-white hover:bg-gray-100 text-indigo-600 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl border-4 border-white transform hover:scale-110 transition-all duration-200 animate-pulse"
                                    title="Tomar Foto"
                                >
                                    <span className="text-4xl">📸</span>
                                </button>
                            )}
                        </div>

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                                    <p className="text-white">Iniciando cámara...</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                {capturedImage ? (
                    <div className="flex gap-4 max-w-md mx-auto">
                        <button
                            onClick={retakePhoto}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold text-lg transition"
                        >
                            🔄 Tomar de Nuevo
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg"
                        >
                            ✓ Usar Esta Foto
                        </button>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto space-y-3">
                        <button
                            onClick={capturePhoto}
                            disabled={!isCameraReady}
                            className="w-full bg-white hover:bg-gray-100 text-indigo-600 py-6 rounded-2xl font-bold text-2xl transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
                        >
                            <span className="text-4xl">📸</span>
                            <span>TOMAR FOTO</span>
                        </button>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <p className="text-white text-center text-sm">
                                💡 <strong>Toca el botón</strong> cuando la factura esté centrada y bien iluminada
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

