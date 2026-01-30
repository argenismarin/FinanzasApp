import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener historial de transferencias
export const getTransfers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 20, offset = 0 } = req.query;

        const transfers = await prisma.accountTransfer.findMany({
            where: { userId },
            orderBy: { transferDate: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });

        // Obtener información de las cuentas
        const accountIds = [
            ...new Set([
                ...transfers.map(t => t.fromAccountId),
                ...transfers.map(t => t.toAccountId)
            ])
        ];

        const accounts = await prisma.bankAccount.findMany({
            where: { id: { in: accountIds } }
        });

        const accountMap = new Map(accounts.map(a => [a.id, a]));

        const transfersWithAccounts = transfers.map(t => ({
            ...t,
            amount: Number(t.amount),
            fromAccount: accountMap.get(t.fromAccountId),
            toAccount: accountMap.get(t.toAccountId)
        }));

        res.json(transfersWithAccounts);
    } catch (error) {
        console.error('Error fetching transfers:', error);
        res.status(500).json({ error: 'Error al obtener transferencias' });
    }
};

// Crear una transferencia entre cuentas
export const createTransfer = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { fromAccountId, toAccountId, amount, description, transferDate } = req.body;

        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({
                error: 'Cuenta origen, cuenta destino y monto son requeridos'
            });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({
                error: 'Las cuentas origen y destino deben ser diferentes'
            });
        }

        // Verificar que ambas cuentas pertenecen al usuario
        const fromAccount = await prisma.bankAccount.findFirst({
            where: { id: fromAccountId, userId }
        });

        const toAccount = await prisma.bankAccount.findFirst({
            where: { id: toAccountId, userId }
        });

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ error: 'Una o ambas cuentas no existen' });
        }

        // Verificar saldo suficiente (opcional, permitir saldo negativo)
        // if (Number(fromAccount.balance) < amount) {
        //     return res.status(400).json({ error: 'Saldo insuficiente' });
        // }

        // Crear la transferencia usando transacción de base de datos
        const result = await prisma.$transaction(async (tx) => {
            // Actualizar saldo de cuenta origen (restar)
            await tx.bankAccount.update({
                where: { id: fromAccountId },
                data: {
                    balance: {
                        decrement: amount
                    }
                }
            });

            // Actualizar saldo de cuenta destino (sumar)
            await tx.bankAccount.update({
                where: { id: toAccountId },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            });

            // Registrar la transferencia
            const transfer = await tx.accountTransfer.create({
                data: {
                    userId: userId!,
                    fromAccountId,
                    toAccountId,
                    amount,
                    description: description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`,
                    transferDate: new Date(transferDate || Date.now())
                }
            });

            return transfer;
        });

        // Obtener información actualizada de las cuentas
        const updatedFromAccount = await prisma.bankAccount.findUnique({
            where: { id: fromAccountId }
        });
        const updatedToAccount = await prisma.bankAccount.findUnique({
            where: { id: toAccountId }
        });

        res.status(201).json({
            ...result,
            amount: Number(result.amount),
            fromAccount: updatedFromAccount,
            toAccount: updatedToAccount
        });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ error: 'Error al crear transferencia' });
    }
};

// Eliminar una transferencia (reversar)
export const deleteTransfer = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const transfer = await prisma.accountTransfer.findFirst({
            where: { id, userId }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transferencia no encontrada' });
        }

        // Reversar la transferencia
        await prisma.$transaction(async (tx) => {
            // Devolver el monto a la cuenta origen
            await tx.bankAccount.update({
                where: { id: transfer.fromAccountId },
                data: {
                    balance: {
                        increment: transfer.amount
                    }
                }
            });

            // Restar el monto de la cuenta destino
            await tx.bankAccount.update({
                where: { id: transfer.toAccountId },
                data: {
                    balance: {
                        decrement: transfer.amount
                    }
                }
            });

            // Eliminar el registro de transferencia
            await tx.accountTransfer.delete({
                where: { id }
            });
        });

        res.json({ message: 'Transferencia eliminada y revertida' });
    } catch (error) {
        console.error('Error deleting transfer:', error);
        res.status(500).json({ error: 'Error al eliminar transferencia' });
    }
};

// Obtener cuentas disponibles para transferir
export const getAccountsForTransfer = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        // Obtener cuentas bancarias activas
        const bankAccounts = await prisma.bankAccount.findMany({
            where: { userId, isActive: true },
            orderBy: { name: 'asc' }
        });

        // Obtener cajitas de ahorro
        const savings = await prisma.saving.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });

        const accounts = [
            ...bankAccounts.map(a => ({
                id: a.id,
                name: a.name,
                type: 'bank' as const,
                balance: Number(a.balance),
                icon: a.type === 'checking' ? '🏦' : a.type === 'savings' ? '💰' : '💳'
            })),
            ...savings.map(s => ({
                id: s.id,
                name: s.name,
                type: 'saving' as const,
                balance: Number(s.amount),
                icon: '🐷'
            }))
        ];

        res.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts for transfer:', error);
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
};
