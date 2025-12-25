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

// Get checklist items with completion status for specific month
export const getChecklistItems = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { month, year } = req.query;

        // Parse month and year, default to current month
        const now = new Date();
        const selectedMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const selectedYear = year ? parseInt(year as string) : now.getFullYear();

        // Create date for first day of selected month
        const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        // Build the where clause
        const whereClause: any = {
            userId,
            // Show items created on or before the selected month
            createdAt: {
                lte: lastDayOfMonth
            }
        };

        // Add condition for deletedAt:
        // Show item if it's NOT deleted OR if it was deleted AFTER the selected month
        // This means: show in all months from creation until deletion
        whereClause.OR = [
            { deletedAt: null },                    // Not deleted at all
            { deletedAt: { gt: lastDayOfMonth } }   // Deleted after this month
        ];

        const items = await prisma.checklistItem.findMany({
            where: whereClause,
            include: {
                category: true,
                completions: {
                    where: { month: monthDate },
                    include: { transaction: true }
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        // Transform to include isCompleted flag for THIS SPECIFIC MONTH
        const itemsWithCompletion = items.map(item => {
            const completion = item.completions[0]; // Should only be one per month
            return {
                id: item.id,
                name: item.name,
                amount: item.amount,
                categoryId: item.categoryId,
                category: item.category,
                dueDay: item.dueDay,
                isActive: item.isActive,
                createdAt: item.createdAt,
                // Month-specific completion data
                isCompleted: completion ? completion.isCompleted : false,
                completedAt: completion ? completion.completedAt : null,
                transactionId: completion ? completion.transactionId : null
            };
        });

        res.json(itemsWithCompletion);
    } catch (error) {
        console.error('Get checklist items error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create checklist item (permanent template)
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

// Toggle checklist item completion for CURRENT MONTH and create transaction
export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const { month, year } = req.query;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId },
            include: { category: true }
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        // Parse month and year, default to current month
        const now = new Date();
        const selectedMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const selectedYear = year ? parseInt(year as string) : now.getFullYear();
        const monthDate = new Date(selectedYear, selectedMonth - 1, 1);

        // Check if there's a completion for THIS SPECIFIC MONTH
        const existingCompletion = await prisma.checklistCompletion.findFirst({
            where: {
                checklistItemId: id,
                month: monthDate
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
                        description: `${item.name} (Checklist ${selectedMonth}/${selectedYear})`,
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
            // Create new completion for THIS MONTH and transaction
            const transaction = await prisma.transaction.create({
                data: {
                    userId,
                    type: 'EXPENSE',
                    amount: item.amount,
                    description: `${item.name} (Checklist ${selectedMonth}/${selectedYear})`,
                    date: new Date(),
                    categoryId: item.categoryId,
                    currency: 'COP',
                    createdBy: userId
                }
            });

            const completion = await prisma.checklistCompletion.create({
                data: {
                    checklistItemId: id,
                    month: monthDate,
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

// Delete checklist item (soft delete)
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

        // Soft delete - set deletedAt to current timestamp
        // This preserves the item in historical months but removes it from current/future months
        await prisma.checklistItem.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        });

        res.json({ message: 'Checklist item deleted successfully' });
    } catch (error) {
        console.error('Delete checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
