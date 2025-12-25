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

// Get checklist items
export const getChecklistItems = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const items = await prisma.checklistItem.findMany({
            where: { userId },
            include: {
                category: true,
                completions: {
                    orderBy: { month: 'desc' },
                    take: 12
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        res.json(items);
    } catch (error) {
        console.error('Get checklist items error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create checklist item
export const createChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, categoryId, dueDay } = req.body;
        const userId = req.user!.id;

        if (!name || !amount || !categoryId || !dueDay) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await prisma.checklistItem.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                categoryId,
                dueDay: parseInt(dueDay)
            },
            include: { category: true, completions: true }
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Create checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Toggle checklist item completion for current month
export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        // Get current month (first day of month)
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Check if there's a completion for this month
        const existingCompletion = await prisma.checklistCompletion.findFirst({
            where: {
                checklistItemId: id,
                month: currentMonth
            }
        });

        if (existingCompletion) {
            // Toggle completion
            const updated = await prisma.checklistCompletion.update({
                where: { id: existingCompletion.id },
                data: {
                    isCompleted: !existingCompletion.isCompleted,
                    completedAt: !existingCompletion.isCompleted ? new Date() : null
                }
            });

            res.json(updated);
        } else {
            // Create new completion
            const completion = await prisma.checklistCompletion.create({
                data: {
                    checklistItemId: id,
                    month: currentMonth,
                    isCompleted: true,
                    completedAt: new Date()
                }
            });

            res.json(completion);
        }
    } catch (error) {
        console.error('Toggle checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete checklist item
export const deleteChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        await prisma.checklistItem.delete({ where: { id } });
        res.json({ message: 'Checklist item deleted successfully' });
    } catch (error) {
        console.error('Delete checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
