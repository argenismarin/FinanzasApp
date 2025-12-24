import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getMonthlyTrend = async (req: AuthRequest, res: Response) => {
    try {
        const { months = '6' } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const monthsCount = parseInt(months as string);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsCount);

        const where: any = {
            date: {
                gte: startDate,
                lte: endDate,
            },
        };

        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        // Get transactions grouped by month
        const transactions = await prisma.transaction.findMany({
            where,
            select: {
                date: true,
                type: true,
                amount: true,
            },
        });

        // Group by month
        const monthlyData: Record<string, { income: number; expense: number }> = {};

        transactions.forEach((t) => {
            const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expense: 0 };
            }

            if (t.type === 'INCOME') {
                monthlyData[monthKey].income += t.amount;
            } else {
                monthlyData[monthKey].expense += t.amount;
            }
        });

        // Convert to array and sort
        const trend = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                income: data.income,
                expense: data.expense,
                balance: data.income - data.expense,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        res.json(trend);
    } catch (error) {
        console.error('Get monthly trend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCategoryBreakdown = async (req: AuthRequest, res: Response) => {
    try {
        const { type = 'EXPENSE', startDate, endDate } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = { type };

        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const transactions = await prisma.transaction.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true },
            _count: true,
        });

        // Get category details
        const categoryIds = transactions.map((t) => t.categoryId);
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true, icon: true },
        });

        const categoryMap = new Map(categories.map((c) => [c.id, c]));

        const breakdown = transactions.map((t) => ({
            category: categoryMap.get(t.categoryId),
            total: t._sum.amount || 0,
            count: t._count,
            percentage: 0, // Will calculate below
        }));

        // Calculate percentages
        const total = breakdown.reduce((sum, item) => sum + item.total, 0);
        breakdown.forEach((item) => {
            item.percentage = total > 0 ? (item.total / total) * 100 : 0;
        });

        // Sort by total descending
        breakdown.sort((a, b) => b.total - a.total);

        res.json({
            type,
            total,
            breakdown,
        });
    } catch (error) {
        console.error('Get category breakdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTopCategories = async (req: AuthRequest, res: Response) => {
    try {
        const { limit = '5', type = 'EXPENSE' } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = { type };

        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        const transactions = await prisma.transaction.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true },
            _count: true,
        });

        // Get category details
        const categoryIds = transactions.map((t) => t.categoryId);
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
        });

        const categoryMap = new Map(categories.map((c) => [c.id, c]));

        const topCategories = transactions
            .map((t) => ({
                category: categoryMap.get(t.categoryId),
                total: t._sum.amount || 0,
                count: t._count,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, parseInt(limit as string));

        res.json(topCategories);
    } catch (error) {
        console.error('Get top categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
