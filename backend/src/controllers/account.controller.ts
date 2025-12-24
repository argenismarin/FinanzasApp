import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

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
        console.error('Get bank accounts error:', error);
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
        console.error('Get bank account error:', error);
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
        console.error('Create bank account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Transfer between accounts
export const transferBetweenAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const { fromAccountId, toAccountId, amount, description } = req.body;
        const userId = req.user!.id;

        if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid transfer data' });
        }

        // Get both accounts
        const [fromAccount, toAccount] = await Promise.all([
            prisma.bankAccount.findUnique({ where: { id: fromAccountId } }),
            prisma.bankAccount.findUnique({ where: { id: toAccountId } })
        ]);

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (fromAccount.userId !== userId || toAccount.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const transferAmount = parseFloat(amount);

        // Check sufficient balance
        if (Number(fromAccount.balance) < transferAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Update balances
        await Promise.all([
            prisma.bankAccount.update({
                where: { id: fromAccountId },
                data: { balance: Number(fromAccount.balance) - transferAmount }
            }),
            prisma.bankAccount.update({
                where: { id: toAccountId },
                data: { balance: Number(toAccount.balance) + transferAmount }
            })
        ]);

        res.json({
            message: 'Transfer successful',
            from: fromAccount.name,
            to: toAccount.name,
            amount: transferAmount
        });
    } catch (error) {
        console.error('Transfer error:', error);
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
        console.error('Update bank account error:', error);
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
        console.error('Delete bank account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
