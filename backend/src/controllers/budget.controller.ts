import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

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
        console.error('Get budgets error:', error);
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

        // Get the date range for all budgets
        const minStartDate = budgets.reduce((min, b) =>
            b.startDate < min ? b.startDate : min, budgets[0].startDate);
        const maxEndDate = budgets.reduce((max, b) => {
            const end = b.endDate || new Date();
            return end > max ? end : max;
        }, budgets[0].endDate || new Date());

        // Get all category IDs and user IDs from budgets
        const categoryIds = [...new Set(budgets.map(b => b.categoryId))];
        const userIds = userRole === 'ADMIN'
            ? [...new Set(budgets.map(b => b.userId))]
            : [userId];

        // Single query to get all spending grouped by userId and categoryId
        const spentByCategory = await prisma.transaction.groupBy({
            by: ['userId', 'categoryId'],
            where: {
                userId: { in: userIds },
                categoryId: { in: categoryIds },
                type: 'EXPENSE',
                date: {
                    gte: minStartDate,
                    lte: maxEndDate
                }
            },
            _sum: { amount: true }
        });

        // Create a lookup map for quick access
        const spentMap = new Map<string, number>();
        spentByCategory.forEach(item => {
            const key = `${item.userId}-${item.categoryId}`;
            spentMap.set(key, Number(item._sum.amount) || 0);
        });

        // Build the result with progress calculated
        const budgetsWithProgress = budgets.map(budget => {
            const key = `${budget.userId}-${budget.categoryId}`;
            const spentAmount = spentMap.get(key) || 0;
            const budgetAmount = Number(budget.amount);
            const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

            return {
                ...budget,
                spent: spentAmount,
                remaining: budgetAmount - spentAmount,
                percentage: Math.round(percentage * 100) / 100
            };
        });

        res.json(budgetsWithProgress);
    } catch (error) {
        console.error('Get budget progress error:', error);
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
        console.error('Create budget error:', error);
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
        console.error('Update budget error:', error);
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
        console.error('Delete budget error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
