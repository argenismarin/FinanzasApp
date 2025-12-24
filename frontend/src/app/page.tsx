export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">
                        💰 FinanzasApp
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Gestión inteligente de tus finanzas personales
                    </p>

                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <FeatureCard
                                icon="📊"
                                title="Analítica Avanzada"
                                description="Visualiza tus gastos e ingresos con gráficos interactivos"
                            />
                            <FeatureCard
                                icon="📸"
                                title="OCR de Facturas"
                                description="Escanea facturas y extrae datos automáticamente"
                            />
                            <FeatureCard
                                icon="☁️"
                                title="Sync SharePoint"
                                description="Sincronización automática con Excel en la nube"
                            />
                            <FeatureCard
                                icon="✅"
                                title="Checklist Mensual"
                                description="Nunca olvides un pago con recordatorios"
                            />
                        </div>

                        <div className="space-y-4">
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                                🚀 Comenzar
                            </button>
                            <p className="text-sm text-gray-500">
                                Versión 1.0.0 - En desarrollo
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    );
}
