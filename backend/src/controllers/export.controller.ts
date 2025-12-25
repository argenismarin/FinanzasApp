import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        // Get balance data
        const balance = await prisma.transaction.findMany({
            where: { userId }
        });

        let bankBalance = 0;
        balance.forEach(t => {
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

