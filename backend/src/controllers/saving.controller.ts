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
