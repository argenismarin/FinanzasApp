'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

const MATCH_TYPES = [
    { value: 'CONTAINS', label: 'Contiene' },
    { value: 'STARTS_WITH', label: 'Empieza con' },
    { value: 'EXACT', label: 'Exacto' },
];

export default function CategorizationRulesPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [formData, setFormData] = useState({
        pattern: '',
        matchType: 'CONTAINS',
        categoryId: '',
        priority: 0,
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: rules, isLoading } = useQuery({
        queryKey: ['categorization-rules'],
        queryFn: () => api.getCategorizationRules(),
        enabled: isAuthenticated,
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
        enabled: isAuthenticated,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createCategorizationRule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
            setShowModal(false);
            resetForm();
            showToast('Regla creada exitosamente', 'success');
        },
        onError: () => showToast('Error al crear la regla', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateCategorizationRule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
            setShowModal(false);
            setEditingRule(null);
            resetForm();
            showToast('Regla actualizada', 'success');
        },
        onError: () => showToast('Error al actualizar la regla', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteCategorizationRule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
            showToast('Regla eliminada', 'success');
        },
        onError: () => showToast('Error al eliminar la regla', 'error'),
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            api.updateCategorizationRule(id, { isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
        },
    });

    const resetForm = () => {
        setFormData({ pattern: '', matchType: 'CONTAINS', categoryId: '', priority: 0 });
    };

    const openCreate = () => {
        setEditingRule(null);
        resetForm();
        setShowModal(true);
    };

    const openEdit = (rule: any) => {
        setEditingRule(rule);
        setFormData({
            pattern: rule.pattern,
            matchType: rule.matchType,
            categoryId: rule.categoryId,
            priority: rule.priority,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRule) {
            updateMutation.mutate({ id: editingRule.id, data: formData });
        } else {
            createMutation.mutate(formData);
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/transactions" className="text-2xl font-bold text-gray-900 dark:text-white">
                            ← Reglas de Categorizacion
                        </Link>
                        <button
                            onClick={openCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                            + Nueva Regla
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-200">Auto-categorizacion</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Define patrones para categorizar tus transacciones automaticamente. Al crear una nueva transaccion,
                                se sugerira la categoria basada en estas reglas.
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : rules && rules.length > 0 ? (
                        <div className="space-y-3">
                            {rules.map((rule: any) => (
                                <div
                                    key={rule.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition ${
                                        rule.isActive
                                            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <span className="text-2xl">{rule.category?.icon}</span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    &quot;{rule.pattern}&quot;
                                                </p>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                    {MATCH_TYPES.find(m => m.value === rule.matchType)?.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                → {rule.category?.name} · Prioridad: {rule.priority}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                                            className={`relative w-12 h-6 rounded-full transition ${
                                                rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                            aria-label={rule.isActive ? 'Desactivar regla' : 'Activar regla'}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                                    rule.isActive ? 'translate-x-6' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                        <button
                                            onClick={() => openEdit(rule)}
                                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                            aria-label="Editar regla"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Eliminar esta regla?')) {
                                                    deleteMutation.mutate(rule.id);
                                                }
                                            }}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                            aria-label="Eliminar regla"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p className="text-5xl mb-4">📋</p>
                            <p className="text-lg mb-2">No hay reglas creadas</p>
                            <p className="text-sm mb-4">Crea tu primera regla para categorizar automaticamente</p>
                            <button
                                onClick={openCreate}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                            >
                                + Crear Regla
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingRule ? '✏️ Editar Regla' : '➕ Nueva Regla'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Patron de texto
                                </label>
                                <input
                                    type="text"
                                    value={formData.pattern}
                                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder='Ej: "Rappi", "Uber", "Mercado"'
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de coincidencia
                                </label>
                                <select
                                    value={formData.matchType}
                                    onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {MATCH_TYPES.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Categoria destino
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Selecciona una categoria</option>
                                    {categories?.map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.icon} {cat.name} ({cat.type === 'INCOME' ? 'Ingreso' : 'Gasto'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Prioridad (menor = mas alta)
                                </label>
                                <input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    min="0"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditingRule(null); resetForm(); }}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
