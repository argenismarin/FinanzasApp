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

        // Calculate pending for each debt
        const debtsWithPending = debts.map(debt => ({
            ...debt,
            pendingAmount: Number(debt.totalAmount) - Number(debt.paidAmount)
        }));

        // Only count POSITIVE pending amounts as debts
        // Negative amounts are abonos/payments, not debts
        const totalDebts = debtsWithPending.reduce((sum, debt) => {
            if (debt.pendingAmount > 0) {
                return sum + debt.pendingAmount;
            }
            return sum;
        }, 0);

        // Count only debts with positive pending (not abonos)
        const actualDebtsCount = debtsWithPending.filter(d => d.pendingAmount > 0).length;

        // Calculate metrics
        const netWorth = bankBalance + totalSavings - totalDebts;
        // Savings are NOT in the bank, they're physically stored separately
        // So available to spend is simply what's in the bank
        const availableToSpend = bankBalance;

        res.json({
            bankBalance,
            totalSavings,
            totalDebts,
            netWorth,
            availableToSpend,
            breakdown: {
                savingsCount: savings.length,
                debtsCount: actualDebtsCount, // Only positive debts
                transactionsCount: transactions.length
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
