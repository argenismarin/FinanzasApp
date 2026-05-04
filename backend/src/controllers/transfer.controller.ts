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

// Obtener historial de transferencias
export const getTransfers = async (req: AuthRequest, res: Response) => {
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
export const createTransfer = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { fromAccountId, toAccountId, amount, description, transferDate } = req.body;

        if (!fromAccountId || !toAccountId || amount === undefined || amount === null) {
            return res.status(400).json({
                error: 'Cuenta origen, cuenta destino y monto son requeridos'
            });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({
                error: 'Las cuentas origen y destino deben ser diferentes'
            });
        }

        // Validar monto (positivo, no NaN)
        const parsedAmount = parseAmount(amount);
        if (parsedAmount === null) {
            return res.status(400).json({ error: 'Monto inválido. Debe ser un número positivo.' });
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

        // Get or create transfer category
        let transferCategory = await prisma.category.findFirst({
            where: { userId, name: 'Transferencia' }
        });
        if (!transferCategory) {
            transferCategory = await prisma.category.create({
                data: {
                    userId: userId!,
                    name: 'Transferencia',
                    type: 'EXPENSE',
                    color: '#6366f1',
                    icon: '🔄'
                }
            });
        }

        const transferDateParsed = parseDateSafe(transferDate) || new Date();
        const desc = description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`;

        // Crear la transferencia usando transacción de base de datos
        const result = await prisma.$transaction(async (tx) => {
            // Actualizar saldo de cuenta origen (restar)
            await tx.bankAccount.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: parsedAmount } }
            });

            // Actualizar saldo de cuenta destino (sumar)
            await tx.bankAccount.update({
                where: { id: toAccountId },
                data: { balance: { increment: parsedAmount } }
            });

            // Crear Transaction EXPENSE en cuenta origen
            const fromTx = await tx.transaction.create({
                data: {
                    userId: userId!,
                    type: 'EXPENSE',
                    amount: parsedAmount,
                    categoryId: transferCategory!.id,
                    description: `${desc} → ${toAccount.name}`,
                    date: transferDateParsed,
                    accountId: fromAccountId,
                    createdBy: userId!
                }
            });

            // Crear Transaction INCOME en cuenta destino
            const toTx = await tx.transaction.create({
                data: {
                    userId: userId!,
                    type: 'INCOME',
                    amount: parsedAmount,
                    categoryId: transferCategory!.id,
                    description: `${desc} ← ${fromAccount.name}`,
                    date: transferDateParsed,
                    accountId: toAccountId,
                    createdBy: userId!
                }
            });

            // Registrar la transferencia con FKs a las transacciones creadas
            // (permite reverso seguro sin matching frágil por monto/fecha)
            const transfer = await tx.accountTransfer.create({
                data: {
                    userId: userId!,
                    fromAccountId,
                    toAccountId,
                    amount: parsedAmount,
                    description: desc,
                    transferDate: transferDateParsed,
                    fromTransactionId: fromTx.id,
                    toTransactionId: toTx.id
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
        logger.fromError('transfer_create_failed', error);
        res.status(500).json({ error: 'Error al crear transferencia' });
    }
};

// Eliminar una transferencia (reversar)
export const deleteTransfer = async (req: AuthRequest, res: Response) => {
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
                data: { balance: { increment: transfer.amount } }
            });

            // Restar el monto de la cuenta destino
            await tx.bankAccount.update({
                where: { id: transfer.toAccountId },
                data: { balance: { decrement: transfer.amount } }
            });

            // Eliminar SOLO las dos transacciones específicas de esta transferencia
            // (evita borrar transferencias gemelas con mismo monto/fecha)
            const txIds = [transfer.fromTransactionId, transfer.toTransactionId]
                .filter((tid): tid is string => !!tid);
            if (txIds.length > 0) {
                await tx.transaction.deleteMany({
                    where: { id: { in: txIds }, userId }
                });
            } else {
                // Fallback para transferencias antiguas sin FK (datos legacy)
                const transferCategory = await tx.category.findFirst({
                    where: { userId, name: 'Transferencia' }
                });
                if (transferCategory) {
                    await tx.transaction.deleteMany({
                        where: {
                            userId,
                            categoryId: transferCategory.id,
                            date: transfer.transferDate,
                            amount: transfer.amount,
                            accountId: { in: [transfer.fromAccountId, transfer.toAccountId] }
                        }
                    });
                }
            }

            // Eliminar el registro de transferencia
            await tx.accountTransfer.delete({
                where: { id }
            });
        });

        res.json({ message: 'Transferencia eliminada y revertida' });
    } catch (error) {
        logger.fromError('transfer_delete_failed', error);
        res.status(500).json({ error: 'Error al eliminar transferencia' });
    }
};

// Obtener cuentas disponibles para transferir
export const getAccountsForTransfer = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Obtener cuentas bancarias activas
        const bankAccounts = await prisma.bankAccount.findMany({
            where: { userId, isActive: true },
            orderBy: { name: 'asc' }
        });

        const accounts = bankAccounts.map(a => ({
            id: a.id,
            name: a.name,
            type: 'bank' as const,
            balance: Number(a.balance),
            icon: a.type === 'checking' ? '🏦' : a.type === 'savings' ? '💰' : '💳'
        }));

        res.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts for transfer:', error);
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
};
