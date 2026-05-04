'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/Toast';
import { getTodayString } from '@/lib/utils';
import { api } from '@/lib/api';
import { extractErrorMessage } from '@/lib/errorMessages';

interface ExportMenuProps {
    type: 'transactions' | 'debts' | 'budgets' | 'monthly-report' | 'credit-cards' | 'transfers' | 'savings' | 'recurring' | 'checklist';
    filters?: any;
}

export default function ExportMenu({ type, filters }: ExportMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { showToast } = useToast();

    const buildQueryString = (): string => {
        const queryParams = new URLSearchParams();
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    queryParams.append(key, filters[key]);
                }
            });
        }
        const qs = queryParams.toString();
        return qs ? '?' + qs : '';
    };

    const exportToCSV = async () => {
        try {
            setIsExporting(true);

            const queryString = buildQueryString();
            const apiUrl = api.getApiUrl();

            let url = '';
            switch (type) {
                case 'transactions':
                    url = `${apiUrl}/export/transactions/csv${queryString}`;
                    break;
                case 'debts':
                    url = `${apiUrl}/export/debts/csv`;
                    break;
                case 'budgets':
                    url = `${apiUrl}/export/budgets/csv`;
                    break;
                case 'credit-cards':
                    url = `${apiUrl}/export/credit-cards/csv`;
                    break;
                case 'transfers':
                    url = `${apiUrl}/export/transfers/csv`;
                    break;
                case 'savings':
                    url = `${apiUrl}/export/savings/csv`;
                    break;
                case 'recurring':
                    url = `${apiUrl}/export/recurring/csv`;
                    break;
                case 'checklist':
                    url = `${apiUrl}/export/checklist/csv`;
                    break;
            }

            const response = await fetch(url, { headers: api.getAuthHeaders() });
            if (!response.ok) {
                const msg = await extractErrorMessage(response, 'No se pudo generar el CSV');
                throw new Error(msg);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `export_${type}_${getTodayString()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            setIsOpen(false);
            showToast('Exportación completada', 'success');
        } catch (error: any) {
            console.error('ExportMenu.exportToCSV:', error);
            showToast(error?.message || 'Error al exportar', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = async () => {
        try {
            setIsExporting(true);

            const queryString = buildQueryString();
            const url = `${api.getApiUrl()}/export/monthly-report${queryString}`;

            const response = await fetch(url, { headers: api.getAuthHeaders() });
            if (!response.ok) {
                const msg = await extractErrorMessage(response, 'No se pudo generar el PDF');
                throw new Error(msg);
            }

            const data = await response.json();

            // Generate PDF
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(20);
            doc.text('Reporte Financiero Mensual', 14, 20);
            
            // Period
            doc.setFontSize(12);
            doc.text(data.period.monthName, 14, 30);
            
            // Summary
            doc.setFontSize(14);
            doc.text('Resumen', 14, 40);
            doc.setFontSize(10);
            doc.text(`Ingresos: $${data.summary.income.toLocaleString()}`, 14, 48);
            doc.text(`Gastos: $${data.summary.expense.toLocaleString()}`, 14, 54);
            doc.text(`Balance: $${data.summary.balance.toLocaleString()}`, 14, 60);
            doc.text(`Transacciones: ${data.summary.transactionCount}`, 14, 66);
            
            // Categories table
            doc.text('Por Categoría', 14, 80);
            
            const categoryRows = data.categories.map((cat: any) => [
                cat.icon + ' ' + cat.name,
                `$${cat.income.toLocaleString()}`,
                `$${cat.expense.toLocaleString()}`,
                `$${(cat.income - cat.expense).toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: 85,
                head: [['Categoría', 'Ingresos', 'Gastos', 'Balance']],
                body: categoryRows,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] }
            });
            
            // Transactions table
            const finalY = (doc as any).lastAutoTable.finalY || 120;
            doc.text('Transacciones', 14, finalY + 10);
            
            const transactionRows = data.transactions.slice(0, 50).map((t: any) => [
                new Date(t.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
                t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
                t.categoryIcon + ' ' + t.category,
                t.description.substring(0, 30),
                `$${t.amount.toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: finalY + 15,
                head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
                body: transactionRows,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 8 }
            });

            // Save PDF
            doc.save(`reporte_${data.period.year}_${data.period.month}.pdf`);
            
            setIsOpen(false);
            showToast('PDF generado exitosamente', 'success');
        } catch (error: any) {
            console.error('ExportMenu.exportToPDF:', error);
            showToast(error?.message || 'Error al generar PDF', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                disabled={isExporting}
            >
                <span className="text-xl">📥</span>
                {isExporting ? 'Exportando...' : 'Exportar'}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                        <div className="p-2 space-y-1">
                            <button
                                onClick={exportToCSV}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-3"
                                disabled={isExporting}
                            >
                                <span className="text-2xl">📊</span>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">Exportar CSV</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Excel compatible</p>
                                </div>
                            </button>

                            {type === 'monthly-report' && (
                                <button
                                    onClick={exportToPDF}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-3"
                                    disabled={isExporting}
                                >
                                    <span className="text-2xl">📄</span>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">Exportar PDF</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Reporte completo</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

