import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getChecklistItems = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { month, year } = req.query;

        const currentDate = new Date();
        const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();

        // Get checklist items
        const items = await prisma.checklistItem.findMany({
            where: {
                OR: [{ userId: null }, { userId }],
            },
            include: {
                completions: {
                    where: {
                        userId,
                        month: targetMonth,
                        year: targetYear,
                    },
                },
            },
            orderBy: { dueDay: 'asc' },
        });

        res.json({
            month: targetMonth,
            year: targetYear,
            items: items.map((item) => ({
                ...item,
                isCompleted: item.completions.length > 0,
                completedAt: item.completions[0]?.completedAt || null,
            })),
        });
    } catch (error) {
        console.error('Get checklist items error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, dueDay, categoryId, isRecurring } = req.body;
        const userId = req.user!.id;

        if (!name || !amount || !dueDay) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await prisma.checklistItem.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                dueDay: parseInt(dueDay),
                categoryId,
                isRecurring: isRecurring !== false,
            },
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Create checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { month, year } = req.body;
        const userId = req.user!.id;

        const currentDate = new Date();
        const targetMonth = month || currentDate.getMonth() + 1;
        const targetYear = year || currentDate.getFullYear();

        // Check if already completed
        const existing = await prisma.checklistCompletion.findFirst({
            where: {
                checklistItemId: id,
                userId,
                month: targetMonth,
                year: targetYear,
            },
        });

        if (existing) {
            // Uncomplete
            await prisma.checklistCompletion.delete({
                where: { id: existing.id },
            });
            res.json({ completed: false });
        } else {
            // Complete
            await prisma.checklistCompletion.create({
                data: {
                    checklistItemId: id,
                    userId,
                    month: targetMonth,
                    year: targetYear,
                },
            });
            res.json({ completed: true });
        }
    } catch (error) {
        console.error('Toggle checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const item = await prisma.checklistItem.findUnique({
            where: { id },
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        // Only allow deleting own items or if admin
        if (item.userId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.checklistItem.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
