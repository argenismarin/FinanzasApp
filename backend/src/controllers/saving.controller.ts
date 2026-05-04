import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

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
        logger.fromError('saving_get_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new saving
export const createSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, purpose, accountId } = req.body;
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

        // Validate bank account if provided
        if (accountId) {
            const account = await prisma.bankAccount.findFirst({
                where: { id: accountId, userId }
            });
            if (!account) {
                return res.status(404).json({ error: 'Bank account not found' });
            }
        }

        const parsedAmount = parseFloat(amount);

        // Create expense transaction and saving atomically
        const saving = await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
                data: {
                    userId,
                    amount: parsedAmount,
                    type: 'EXPENSE',
                    categoryId: savingsCategory.id,
                    description: `Ahorro en: ${name}`,
                    date: new Date(),
                    accountId: accountId || null,
                    createdBy: userId
                }
            });

            // Debit bank account if provided
            if (accountId) {
                await tx.bankAccount.update({
                    where: { id: accountId },
                    data: { balance: { decrement: parsedAmount } }
                });
            }

            return tx.saving.create({
                data: {
                    userId,
                    name,
                    amount: parsedAmount,
                    purpose
                }
            });
        });

        res.status(201).json(saving);
    } catch (error) {
        logger.fromError('saving_create_failed', error);
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
        logger.fromError('saving_update_failed', error);
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
        logger.fromError('saving_delete_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Withdraw from saving to make it available
export const withdrawFromSaving = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, accountId } = req.body;
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

        // Validate bank account if provided
        if (accountId) {
            const account = await prisma.bankAccount.findFirst({
                where: { id: accountId, userId }
            });
            if (!account) {
                return res.status(404).json({ error: 'Bank account not found' });
            }
        }

        // Create income transaction and update saving atomically
        const newAmount = currentAmount - withdrawAmount;
        await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
                data: {
                    userId,
                    amount: withdrawAmount,
                    type: 'INCOME',
                    categoryId: savingsCategory.id,
                    description: `Retiro de: ${saving.name}`,
                    date: new Date(),
                    accountId: accountId || null,
                    createdBy: userId
                }
            });

            // Credit bank account if provided
            if (accountId) {
                await tx.bankAccount.update({
                    where: { id: accountId },
                    data: { balance: { increment: withdrawAmount } }
                });
            }

            if (newAmount === 0) {
                await tx.saving.delete({ where: { id } });
            } else {
                await tx.saving.update({
                    where: { id },
                    data: { amount: newAmount }
                });
            }
        });

        res.json({
            message: 'Withdrawal successful',
            withdrawnAmount: withdrawAmount,
            remainingAmount: newAmount
        });
    } catch (error) {
        logger.fromError('saving_withdraw_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
