import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// Get all budgets for user
export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const budgets = await prisma.budget.findMany({
            where,
            include: {
                category: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(budgets);
    } catch (error) {
        logger.fromError('budget_get_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get budget with progress (optimized - single query for all spent amounts)
export const getBudgetProgress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const budgets = await prisma.budget.findMany({
            where: { ...where, isActive: true },
            include: {
                category: true
            }
        });

        if (budgets.length === 0) {
            return res.json([]);
        }

        // Calculate current period date range for each budget
        const now = new Date();
        const getperiodRange = (budget: any): { start: Date; end: Date } => {
            const period = budget.period || 'MONTHLY';
            const budgetStart = new Date(budget.startDate);

            switch (period) {
                case 'WEEKLY': {
                    const daysSinceStart = Math.floor((now.getTime() - budgetStart.getTime()) / (1000 * 60 * 60 * 24));
                    const currentWeekOffset = Math.floor(daysSinceStart / 7) * 7;
                    const start = new Date(budgetStart);
                    start.setDate(start.getDate() + currentWeekOffset);
                    const end = new Date(start);
                    end.setDate(end.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    return { start, end };
                }
                case 'MONTHLY': {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    return { start, end };
                }
                case 'QUARTERLY': {
                    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
                    const start = new Date(now.getFullYear(), quarterMonth, 1);
                    const end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
                    return { start, end };
                }
                case 'YEARLY': {
                    const start = new Date(now.getFullYear(), 0, 1);
                    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    return { start, end };
                }
                default: {
                    // Fallback: use budget startDate to endDate or current month
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    return { start, end };
                }
            }
        };

        // Query spent amount per budget individually using correct period ranges
        const budgetsWithProgress = await Promise.all(budgets.map(async (budget) => {
            const { start, end } = getperiodRange(budget);

            const spent = await prisma.transaction.aggregate({
                where: {
                    userId: budget.userId,
                    categoryId: budget.categoryId,
                    type: 'EXPENSE',
                    date: { gte: start, lte: end }
                },
                _sum: { amount: true }
            });

            const spentAmount = Number(spent._sum.amount) || 0;
            const budgetAmount = Number(budget.amount);
            const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

            return {
                ...budget,
                spent: spentAmount,
                remaining: budgetAmount - spentAmount,
                percentage: Math.round(percentage * 100) / 100,
                periodStart: start,
                periodEnd: end
            };
        }));

        res.json(budgetsWithProgress);
    } catch (error) {
        logger.fromError('budget_progress_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create budget
export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const { categoryId, amount, period, startDate, endDate } = req.body;
        const userId = req.user!.id;

        if (!categoryId || !amount || !startDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const budget = await prisma.budget.create({
            data: {
                userId,
                categoryId,
                amount: parseFloat(amount),
                period: period || 'MONTHLY',
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null
            },
            include: {
                category: true
            }
        });

        res.status(201).json(budget);
    } catch (error) {
        logger.fromError('budget_create_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update budget
export const updateBudget = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { categoryId, amount, period, startDate, endDate, isActive } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const existingBudget = await prisma.budget.findUnique({
            where: { id }
        });

        if (!existingBudget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        if (userRole !== 'ADMIN' && existingBudget.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const budget = await prisma.budget.update({
            where: { id },
            data: {
                ...(categoryId && { categoryId }),
                ...(amount && { amount: parseFloat(amount) }),
                ...(period && { period }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(isActive !== undefined && { isActive })
            },
            include: {
                category: true
            }
        });

        res.json(budget);
    } catch (error) {
        logger.fromError('budget_update_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete budget
export const deleteBudget = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const budget = await prisma.budget.findUnique({
            where: { id }
        });

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        if (userRole !== 'ADMIN' && budget.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.budget.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        logger.fromError('budget_delete_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
