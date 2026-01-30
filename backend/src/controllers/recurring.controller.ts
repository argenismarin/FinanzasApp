import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener todas las transacciones recurrentes del usuario
export const getRecurringTransactions = async (req: Request, res: Response) => {
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
        console.error('Error fetching recurring transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones recurrentes' });
    }
};

// Crear transacción recurrente
export const createRecurringTransaction = async (req: Request, res: Response) => {
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
            autoCreate
        } = req.body;

        if (!type || !amount || !categoryId || !description || !frequency) {
            return res.status(400).json({
                error: 'Tipo, monto, categoría, descripción y frecuencia son requeridos'
            });
        }

        // Calcular próxima ejecución
        const start = new Date(startDate || Date.now());
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
                if (dayOfMonth) {
                    nextExecution.setDate(dayOfMonth);
                    if (nextExecution < start) {
                        nextExecution.setDate(nextExecution.getDate() + 14);
                    }
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

        const recurring = await prisma.recurringTransaction.create({
            data: {
                userId: userId!,
                type,
                amount,
                categoryId,
                description,
                frequency,
                dayOfMonth: dayOfMonth || null,
                dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
                startDate: start,
                endDate: endDate ? new Date(endDate) : null,
                nextExecution,
                autoCreate: autoCreate || false,
                isActive: true
            }
        });

        res.status(201).json({
            ...recurring,
            amount: Number(recurring.amount)
        });
    } catch (error) {
        console.error('Error creating recurring transaction:', error);
        res.status(500).json({ error: 'Error al crear transacción recurrente' });
    }
};

// Actualizar transacción recurrente
export const updateRecurringTransaction = async (req: Request, res: Response) => {
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
                autoCreate: updateData.autoCreate
            }
        });

        res.json({
            ...recurring,
            amount: Number(recurring.amount)
        });
    } catch (error) {
        console.error('Error updating recurring transaction:', error);
        res.status(500).json({ error: 'Error al actualizar transacción recurrente' });
    }
};

// Eliminar (desactivar) transacción recurrente
export const deleteRecurringTransaction = async (req: Request, res: Response) => {
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
        console.error('Error deleting recurring transaction:', error);
        res.status(500).json({ error: 'Error al eliminar transacción recurrente' });
    }
};

// Ejecutar transacción recurrente manualmente
export const executeRecurringTransaction = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const recurring = await prisma.recurringTransaction.findFirst({
            where: { id, userId, isActive: true }
        });

        if (!recurring) {
            return res.status(404).json({ error: 'Transacción recurrente no encontrada' });
        }

        // Crear la transacción
        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                type: recurring.type,
                amount: recurring.amount,
                categoryId: recurring.categoryId,
                description: `${recurring.description} (Recurrente)`,
                date: new Date(),
                isRecurring: true,
                recurringPattern: {
                    recurringId: recurring.id,
                    frequency: recurring.frequency
                }
            }
        });

        // Calcular próxima ejecución
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

        // Verificar si debe desactivarse
        let shouldDeactivate = false;
        if (recurring.endDate && nextExecution > recurring.endDate) {
            shouldDeactivate = true;
        }

        await prisma.recurringTransaction.update({
            where: { id },
            data: {
                lastExecuted: new Date(),
                nextExecution,
                isActive: shouldDeactivate ? false : true
            }
        });

        res.json({
            message: 'Transacción creada exitosamente',
            transaction: {
                ...transaction,
                amount: Number(transaction.amount)
            }
        });
    } catch (error) {
        console.error('Error executing recurring transaction:', error);
        res.status(500).json({ error: 'Error al ejecutar transacción' });
    }
};

// Obtener transacciones pendientes de ejecución
export const getPendingRecurringTransactions = async (req: Request, res: Response) => {
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
        console.error('Error fetching pending recurring transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones pendientes' });
    }
};

// Ejecutar todas las transacciones pendientes automáticamente
export const executeAllPendingRecurring = async (req: Request, res: Response) => {
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
                // Crear la transacción
                const transaction = await prisma.transaction.create({
                    data: {
                        userId: userId!,
                        type: recurring.type,
                        amount: recurring.amount,
                        categoryId: recurring.categoryId,
                        description: `${recurring.description} (Auto)`,
                        date: new Date(),
                        isRecurring: true,
                        recurringPattern: {
                            recurringId: recurring.id,
                            frequency: recurring.frequency
                        }
                    }
                });

                // Calcular próxima ejecución
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

                let shouldDeactivate = false;
                if (recurring.endDate && nextExecution > recurring.endDate) {
                    shouldDeactivate = true;
                }

                await prisma.recurringTransaction.update({
                    where: { id: recurring.id },
                    data: {
                        lastExecuted: new Date(),
                        nextExecution,
                        isActive: shouldDeactivate ? false : true
                    }
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
        console.error('Error executing all pending recurring:', error);
        res.status(500).json({ error: 'Error al ejecutar transacciones' });
    }
};
