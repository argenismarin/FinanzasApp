import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// Get all savings goals
export const getSavingsGoals = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = userRole === 'ADMIN' ? {} : { userId };

        const goals = await prisma.savingsGoal.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            currentAmount: Number(goal.currentAmount),
            targetAmount: Number(goal.targetAmount),
            percentage: Number(goal.targetAmount) > 0
                ? Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 * 100) / 100
                : 0,
            remaining: Number(goal.targetAmount) - Number(goal.currentAmount)
        }));

        res.json(goalsWithProgress);
    } catch (error) {
        logger.fromError('goal_get_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single goal
export const getSavingsGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const goal = await prisma.savingsGoal.findUnique({
            where: { id }
        });

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        if (userRole !== 'ADMIN' && goal.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json({
            ...goal,
            currentAmount: Number(goal.currentAmount),
            targetAmount: Number(goal.targetAmount),
            percentage: Number(goal.targetAmount) > 0
                ? Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 * 100) / 100
                : 0,
            remaining: Number(goal.targetAmount) - Number(goal.currentAmount)
        });
    } catch (error) {
        logger.fromError('goal_get_one_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create savings goal
export const createSavingsGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { name, targetAmount, deadline } = req.body;
        const userId = req.user!.id;

        if (!name || !targetAmount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const goal = await prisma.savingsGoal.create({
            data: {
                userId,
                name,
                targetAmount: parseFloat(targetAmount),
                deadline: deadline ? new Date(deadline) : null
            }
        });

        res.status(201).json(goal);
    } catch (error) {
        logger.fromError('goal_create_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Contribute to goal
export const contributeToGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, accountId } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const goal = await prisma.savingsGoal.findUnique({
            where: { id }
        });

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        if (userRole !== 'ADMIN' && goal.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
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

        // Get or create goal contribution category
        let goalCategory = await prisma.category.findFirst({
            where: { userId, name: 'Aporte a Meta' }
        });
        if (!goalCategory) {
            goalCategory = await prisma.category.create({
                data: {
                    userId,
                    name: 'Aporte a Meta',
                    type: 'EXPENSE',
                    color: '#f59e0b',
                    icon: '🎯'
                }
            });
        }

        const contributionAmount = parseFloat(amount);
        const newAmount = Number(goal.currentAmount) + contributionAmount;
        const isCompleted = newAmount >= Number(goal.targetAmount);

        const updatedGoal = await prisma.$transaction(async (tx) => {
            // Create expense transaction
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'EXPENSE',
                    amount: contributionAmount,
                    categoryId: goalCategory!.id,
                    description: `Aporte a meta: ${goal.name}`,
                    date: new Date(),
                    accountId: accountId || null,
                    createdBy: userId
                }
            });

            // Debit bank account if provided
            if (accountId) {
                await tx.bankAccount.update({
                    where: { id: accountId },
                    data: { balance: { decrement: contributionAmount } }
                });
            }

            // Update goal
            return tx.savingsGoal.update({
                where: { id },
                data: {
                    currentAmount: newAmount,
                    isCompleted
                }
            });
        });

        res.json(updatedGoal);
    } catch (error) {
        logger.fromError('goal_contribute_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update savings goal
export const updateSavingsGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, targetAmount, currentAmount, deadline, isCompleted } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const goal = await prisma.savingsGoal.findUnique({
            where: { id }
        });

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        if (userRole !== 'ADMIN' && goal.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedGoal = await prisma.savingsGoal.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(targetAmount && { targetAmount: parseFloat(targetAmount) }),
                ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                ...(isCompleted !== undefined && { isCompleted })
            }
        });

        res.json(updatedGoal);
    } catch (error) {
        logger.fromError('goal_update_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete savings goal
export const deleteSavingsGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const goal = await prisma.savingsGoal.findUnique({
            where: { id }
        });

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        if (userRole !== 'ADMIN' && goal.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.savingsGoal.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        logger.fromError('goal_delete_failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
