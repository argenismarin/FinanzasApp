import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { type, categoryId, startDate, endDate, page = '1', limit = '20' } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Build where clause
        const where: any = {};

        // Non-admin users can only see their own transactions
        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        if (type) {
            where.type = type;
        }

        if (categoryId) {
            where.categoryId = categoryId as string;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate as string);
            }
            if (endDate) {
                where.date.lte = new Date(endDate as string);
            }
        }

        // Pagination
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Get transactions
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            icon: true,
                            type: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { date: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            data: transactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                category: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && transaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(transaction);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { type, amount, categoryId, description, date, isRecurring, recurringPattern, metadata } = req.body;
        const userId = req.user!.id;

        // Validation
        if (!type || !amount || !categoryId || !description || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['INCOME', 'EXPENSE'].includes(type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        // Verify category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type,
                amount: parseFloat(amount),
                currency: 'COP',
                categoryId,
                description,
                date: new Date(date),
                isRecurring: isRecurring || false,
                recurringPattern: recurringPattern || null,
                metadata: metadata || null,
                createdBy: userId
            },
            include: {
                category: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { type, amount, categoryId, description, date, isRecurring, recurringPattern, metadata } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Find transaction
        const existingTransaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && existingTransaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Update transaction
        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                ...(type && { type }),
                ...(amount && { amount: parseFloat(amount) }),
                ...(categoryId && { categoryId }),
                ...(description && { description }),
                ...(date && { date: new Date(date) }),
                ...(isRecurring !== undefined && { isRecurring }),
                ...(recurringPattern && { recurringPattern }),
                ...(metadata && { metadata })
            },
            include: {
                category: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json(transaction);
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Find transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && transaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Delete transaction
        await prisma.transaction.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransactionStats = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = {};

        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate as string);
            }
            if (endDate) {
                where.date.lte = new Date(endDate as string);
            }
        }

        // Get income and expense totals
        const [incomeTotal, expenseTotal, transactionsByCategory] = await Promise.all([
            prisma.transaction.aggregate({
                where: { ...where, type: 'INCOME' },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { ...where, type: 'EXPENSE' },
                _sum: { amount: true }
            }),
            prisma.transaction.groupBy({
                by: ['categoryId'],
                where,
                _sum: { amount: true },
                _count: true
            })
        ]);

        // Get category details
        const categoryIds = transactionsByCategory.map(t => t.categoryId);
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true, icon: true, type: true }
        });

        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const byCategory = transactionsByCategory.map(t => ({
            category: categoryMap.get(t.categoryId),
            total: t._sum.amount ? Number(t._sum.amount) : 0,
            count: t._count
        }));

        // Calculate totals
        const income = incomeTotal._sum.amount ? Number(incomeTotal._sum.amount) : 0;
        const expense = expenseTotal._sum.amount ? Number(expenseTotal._sum.amount) : 0;
        const balance = income - expense;

        res.json({
            income,
            expense,
            balance,
            byCategory
        });
    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
