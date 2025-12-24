import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// Get all payment reminders
export const getPaymentReminders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const reminders = await prisma.paymentReminder.findMany({
            where,
            include: {
                category: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { dueDay: 'asc' }
        });

        res.json(reminders);
    } catch (error) {
        console.error('Get payment reminders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get upcoming payments (next 7 days)
export const getUpcomingPayments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const today = new Date();
        const currentDay = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        // Get reminders for next 7 days
        const upcomingDays: number[] = [];
        for (let i = 0; i < 7; i++) {
            const day = (currentDay + i) % daysInMonth || daysInMonth;
            upcomingDays.push(day);
        }

        const reminders = await prisma.paymentReminder.findMany({
            where: {
                ...where,
                dueDay: { in: upcomingDays },
                isRecurring: true,
                isPaid: false
            },
            include: {
                category: true
            },
            orderBy: { dueDay: 'asc' }
        });

        res.json(reminders);
    } catch (error) {
        console.error('Get upcoming payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create payment reminder
export const createPaymentReminder = async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, categoryId, dueDay, isRecurring } = req.body;
        const userId = req.user!.id;

        if (!name || !amount || !categoryId || !dueDay) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (dueDay < 1 || dueDay > 31) {
            return res.status(400).json({ error: 'Due day must be between 1 and 31' });
        }

        const reminder = await prisma.paymentReminder.create({
            data: {
                userId,
                name,
                amount: parseFloat(amount),
                categoryId,
                dueDay: parseInt(dueDay),
                isRecurring: isRecurring !== undefined ? isRecurring : true
            },
            include: {
                category: true
            }
        });

        res.status(201).json(reminder);
    } catch (error) {
        console.error('Create payment reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark payment as paid
export const markAsPaid = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const reminder = await prisma.paymentReminder.findUnique({
            where: { id }
        });

        if (!reminder) {
            return res.status(404).json({ error: 'Payment reminder not found' });
        }

        if (userRole !== 'ADMIN' && reminder.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedReminder = await prisma.paymentReminder.update({
            where: { id },
            data: {
                isPaid: true,
                lastPaidDate: new Date()
            },
            include: {
                category: true
            }
        });

        res.json(updatedReminder);
    } catch (error) {
        console.error('Mark as paid error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update payment reminder
export const updatePaymentReminder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, amount, categoryId, dueDay, isRecurring, isPaid } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const reminder = await prisma.paymentReminder.findUnique({
            where: { id }
        });

        if (!reminder) {
            return res.status(404).json({ error: 'Payment reminder not found' });
        }

        if (userRole !== 'ADMIN' && reminder.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedReminder = await prisma.paymentReminder.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(amount && { amount: parseFloat(amount) }),
                ...(categoryId && { categoryId }),
                ...(dueDay && { dueDay: parseInt(dueDay) }),
                ...(isRecurring !== undefined && { isRecurring }),
                ...(isPaid !== undefined && { isPaid })
            },
            include: {
                category: true
            }
        });

        res.json(updatedReminder);
    } catch (error) {
        console.error('Update payment reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete payment reminder
export const deletePaymentReminder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const reminder = await prisma.paymentReminder.findUnique({
            where: { id }
        });

        if (!reminder) {
            return res.status(404).json({ error: 'Payment reminder not found' });
        }

        if (userRole !== 'ADMIN' && reminder.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.paymentReminder.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete payment reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
