import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Export transactions to CSV
export const exportTransactionsCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate, type, categoryId } = req.query;

        const where: any = { userId };
        
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            where.type = type;
        }
        
        if (categoryId) {
            where.categoryId = categoryId as string;
        }
        
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                category: true
            },
            orderBy: { date: 'desc' }
        });

        // Generate CSV
        const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Moneda'];
        const rows = transactions.map(t => [
            new Date(t.date).toLocaleDateString('es-CO'),
            t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            t.category.name,
            t.description,
            Number(t.amount).toFixed(2),
            t.currency
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=transacciones_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv); // BOM for Excel UTF-8 recognition
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export monthly report data (for PDF generation in frontend)
export const exportMonthlyReport = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { year, month } = req.query;

        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
        const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

        const monthStart = new Date(targetYear, targetMonth - 1, 1);
        const monthEnd = new Date(targetYear, targetMonth, 0);

        // Get transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: monthStart, lte: monthEnd }
            },
            include: { category: true },
            orderBy: { date: 'desc' }
        });

        // Calculate totals
        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Category breakdown
        const categoryData: any = {};
        transactions.forEach(t => {
            const catName = t.category.name;
            if (!categoryData[catName]) {
                categoryData[catName] = {
                    name: catName,
                    icon: t.category.icon,
                    income: 0,
                    expense: 0
                };
            }
            if (t.type === 'INCOME') {
                categoryData[catName].income += Number(t.amount);
            } else {
                categoryData[catName].expense += Number(t.amount);
            }
        });

        const categories = Object.values(categoryData);

        // Get balance data - calculate from all transactions up to end of this month
        const allTransactionsUpToMonth = await prisma.transaction.findMany({
            where: {
                userId,
                date: { lte: monthEnd }
            }
        });

        let bankBalance = 0;
        allTransactionsUpToMonth.forEach(t => {
            if (t.type === 'INCOME') {
                bankBalance += Number(t.amount);
            } else {
                bankBalance -= Number(t.amount);
            }
        });

        // Get savings
        const savings = await prisma.saving.findMany({
            where: { userId }
        });

        const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0);

        // Get debts
        const debts = await prisma.debt.findMany({
            where: { userId }
        });

        const totalDebts = debts.reduce((sum, d) => {
            const pending = Number(d.totalAmount) - Number(d.paidAmount);
            return sum + pending;
        }, 0);

        res.json({
            period: {
                year: targetYear,
                month: targetMonth,
                monthName: monthStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
            },
            summary: {
                income,
                expense,
                balance: income - expense,
                transactionCount: transactions.length
            },
            categories,
            transactions: transactions.map(t => ({
                date: t.date,
                type: t.type,
                category: t.category.name,
                categoryIcon: t.category.icon,
                description: t.description,
                amount: Number(t.amount)
            })),
            balance: {
                bank: bankBalance,
                savings: totalSavings,
                debts: totalDebts,
                netWorth: bankBalance + totalSavings - totalDebts
            }
        });
    } catch (error) {
        console.error('Export monthly report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export debts to CSV
export const exportDebtsCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const debts = await prisma.debt.findMany({
            where: { userId },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const headers = ['Acreedor', 'Descripción', 'Monto Total', 'Pagado', 'Pendiente', 'Fecha Creación', 'Vencimiento'];
        const rows = debts.map(d => [
            d.creditor,
            d.description || '',
            Number(d.totalAmount).toFixed(2),
            Number(d.paidAmount).toFixed(2),
            (Number(d.totalAmount) - Number(d.paidAmount)).toFixed(2),
            new Date(d.createdAt).toLocaleDateString('es-CO'),
            d.dueDate ? new Date(d.dueDate).toLocaleDateString('es-CO') : ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=deudas_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export debts CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export budgets to CSV
export const exportBudgetsCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const budgets = await prisma.budget.findMany({
            where: { userId },
            include: { category: true }
        });

        // Get current month spending
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: monthStart }
            }
        });

        // Generate CSV
        const headers = ['Categoría', 'Presupuesto', 'Gastado', 'Disponible', 'Porcentaje', 'Período', 'Estado'];
        const rows = budgets.map(b => {
            const spent = transactions
                .filter(t => t.categoryId === b.categoryId)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const available = Number(b.amount) - spent;
            const percentage = (spent / Number(b.amount)) * 100;

            return [
                b.category.name,
                Number(b.amount).toFixed(2),
                spent.toFixed(2),
                available.toFixed(2),
                percentage.toFixed(1) + '%',
                b.period,
                b.isActive ? 'Activo' : 'Inactivo'
            ];
        });

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=presupuestos_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export budgets CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export credit cards to CSV
export const exportCreditCardsCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const cards = await prisma.creditCard.findMany({
            where: { userId },
            include: {
                transactions: { orderBy: { transactionDate: 'desc' } },
                payments: { orderBy: { paymentDate: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const headers = ['Tarjeta', 'Últimos 4', 'Marca', 'Límite', 'Saldo Actual', 'Disponible', 'Día Corte', 'Día Pago', 'Estado'];
        const rows = cards.map(c => [
            c.name,
            c.lastFourDigits || '',
            c.brand,
            Number(c.creditLimit).toFixed(2),
            Number(c.currentBalance).toFixed(2),
            Number(c.availableCredit).toFixed(2),
            String(c.cutOffDay),
            String(c.paymentDueDay),
            c.isActive ? 'Activa' : 'Inactiva'
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=tarjetas_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export credit cards CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export transfers to CSV
export const exportTransfersCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Fetch transfers and accounts separately since AccountTransfer has no FK relations to BankAccount
        const [transfers, accounts] = await Promise.all([
            prisma.accountTransfer.findMany({
                where: { userId },
                orderBy: { transferDate: 'desc' }
            }),
            prisma.bankAccount.findMany({
                where: { userId },
                select: { id: true, name: true }
            })
        ]);

        const accountMap = new Map(accounts.map(a => [a.id, a.name]));

        const headers = ['Fecha', 'Desde', 'Hacia', 'Monto', 'Descripción'];
        const rows = transfers.map(t => [
            new Date(t.transferDate).toLocaleDateString('es-CO'),
            accountMap.get(t.fromAccountId) || '',
            accountMap.get(t.toAccountId) || '',
            Number(t.amount).toFixed(2),
            t.description || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=transferencias_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export transfers CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export savings to CSV
export const exportSavingsCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const savings = await prisma.saving.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        const headers = ['Nombre', 'Propósito', 'Monto', 'Fecha Creación'];
        const rows = savings.map(s => [
            s.name,
            s.purpose || '',
            Number(s.amount).toFixed(2),
            new Date(s.createdAt).toLocaleDateString('es-CO')
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=ahorros_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export savings CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export recurring transactions to CSV
export const exportRecurringCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const recurring = await prisma.recurringTransaction.findMany({
            where: { userId },
            orderBy: { nextExecution: 'asc' }
        });

        const freqLabels: Record<string, string> = {
            DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal',
            MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual'
        };

        const headers = ['Descripción', 'Tipo', 'Monto', 'Frecuencia', 'Próxima Ejecución', 'Auto-crear', 'Estado'];
        const rows = recurring.map(r => [
            r.description,
            r.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            Number(r.amount).toFixed(2),
            freqLabels[r.frequency] || r.frequency,
            new Date(r.nextExecution).toLocaleDateString('es-CO'),
            r.autoCreate ? 'Sí' : 'No',
            r.isActive ? 'Activo' : 'Inactivo'
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=recurrentes_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export recurring CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export checklist to CSV
export const exportChecklistCSV = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const items = await prisma.checklistItem.findMany({
            where: { userId, isActive: true },
            include: {
                category: true,
                completions: {
                    where: { month: { gte: monthStart, lte: monthEnd } }
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        const headers = ['Nombre', 'Categoría', 'Monto', 'Día Vencimiento', 'Estado Este Mes'];
        const rows = items.map(item => [
            item.name,
            item.category?.name || '',
            Number(item.amount).toFixed(2),
            String(item.dueDay),
            item.completions.length > 0 ? 'Completado' : 'Pendiente'
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=checklist_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export checklist CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

