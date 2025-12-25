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

// Get all savings for user
export const getSavings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const savings = await prisma.saving.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(savings);
    } catch (error) {
        console.error('Get savings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new saving
export const createSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, purpose } = req.body;
        const userId = req.user!.id;

        if (!name || !amount) {
            return res.status(400).json({ error: 'Name and amount are required' });
        }

        // Get or create a default category for savings deposit
        let savingsCategory = await prisma.category.findFirst({
            where: {
                userId,
                name: 'Ahorro en Cajita'
            }
        });

        if (!savingsCategory) {
            savingsCategory = await prisma.category.create({
                data: {
                    userId,
                    name: 'Ahorro en Cajita',
                    type: 'EXPENSE',
                    color: '#10b981',
                    icon: '🏦'
                }
            });
        }

        // Create expense transaction for putting money in savings
        await prisma.transaction.create({
            data: {
                userId,
                amount: parseFloat(amount),
                type: 'EXPENSE',
                categoryId: savingsCategory.id,
                description: `Ahorro en: ${name}`,
                date: new Date(),
                createdBy: userId
            }
        });

        const saving = await prisma.saving.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                purpose
            }
        });

        res.status(201).json(saving);
    } catch (error) {
        console.error('Create saving error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update saving
export const updateSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, amount, purpose } = req.body;
        const userId = req.user!.id;

        const saving = await prisma.saving.findFirst({
            where: { id, userId }
        });

        if (!saving) {
            return res.status(404).json({ error: 'Saving not found' });
        }

        const updated = await prisma.saving.update({
            where: { id },
            data: {
                name: name || saving.name,
                amount: amount ? parseFloat(amount) : saving.amount,
                purpose: purpose !== undefined ? purpose : saving.purpose
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update saving error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete saving
export const deleteSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const saving = await prisma.saving.findFirst({
            where: { id, userId }
        });

        if (!saving) {
            return res.status(404).json({ error: 'Saving not found' });
        }

        await prisma.saving.delete({
            where: { id }
        });

        res.json({ message: 'Saving deleted successfully' });
    } catch (error) {
        console.error('Delete saving error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Withdraw from saving to make it available
export const withdrawFromSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const userId = req.user!.id;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const saving = await prisma.saving.findFirst({
            where: { id, userId }
        });

        if (!saving) {
            return res.status(404).json({ error: 'Saving not found' });
        }

        const withdrawAmount = parseFloat(amount);
        const currentAmount = Number(saving.amount);

        if (withdrawAmount > currentAmount) {
            return res.status(400).json({ error: 'Insufficient funds in saving' });
        }

        // Get or create a default category for savings withdrawal
        let savingsCategory = await prisma.category.findFirst({
            where: {
                userId,
                name: 'Retiro de Ahorros'
            }
        });

        if (!savingsCategory) {
            savingsCategory = await prisma.category.create({
                data: {
                    userId,
                    name: 'Retiro de Ahorros',
                    type: 'INCOME',
                    color: '#10b981',
                    icon: '🏦'
                }
            });
        }

        // Create income transaction for withdrawal
        await prisma.transaction.create({
            data: {
                userId,
                amount: withdrawAmount,
                type: 'INCOME',
                categoryId: savingsCategory.id,
                description: `Retiro de: ${saving.name}`,
                date: new Date(),
                createdBy: userId
            }
        });

        // Update or delete saving
        const newAmount = currentAmount - withdrawAmount;
        if (newAmount === 0) {
            await prisma.saving.delete({ where: { id } });
        } else {
            await prisma.saving.update({
                where: { id },
                data: { amount: newAmount }
            });
        }

        res.json({
            message: 'Withdrawal successful',
            withdrawnAmount: withdrawAmount,
            remainingAmount: newAmount
        });
    } catch (error) {
        console.error('Withdraw from saving error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
