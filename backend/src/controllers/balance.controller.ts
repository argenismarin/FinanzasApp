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

// Get complete financial balance
export const getBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Get all transactions to calculate bank balance
        const transactions = await prisma.transaction.findMany({
            where: { userId }
        });

        let bankBalance = 0;
        transactions.forEach(transaction => {
            const amount = Number(transaction.amount);
            if (transaction.type === 'INCOME') {
                bankBalance += amount;
            } else {
                bankBalance -= amount;
            }
        });

        // Get total savings
        const savings = await prisma.saving.findMany({
            where: { userId }
        });

        const totalSavings = savings.reduce((sum, saving) => {
            return sum + Number(saving.amount);
        }, 0);

        // Get total debts (pending amount)
        const debts = await prisma.debt.findMany({
            where: { userId }
        });

        const totalDebts = debts.reduce((sum, debt) => {
            const pending = Number(debt.totalAmount) - Number(debt.paidAmount);
            return sum + pending;
        }, 0);

        // Calculate metrics
        const netWorth = bankBalance + totalSavings - totalDebts;
        const availableToSpend = bankBalance - totalSavings;

        res.json({
            bankBalance,
            totalSavings,
            totalDebts,
            netWorth,
            availableToSpend,
            breakdown: {
                savingsCount: savings.length,
                debtsCount: debts.length,
                transactionsCount: transactions.length
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
