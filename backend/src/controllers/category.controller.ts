import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.query;
        const userId = req.user!.id;

        const where: any = {
            OR: [
                { userId: null }, // Global categories
                { userId } // User's personal categories
            ]
        };

        if (type) {
            where.type = type;
        }

        const categories = await prisma.category.findMany({
            where,
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ]
        });

        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, color, icon } = req.body;
        const userId = req.user!.id;

        if (!name || !type || !color || !icon) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['INCOME', 'EXPENSE'].includes(type)) {
            return res.status(400).json({ error: 'Invalid category type' });
        }

        const category = await prisma.category.create({
            data: {
                userId,
                name,
                type,
                color,
                icon,
                isDefault: false
            }
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, color, icon } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const existingCategory = await prisma.category.findUnique({
            where: { id }
        });

        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Only allow editing own categories or if admin
        if (existingCategory.userId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Don't allow editing default categories
        if (existingCategory.isDefault && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Cannot edit default categories' });
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(color && { color }),
                ...(icon && { icon })
            }
        });

        res.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const category = await prisma.category.findUnique({
            where: { id }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Only allow deleting own categories or if admin
        if (category.userId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Don't allow deleting default categories
        if (category.isDefault) {
            return res.status(403).json({ error: 'Cannot delete default categories' });
        }

        // Check if category has transactions
        const transactionCount = await prisma.transaction.count({
            where: { categoryId: id }
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete category with existing transactions',
                transactionCount
            });
        }

        await prisma.category.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
