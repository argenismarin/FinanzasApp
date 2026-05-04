import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { parseAmount, parseDateSafe } from '../lib/validation';
import { logger } from '../lib/logger';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Calcula la siguiente ejecución según la frecuencia (mutuamente reusable)
function advanceDate(from: Date, frequency: string): Date {
    const next = new Date(from);
    switch (frequency) {
        case 'DAILY':     next.setDate(next.getDate() + 1); break;
        case 'WEEKLY':    next.setDate(next.getDate() + 7); break;
        case 'BIWEEKLY':  next.setDate(next.getDate() + 14); break;
        case 'MONTHLY':   next.setMonth(next.getMonth() + 1); break;
        case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
        case 'YEARLY':    next.setFullYear(next.getFullYear() + 1); break;
    }
    return next;
}

// Obtener todas las transacciones recurrentes del usuario
export const getRecurringTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const recurring = await prisma.recurringTransaction.findMany({
            where: { userId, isActive: true },
            orderBy: { nextExecution: 'asc' }
        });

        res.json(recurring.map(r => ({
            ...r,
            amount: Number(r.amount)
        })));
    } catch (error) {
        logger.fromError('recurring_get_failed', error);
        res.status(500).json({ error: 'Error al obtener transacciones recurrentes' });
    }
};

// Crear transacción recurrente
export const createRecurringTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const {
            type,
            amount,
            categoryId,
            description,
            frequency,
            dayOfMonth,
            dayOfWeek,
            startDate,
            endDate,
            autoCreate,
            accountId
        } = req.body;

        if (!type || amount === undefined || amount === null || !categoryId || !description || !frequency) {
            return res.status(400).json({
                error: 'Tipo, monto, categoría, descripción y frecuencia son requeridos'
            });
        }

        const parsedAmount = parseAmount(amount);
        if (parsedAmount === null) {
            return res.status(400).json({ error: 'Monto inválido. Debe ser un número positivo.' });
        }

        // Calcular próxima ejecución
        const start = parseDateSafe(startDate) || new Date();
        let nextExecution = new Date(start);

        // Ajustar según la frecuencia
        switch (frequency) {
            case 'DAILY':
                // Ya está configurado
                break;
            case 'WEEKLY':
                if (dayOfWeek !== undefined) {
                    const currentDay = start.getDay();
                    const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                    nextExecution.setDate(nextExecution.getDate() + daysToAdd);
                }
                break;
            case 'BIWEEKLY':
                if (dayOfWeek !== undefined) {
                    const currentDay = start.getDay();
                    const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                    nextExecution.setDate(nextExecution.getDate() + daysToAdd);
                }
                break;
            case 'MONTHLY':
            case 'QUARTERLY':
            case 'YEARLY':
                if (dayOfMonth) {
                    nextExecution.setDate(dayOfMonth);
                    if (nextExecution < start) {
                        nextExecution.setMonth(nextExecution.getMonth() + 1);
                    }
                }
                break;
        }

        const endDateParsed = parseDateSafe(endDate);

        // Si la primera ejecución ya excede endDate, rechazar (no tiene sentido crearla)
        if (endDateParsed && nextExecution > endDateParsed) {
            return res.status(400).json({
                error: 'La fecha de fin es anterior a la primera ejecución calculada'
            });
        }

        const recurring = await prisma.recurringTransaction.create({
            data: {
                userId: userId!,
                type,
                amount: parsedAmount,
                categoryId,
                description,
                frequency,
                dayOfMonth: dayOfMonth || null,
                dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
                startDate: start,
                endDate: endDateParsed,
                nextExecution,
                autoCreate: autoCreate || false,
                accountId: accountId || null,
                isActive: true
            }
        });

        res.status(201).json({
            ...recurring,
            amount: Number(recurring.amount)
        });
    } catch (error) {
        logger.fromError('recurring_create_failed', error);
        res.status(500).json({ error: 'Error al crear transacción recurrente' });
    }
};

// Actualizar transacción recurrente
export const updateRecurringTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const updateData = req.body;

        const existing = await prisma.recurringTransaction.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transacción recurrente no encontrada' });
        }

        const recurring = await prisma.recurringTransaction.update({
            where: { id },
            data: {
                type: updateData.type,
                amount: updateData.amount,
                categoryId: updateData.categoryId,
                description: updateData.description,
                frequency: updateData.frequency,
                dayOfMonth: updateData.dayOfMonth,
                dayOfWeek: updateData.dayOfWeek,
                endDate: updateData.endDate ? new Date(updateData.endDate) : null,
                autoCreate: updateData.autoCreate,
                ...(updateData.accountId !== undefined && { accountId: updateData.accountId || null })
            }
        });

        res.json({
            ...recurring,
            amount: Number(recurring.amount)
        });
    } catch (error) {
        logger.fromError('recurring_update_failed', error);
        res.status(500).json({ error: 'Error al actualizar transacción recurrente' });
    }
};

