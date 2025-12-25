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

// Get all debts for user
export const getDebts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const debts = await prisma.debt.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate pending amount for each debt
        const debtsWithPending = debts.map(debt => ({
            ...debt,
            pendingAmount: Number(debt.totalAmount) - Number(debt.paidAmount)
        }));

        res.json(debtsWithPending);
    } catch (error) {
        console.error('Get debts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new debt
export const createDebt = async (req: AuthRequest, res: Response) => {
    try {
        const { creditor, totalAmount, description, dueDate } = req.body;
        const userId = req.user!.id;

        if (!creditor || !totalAmount) {
            return res.status(400).json({ error: 'Creditor and totalAmount are required' });
        }

        const debt = await prisma.debt.create({
            data: {
                userId,
                creditor,
                totalAmount: parseFloat(totalAmount),
                paidAmount: 0,
                description,
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });

        res.status(201).json(debt);
    } catch (error) {
        console.error('Create debt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update debt
export const updateDebt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { creditor, totalAmount, description, dueDate } = req.body;
        const userId = req.user!.id;

        const debt = await prisma.debt.findFirst({
            where: { id, userId }
        });

        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        const updated = await prisma.debt.update({
            where: { id },
            data: {
                creditor: creditor || debt.creditor,
                totalAmount: totalAmount ? parseFloat(totalAmount) : debt.totalAmount,
                description: description !== undefined ? description : debt.description,
                dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : debt.dueDate
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update debt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Register payment for debt
export const payDebt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const userId = req.user!.id;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Valid payment amount is required' });
        }

        const debt = await prisma.debt.findFirst({
            where: { id, userId }
        });

        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        const newPaidAmount = Number(debt.paidAmount) + parseFloat(amount);
        const totalAmount = Number(debt.totalAmount);

        if (newPaidAmount > totalAmount) {
            return res.status(400).json({ error: 'Payment exceeds total debt amount' });
        }

        const updated = await prisma.debt.update({
            where: { id },
            data: {
                paidAmount: newPaidAmount
            }
        });

        res.json({
            ...updated,
            pendingAmount: totalAmount - newPaidAmount,
            message: newPaidAmount === totalAmount ? 'Debt fully paid!' : 'Payment registered'
        });
    } catch (error) {
        console.error('Pay debt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete debt
export const deleteDebt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const debt = await prisma.debt.findFirst({
            where: { id, userId }
        });

        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        await prisma.debt.delete({
            where: { id }
        });

        res.json({ message: 'Debt deleted successfully' });
    } catch (error) {
        console.error('Delete debt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
