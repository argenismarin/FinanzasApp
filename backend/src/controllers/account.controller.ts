import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// Get all bank accounts
export const getBankAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const accounts = await prisma.bankAccount.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: { transactions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const accountsWithBalance = accounts.map(account => ({
            ...account,
            balance: Number(account.balance)
        }));

        res.json(accountsWithBalance);
    } catch (error) {
        logger.fromError('account_get_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single account
export const getBankAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const account = await prisma.bankAccount.findUnique({
            where: { id },
            include: {
                transactions: {
                    include: {
                        category: true
                    },
                    orderBy: { date: 'desc' },
                    take: 20
                }
            }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (userRole !== 'ADMIN' && account.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json({
            ...account,
            balance: Number(account.balance)
        });
    } catch (error) {
        logger.fromError('account_get_one_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create bank account
export const createBankAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, balance, currency } = req.body;
        const userId = req.user!.id;

        if (!name || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validTypes = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid account type' });
        }

        const account = await prisma.bankAccount.create({
            data: {
                userId,
                name,
                type,
                balance: balance ? parseFloat(balance) : 0,
                currency: currency || 'COP'
            }
        });

        res.status(201).json(account);
    } catch (error) {
        logger.fromError('account_create_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update bank account
export const updateBankAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, balance, currency, isActive } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const account = await prisma.bankAccount.findUnique({
            where: { id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (userRole !== 'ADMIN' && account.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedAccount = await prisma.bankAccount.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(balance !== undefined && { balance: parseFloat(balance) }),
                ...(currency && { currency }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json(updatedAccount);
    } catch (error) {
        logger.fromError('account_update_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete bank account
export const deleteBankAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const account = await prisma.bankAccount.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (userRole !== 'ADMIN' && account.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (account._count.transactions > 0) {
            return res.status(400).json({
                error: 'Cannot delete account with transactions. Archive it instead.'
            });
        }

        await prisma.bankAccount.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        logger.fromError('account_delete_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
