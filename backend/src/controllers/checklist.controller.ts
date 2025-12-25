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

// Get checklist items with current month completions
export const getChecklistItems = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Get current month (first day of month)
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const items = await prisma.checklistItem.findMany({
            where: { userId, isActive: true },
            include: {
                category: true,
                completions: {
                    where: { month: currentMonth },
                    include: { transaction: true }
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        // Transform to include isCompleted flag
        const itemsWithCompletion = items.map(item => ({
            ...item,
            isCompleted: item.completions.length > 0 && item.completions[0].isCompleted,
            completedAt: item.completions.length > 0 ? item.completions[0].completedAt : null,
            transactionId: item.completions.length > 0 ? item.completions[0].transactionId : null
        }));

        res.json(itemsWithCompletion);
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

        console.log('Creating checklist item:', { name, amount, categoryId, dueDay, userId });

        if (!name || !amount || !categoryId || !dueDay) {
            return res.status(400).json({ error: 'Missing required fields: name, amount, categoryId, dueDay' });
        }

        const item = await prisma.checklistItem.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                categoryId,
                dueDay: parseInt(dueDay),
                isActive: true
            },
            include: { category: true, completions: true }
        });

        console.log('Checklist item created successfully:', item.id);
        res.status(201).json(item);
    } catch (error: any) {
        console.error('Create checklist item error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Toggle checklist item completion and create transaction
export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId },
            include: { category: true }
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
            },
            include: { transaction: true }
        });

        if (existingCompletion) {
            // Toggle completion
            if (existingCompletion.isCompleted) {
                // Unmark as completed - delete transaction if exists
                if (existingCompletion.transactionId) {
                    await prisma.transaction.delete({
                        where: { id: existingCompletion.transactionId }
                    });
                }

                const updated = await prisma.checklistCompletion.update({
                    where: { id: existingCompletion.id },
                    data: {
                        isCompleted: false,
                        completedAt: null,
                        transactionId: null
                    }
                });

                return res.json({ ...updated, message: 'Marcado como no pagado y transacción eliminada' });
            } else {
                // Mark as completed - create transaction
                const transaction = await prisma.transaction.create({
                    data: {
                        userId,
                        type: 'EXPENSE',
                        amount: item.amount,
                        description: `${item.name} (Checklist mensual)`,
                        date: new Date(),
                        categoryId: item.categoryId,
                        currency: 'COP',
                        createdBy: userId
                    }
                });

                const updated = await prisma.checklistCompletion.update({
                    where: { id: existingCompletion.id },
                    data: {
                        isCompleted: true,
                        completedAt: new Date(),
                        transactionId: transaction.id
                    }
                });

                return res.json({ ...updated, transaction, message: 'Marcado como pagado y transacción creada' });
            }
        } else {
            // Create new completion and transaction
            const transaction = await prisma.transaction.create({
                data: {
                    userId,
                    type: 'EXPENSE',
                    amount: item.amount,
                    description: `${item.name} (Checklist mensual)`,
                    date: new Date(),
                    categoryId: item.categoryId,
                    currency: 'COP',
                    createdBy: userId
                }
            });

            const completion = await prisma.checklistCompletion.create({
                data: {
                    checklistItemId: id,
                    month: currentMonth,
                    isCompleted: true,
                    completedAt: new Date(),
                    transactionId: transaction.id
                }
            });

            res.json({ ...completion, transaction, message: 'Marcado como pagado y transacción creada' });
        }
    } catch (error: any) {
        console.error('Toggle checklist item error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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

        // Soft delete - mark as inactive
        await prisma.checklistItem.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Checklist item deleted successfully' });
    } catch (error) {
        console.error('Delete checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