// Eliminar (desactivar) transacción recurrente
export const deleteRecurringTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const existing = await prisma.recurringTransaction.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transacción recurrente no encontrada' });
        }

        await prisma.recurringTransaction.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Transacción recurrente eliminada' });
    } catch (error) {
        logger.fromError('recurring_delete_failed', error);
        res.status(500).json({ error: 'Error al eliminar transacción recurrente' });
    }
};

// Ejecutar transacción recurrente manualmente
export const executeRecurringTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const recurring = await prisma.recurringTransaction.findFirst({
            where: { id, userId, isActive: true }
        });

        if (!recurring) {
            return res.status(404).json({ error: 'Transacción recurrente no encontrada' });
        }

        // Bloquear si la fecha actual ya pasó endDate (no tiene sentido crear)
        const now = new Date();
        if (recurring.endDate && recurring.nextExecution > recurring.endDate) {
            // Marcar inactiva sin crear nada
            await prisma.recurringTransaction.update({
                where: { id },
                data: { isActive: false }
            });
            return res.status(400).json({
                error: 'La transacción recurrente ya pasó su fecha de finalización'
            });
        }

        const nextExecution = advanceDate(recurring.nextExecution, recurring.frequency);
        const shouldDeactivate = !!(recurring.endDate && nextExecution > recurring.endDate);

        // Crear transacción y actualizar recurrente atómicamente
        const transaction = await prisma.$transaction(async (tx) => {
            const created = await tx.transaction.create({
                data: {
                    userId: userId!,
                    type: recurring.type,
                    amount: recurring.amount,
                    categoryId: recurring.categoryId,
                    description: `${recurring.description} (Recurrente)`,
                    date: new Date(),
                    isRecurring: true,
                    accountId: recurring.accountId || null,
                    recurringPattern: JSON.stringify({
                        recurringId: recurring.id,
                        frequency: recurring.frequency
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
                where: { id },
                data: {
                    lastExecuted: new Date(),
                    nextExecution,
                    isActive: !shouldDeactivate
                }
            });

            return created;
        });

        res.json({
            message: 'Transacción creada exitosamente',
            transaction: {
                ...transaction,
                amount: Number(transaction.amount)
            }
        });
    } catch (error) {
        logger.fromError('recurring_execute_failed', error);
        res.status(500).json({ error: 'Error al ejecutar transacción' });
    }
};

// Obtener transacciones pendientes de ejecución
export const getPendingRecurringTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const pending = await prisma.recurringTransaction.findMany({
            where: {
                userId,
                isActive: true,
                nextExecution: { lte: today }
            },
            orderBy: { nextExecution: 'asc' }
        });

        res.json(pending.map(r => ({
            ...r,
            amount: Number(r.amount)
        })));
    } catch (error) {
        logger.fromError('recurring_get_pending_failed', error);
        res.status(500).json({ error: 'Error al obtener transacciones pendientes' });
    }
};

// Ejecutar todas las transacciones pendientes automáticamente
export const executeAllPendingRecurring = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const pending = await prisma.recurringTransaction.findMany({
            where: {
                userId,
                isActive: true,
                autoCreate: true,
                nextExecution: { lte: today }
            }
        });

        const results = [];

        for (const recurring of pending) {
            try {
                // Saltar si ya pasó endDate — marcar inactiva sin crear
                if (recurring.endDate && recurring.nextExecution > recurring.endDate) {
                    await prisma.recurringTransaction.update({
                        where: { id: recurring.id },
                        data: { isActive: false }
                    });
                    results.push({
                        id: recurring.id,
                        description: recurring.description,
                        status: 'skipped',
                        error: 'Fecha de fin alcanzada'
                    });
                    continue;
                }

                const nextExecution = advanceDate(recurring.nextExecution, recurring.frequency);
                const shouldDeactivate = !!(recurring.endDate && nextExecution > recurring.endDate);

                // Crear transacción y actualizar recurrente atómicamente
                const transaction = await prisma.$transaction(async (tx) => {
                    const created = await tx.transaction.create({
                        data: {
                            userId: userId!,
                            type: recurring.type,
                            amount: recurring.amount,
                            categoryId: recurring.categoryId,
                            description: `${recurring.description} (Auto)`,
                            date: new Date(),
                            isRecurring: true,
                            accountId: recurring.accountId || null,
                            recurringPattern: JSON.stringify({
                                recurringId: recurring.id,
                                frequency: recurring.frequency
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

                results.push({
                    id: recurring.id,
                    description: recurring.description,
                    status: 'success',
                    transactionId: transaction.id
                });
            } catch (err) {
                results.push({
                    id: recurring.id,
                    description: recurring.description,
                    status: 'error',
                    error: 'Error al crear transacción'
                });
            }
        }

        res.json({
            executed: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
            results
        });
    } catch (error) {
        logger.fromError('recurring_execute_all_failed', error);
        res.status(500).json({ error: 'Error al ejecutar transacciones' });
    }
};
