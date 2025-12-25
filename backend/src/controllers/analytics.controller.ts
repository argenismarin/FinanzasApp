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

// Get analytics overview
export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate } = req.query;

        const where: any = { userId };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        // Get monthly trends
        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'asc' }
        });

        const monthlyData: any = {};
        transactions.forEach(t => {
            const month = t.date.toISOString().substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            if (t.type === 'INCOME') {
                monthlyData[month].income += Number(t.amount);
            } else {
                monthlyData[month].expense += Number(t.amount);
            }
        });

        res.json({
            monthlyTrends: Object.entries(monthlyData).map(([month, data]) => ({
                month,
                ...data
            }))
        });
    } catch (error) {
        console.error('Get analytics overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get category breakdown
export const getCategoryBreakdown = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate, type } = req.query;

        const where: any = { userId };
        if (type) where.type = type;
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: { category: true }
        });

        const categoryData: any = {};
        let total = 0;

        transactions.forEach(t => {
            const catName = t.category.name;
            const amount = Number(t.amount);
            if (!categoryData[catName]) {
                categoryData[catName] = {
                    name: catName,
                    icon: t.category.icon,
                    total: 0
                };
            }
            categoryData[catName].total += amount;
            total += amount;
        });

        const breakdown = Object.values(categoryData).map((cat: any) => ({
            ...cat,
            percentage: total > 0 ? (cat.total / total) * 100 : 0
        }));

        res.json(breakdown);
    } catch (error) {
        console.error('Get category breakdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get top categories
export const getTopCategories = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { limit = '5', type = 'EXPENSE' } = req.query;

        const transactions = await prisma.transaction.findMany({
            where: { userId, type: type as string },
            include: { category: true }
        });

        const categoryTotals: any = {};
        transactions.forEach(t => {
            const catId = t.categoryId;
            if (!categoryTotals[catId]) {
                categoryTotals[catId] = {
                    category: t.category,
                    total: 0
                };
            }
            categoryTotals[catId].total += Number(t.amount);
        });

        const topCategories = Object.values(categoryTotals)
            .sort((a: any, b: any) => b.total - a.total)
            .slice(0, parseInt(limit as string));

        res.json(topCategories);
    } catch (error) {
        console.error('Get top categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
