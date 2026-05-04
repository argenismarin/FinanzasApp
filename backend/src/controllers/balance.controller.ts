import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';

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

        // Use BankAccount.balance as source of truth (aggregated)
        const [bankBalanceResult, savingsResult, debts, transactionCount, accountCount] = await Promise.all([
            prisma.bankAccount.aggregate({
                where: { userId, isActive: true },
                _sum: { balance: true }
            }),
            prisma.saving.aggregate({
                where: { userId },
                _sum: { amount: true },
                _count: true
            }),
            prisma.debt.findMany({
                where: { userId },
                select: { totalAmount: true, paidAmount: true }
            }),
            prisma.transaction.count({ where: { userId } }),
            prisma.bankAccount.count({ where: { userId, isActive: true } })
        ]);

        const bankBalance = Number(bankBalanceResult._sum.balance) || 0;
        const totalSavings = Number(savingsResult._sum.amount) || 0;

        // Calculate pending for each debt
        const debtsWithPending = debts.map(debt => ({
            pendingAmount: Number(debt.totalAmount) - Number(debt.paidAmount)
        }));

        const totalDebts = debtsWithPending.reduce((sum, debt) => sum + debt.pendingAmount, 0);
        const actualDebtsCount = debtsWithPending.filter(d => d.pendingAmount > 0).length;

        // Calculate metrics
        const netWorth = bankBalance + totalSavings - totalDebts;
        const availableToSpend = bankBalance;

        res.json({
            bankBalance,
            totalSavings,
            totalDebts,
            netWorth,
            availableToSpend,
            breakdown: {
                savingsCount: savingsResult._count,
                debtsCount: actualDebtsCount,
                transactionsCount: transactionCount,
                accountsCount: accountCount
            }
        });
    } catch (error: any) {
        console.error('Get balance error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
            code: error.code
        });
    }
};

// Recalcula desde cero los saldos de TODAS las cuentas y tarjetas del usuario
// sumando todas las Transactions y CreditCardTransactions. Útil cuando los saldos
// se desincronizan por bugs históricos o ediciones manuales.
//
// Acceso:
//   - Usuario USER recalcula sus propias cuentas
//   - ADMIN puede pasar ?userId=<id> para recalcular las de otro usuario
export const recalculateBalances = async (req: AuthRequest, res: Response) => {
    try {
        const callerId = req.user!.id;
        const callerRole = req.user!.role;
        const targetUserId = (req.query.userId as string) || callerId;

        // Sólo admin puede recalcular saldos ajenos
        if (targetUserId !== callerId && callerRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Solo ADMIN puede recalcular cuentas ajenas' });
        }

        // Verificar que el target existe
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true }
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Usuario objetivo no encontrado' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const accounts = await tx.bankAccount.findMany({
                where: { userId: targetUserId }
            });
            const cards = await tx.creditCard.findMany({
                where: { userId: targetUserId }
            });

            const accountFixes: Array<{ id: string; name: string; before: number; after: number; delta: number }> = [];
            for (const acc of accounts) {
                // Sumar INCOME, restar EXPENSE para esa cuenta
                const [income, expense] = await Promise.all([
                    tx.transaction.aggregate({
                        where: { userId: targetUserId, accountId: acc.id, type: 'INCOME' },
                        _sum: { amount: true }
                    }),
                    tx.transaction.aggregate({
                        where: { userId: targetUserId, accountId: acc.id, type: 'EXPENSE' },
                        _sum: { amount: true }
                    })
                ]);
                const computed = Number(income._sum.amount || 0) - Number(expense._sum.amount || 0);
                const before = Number(acc.balance);
                if (computed !== before) {
                    await tx.bankAccount.update({
                        where: { id: acc.id },
                        data: { balance: new Prisma.Decimal(computed) }
                    });
                }
                accountFixes.push({
                    id: acc.id,
                    name: acc.name,
                    before,
                    after: computed,
                    delta: computed - before
                });
            }

            const cardFixes: Array<{ id: string; name: string; balanceBefore: number; balanceAfter: number; availableAfter: number; delta: number }> = [];
            for (const card of cards) {
                // currentBalance = sum(CreditCardTransaction.amount) - sum(CreditCardPayment.amount)
                const [chargesAgg, paymentsAgg] = await Promise.all([
                    tx.creditCardTransaction.aggregate({
                        where: { creditCardId: card.id },
                        _sum: { amount: true }
                    }),
                    tx.creditCardPayment.aggregate({
                        where: { creditCardId: card.id },
                        _sum: { amount: true }
                    })
                ]);
                const charges = Number(chargesAgg._sum.amount || 0);
                const payments = Number(paymentsAgg._sum.amount || 0);
                const computedBalance = Math.max(0, charges - payments);
                const limit = Number(card.creditLimit);
                const computedAvailable = Math.max(0, limit - computedBalance);
                const before = Number(card.currentBalance);

                if (computedBalance !== before || Number(card.availableCredit) !== computedAvailable) {
                    await tx.creditCard.update({
                        where: { id: card.id },
                        data: {
                            currentBalance: new Prisma.Decimal(computedBalance),
                            availableCredit: new Prisma.Decimal(computedAvailable)
                        }
                    });
                }
                cardFixes.push({
                    id: card.id,
                    name: card.name,
                    balanceBefore: before,
                    balanceAfter: computedBalance,
                    availableAfter: computedAvailable,
                    delta: computedBalance - before
                });
            }

            return { accountFixes, cardFixes };
        });

        const accountsChanged = result.accountFixes.filter(a => a.delta !== 0);
        const cardsChanged = result.cardFixes.filter(c => c.delta !== 0);

        res.json({
            userId: targetUserId,
            summary: {
                accountsScanned: result.accountFixes.length,
                accountsChanged: accountsChanged.length,
                cardsScanned: result.cardFixes.length,
                cardsChanged: cardsChanged.length
            },
            accounts: result.accountFixes,
            cards: result.cardFixes
        });
    } catch (error: any) {
        logger.fromError('balance_recalculate_failed', error);
        res.status(500).json({
            error: 'Error al recalcular saldos',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};
