import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { NotificationService } from '../services/notification.service';

// Log estructurado JSON — fácil de parsear en Vercel logs
function cronLog(level: 'info' | 'warn' | 'error', event: string, data: Record<string, any> = {}) {
    console.log(JSON.stringify({
        ts: new Date().toISOString(),
        scope: 'cron',
        level,
        event,
        ...data
    }));
}

export const handleCronJob = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
        // Validate CRON_SECRET is configured
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            cronLog('error', 'cron_secret_missing');
            return res.status(500).json({ error: 'CRON_SECRET not configured' });
        }

        // Validate authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
            cronLog('warn', 'cron_unauthorized', { ip: req.ip });
            return res.status(401).json({ error: 'Unauthorized' });
        }

        cronLog('info', 'cron_started');

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Fetch all users who have active recurring transactions with autoCreate and pending execution
        const pendingRecurring = await prisma.recurringTransaction.findMany({
            where: {
                isActive: true,
                autoCreate: true,
                nextExecution: { lte: today }
            },
            orderBy: { nextExecution: 'asc' }
        });

        cronLog('info', 'pending_fetched', { count: pendingRecurring.length });

        // Group by userId
        const userRecurringMap = new Map<string, typeof pendingRecurring>();
        for (const recurring of pendingRecurring) {
            const existing = userRecurringMap.get(recurring.userId) || [];
            existing.push(recurring);
            userRecurringMap.set(recurring.userId, existing);
        }

        const userResults: Array<{
            userId: string;
            executed: number;
            failed: number;
            results: Array<{
                id: string;
                description: string;
                status: string;
                transactionId?: string;
                error?: string;
            }>;
        }> = [];

        // Process each user's pending recurring transactions
        for (const [userId, recurringList] of userRecurringMap) {
            const results: Array<{
                id: string;
                description: string;
                status: string;
                transactionId?: string;
                error?: string;
            }> = [];

            for (const recurring of recurringList) {
                try {
                    // Calculate next execution date based on frequency
                    let nextExecution = new Date(recurring.nextExecution);
                    switch (recurring.frequency) {
                        case 'DAILY':
                            nextExecution.setDate(nextExecution.getDate() + 1);
                            break;
                        case 'WEEKLY':
                            nextExecution.setDate(nextExecution.getDate() + 7);
                            break;
                        case 'BIWEEKLY':
                            nextExecution.setDate(nextExecution.getDate() + 14);
                            break;
                        case 'MONTHLY':
                            nextExecution.setMonth(nextExecution.getMonth() + 1);
                            break;
                        case 'QUARTERLY':
                            nextExecution.setMonth(nextExecution.getMonth() + 3);
                            break;
                        case 'YEARLY':
                            nextExecution.setFullYear(nextExecution.getFullYear() + 1);
                            break;
                    }

                    // Saltar si la nextExecution ya pasó endDate — desactivar sin crear
                    if (recurring.endDate && recurring.nextExecution > recurring.endDate) {
                        await prisma.recurringTransaction.update({
                            where: { id: recurring.id },
                            data: { isActive: false }
                        });
                        cronLog('info', 'recurring_skipped_past_end_date', {
                            recurringId: recurring.id,
                            description: recurring.description
                        });
                        results.push({
                            id: recurring.id,
                            description: recurring.description,
                            status: 'skipped'
                        });
                        continue;
                    }

                    const shouldDeactivate = !!(recurring.endDate && nextExecution > recurring.endDate);

                    // Idempotency check: ¿ya existe una Transaction con este (recurringId, scheduledFor)?
                    // Previene duplicados si Vercel re-ejecuta el cron por timeout parcial.
                    const idempotencyKey = `${recurring.id}:${recurring.nextExecution.toISOString()}`;
                    const existingTx = await prisma.transaction.findFirst({
                        where: {
                            userId,
                            isRecurring: true,
                            recurringPattern: { contains: `"idempotencyKey":"${idempotencyKey}"` }
                        },
                        select: { id: true }
                    });
                    if (existingTx) {
                        cronLog('info', 'recurring_idempotent_skip', {
                            recurringId: recurring.id,
                            existingTransactionId: existingTx.id,
                            idempotencyKey
                        });
                        results.push({
                            id: recurring.id,
                            description: recurring.description,
                            status: 'success',
                            transactionId: existingTx.id
                        });
                        continue;
                    }

                    // Create transaction and update recurring atomically
                    const transaction = await prisma.$transaction(async (tx) => {
                        const created = await tx.transaction.create({
                            data: {
                                userId,
                                type: recurring.type,
                                amount: recurring.amount,
                                categoryId: recurring.categoryId,
                                description: `${recurring.description} (Auto)`,
                                date: new Date(),
                                isRecurring: true,
                                accountId: recurring.accountId || null,
                                recurringPattern: JSON.stringify({
                                    recurringId: recurring.id,
                                    frequency: recurring.frequency,
                                    idempotencyKey
                                })
                            }
                        });

                        // Update bank account balance if linked
                        if (recurring.accountId) {
                            const amountNum = Number(recurring.amount);
                            if (recurring.type === 'EXPENSE') {
                                await tx.bankAccount.update({
                                    where: { id: recurring.accountId },
                                    data: { balance: { decrement: amountNum } }
                                });
                            } else {
                                await tx.bankAccount.update({
                                    where: { id: recurring.accountId },
                                    data: { balance: { increment: amountNum } }
                                });
                            }
                        }

                        await tx.recurringTransaction.update({
                            where: { id: recurring.id },
                            data: {
                                lastExecuted: new Date(),
                                nextExecution,
                                isActive: !shouldDeactivate
                            }
                        });

                        return created;
                    });

                    cronLog('info', 'recurring_executed', {
                        recurringId: recurring.id,
                        userId,
                        transactionId: transaction.id,
                        amount: Number(recurring.amount),
                        type: recurring.type
                    });
                    results.push({
                        id: recurring.id,
                        description: recurring.description,
                        status: 'success',
                        transactionId: transaction.id
                    });
                } catch (err: any) {
                    cronLog('error', 'recurring_failed', {
                        recurringId: recurring.id,
                        userId,
                        error: err?.message || 'unknown'
                    });
                    results.push({
                        id: recurring.id,
                        description: recurring.description,
                        status: 'error',
                        error: 'Error al crear transacción'
                    });
                }
            }

            // Run notification checks for this user
            try {
                await NotificationService.runAllChecks(userId);
            } catch (err: any) {
                cronLog('error', 'notification_checks_failed', {
                    userId,
                    error: err?.message || 'unknown'
                });
            }

            userResults.push({
                userId,
                executed: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'error').length,
                results
            });
        }

        const totalExecuted = userResults.reduce((sum, u) => sum + u.executed, 0);
        const totalFailed = userResults.reduce((sum, u) => sum + u.failed, 0);
        const durationMs = Date.now() - startedAt;

        cronLog('info', 'cron_completed', {
            usersProcessed: userResults.length,
            totalExecuted,
            totalFailed,
            durationMs
        });

        res.json({
            success: true,
            summary: {
                usersProcessed: userResults.length,
                totalExecuted,
                totalFailed,
                durationMs
            },
            users: userResults
        });
    } catch (error: any) {
        cronLog('error', 'cron_unhandled_error', {
            error: error?.message || 'unknown',
            durationMs: Date.now() - startedAt
        });
        res.status(500).json({ error: 'Error executing cron job' });
    }
};
