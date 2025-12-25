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

        // Create dates for the selected month
        const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        console.log(`Fetching checklist for ${selectedMonth}/${selectedYear}`);
        console.log(`First day: ${firstDayOfMonth.toISOString()}`);
        console.log(`Last day: ${lastDayOfMonth.toISOString()}`);

        // Fetch all active items for this user
        const allItems = await prisma.checklistItem.findMany({
            where: { userId },
            include: {
                category: true,
                completions: {
                    where: { month: firstDayOfMonth },
                    include: { transaction: true }
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        // Filter items based on creation and deletion dates
        const filteredItems = allItems.filter(item => {
            // Item must be created BEFORE or DURING this month
            const createdBeforeOrDuringMonth = item.createdAt <= lastDayOfMonth;

            // If not created yet in this month, don't show
            if (!createdBeforeOrDuringMonth) {
                console.log(`Item ${item.name} not created yet (created: ${item.createdAt.toISOString()})`);
                return false;
            }

            // If never deleted, always show (after creation)
            if (!item.deletedAt) {
                return true;
            }

            // If deleted, only show if deletion happened AFTER this month
            // (item should appear from creation month up to and including deletion month)
            const deletedAfterMonth = item.deletedAt > lastDayOfMonth;

            if (!deletedAfterMonth) {
                console.log(`Item ${item.name} was deleted (deleted: ${item.deletedAt.toISOString()})`);
            }

            return deletedAfterMonth;
        });

        // Transform to include isCompleted flag for THIS SPECIFIC MONTH
        const itemsWithCompletion = filteredItems.map(item => {
            const completion = item.completions[0];
            return {
                id: item.id,
                name: item.name,
                amount: item.amount,
                categoryId: item.categoryId,
                category: item.category,
                dueDay: item.dueDay,
                isActive: item.isActive,
                createdAt: item.createdAt,
                deletedAt: item.deletedAt,
                isCompleted: completion ? completion.isCompleted : false,
                completedAt: completion ? completion.completedAt : null,
                transactionId: completion ? completion.transactionId : null
            };
        });

        console.log(`Returning ${itemsWithCompletion.length} items`);
        res.json(itemsWithCompletion);
    } catch (error) {
        console.error('Get checklist items error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create checklist item with creation date from selected month for planning
export const createChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, categoryId, dueDay, month, year } = req.body;
        const userId = req.user!.id;

        console.log('Creating checklist item:', { name, amount, categoryId, dueDay, month, year, userId });

        if (!name || !amount || !categoryId || !dueDay) {
            return res.status(400).json({ error: 'Missing required fields: name, amount, categoryId, dueDay' });
        }

        // Parse month and year, default to current month
        const now = new Date();
        const selectedMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const selectedYear = year ? parseInt(year as string) : now.getFullYear();

        // Set createdAt to first day of selected month for planning
        const creationDate = new Date(selectedYear, selectedMonth - 1, 1);

        const item = await prisma.checklistItem.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                categoryId,
                dueDay: parseInt(dueDay),
                isActive: true,
                createdAt: creationDate
            },
            include: { category: true, completions: true }
        });

        console.log(`Item created for ${selectedMonth}/${selectedYear}:`, item.id);
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

// Update checklist item
export const updateChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, amount, categoryId, dueDay } = req.body;
        const userId = req.user!.id;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        const updated = await prisma.checklistItem.update({
            where: { id },
            data: {
                name: name || item.name,
                amount: amount ? parseFloat(amount) : item.amount,
                categoryId: categoryId || item.categoryId,
                dueDay: dueDay ? parseInt(dueDay) : item.dueDay
            },
            include: { category: true, completions: true }
        });

        console.log(`Item ${item.name} updated`);
        res.json(updated);
    } catch (error) {
        console.error('Update checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete checklist item (soft delete with timestamp from selected month)
export const deleteChecklistItem = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const { month, year } = req.query;

        const item = await prisma.checklistItem.findFirst({
            where: { id, userId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        // Parse month and year, default to current month
        const now = new Date();
        const selectedMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const selectedYear = year ? parseInt(year as string) : now.getFullYear();

        // Set deletedAt to the first day of the selected month
        const deletionDate = new Date(selectedYear, selectedMonth - 1, 1);

        await prisma.checklistItem.update({
            where: { id },
            data: {
                deletedAt: deletionDate,
                isActive: false
            }
        });

        console.log(`Item ${item.name} deleted from ${selectedMonth}/${selectedYear} onwards`);
        res.json({
            message: 'Checklist item deleted successfully',
            deletedFrom: `${selectedMonth}/${selectedYear}`
        });
    } catch (error) {
        console.error('Delete checklist item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
