import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { parsePagination, parseDateSafe, parseAmount } from '../lib/validation';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { type, categoryId, accountId, startDate, endDate, page = '1', limit = '20' } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Build where clause
        const where: any = {};

        // Non-admin users can only see their own transactions
        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        if (type) {
            where.type = type;
        }

        if (categoryId) {
            where.categoryId = categoryId as string;
        }

        if (accountId) {
            where.accountId = accountId as string;
        }

        if (startDate || endDate) {
            where.date = {};
            const startDateParsed = parseDateSafe(startDate as string);
            const endDateParsed = parseDateSafe(endDate as string);
            if (startDateParsed) {
                where.date.gte = startDateParsed;
            }
            if (endDateParsed) {
                where.date.lte = endDateParsed;
            }
        }

        // Pagination with safe parsing and limits
        const { page: pageNum, limit: limitNum, skip } = parsePagination(
            page as string,
            limit as string,
            100 // max limit
        );

        // Get transactions
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            icon: true,
                            type: true
                        }
                    },
                    account: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    creditCard: {
                        select: {
                            id: true,
                            name: true,
                            lastFourDigits: true,
                            brand: true,
                            color: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { date: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            data: transactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                category: true,
                account: {
                    select: {
                        id: true,
                        name: true,
                        type: true
                    }
                },
                creditCard: {
                    select: {
                        id: true,
                        name: true,
                        lastFourDigits: true,
                        brand: true,
                        color: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && transaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(transaction);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { type, amount, categoryId, description, date, isRecurring, recurringPattern, metadata, creditCardId, accountId } = req.body;
        const userId = req.user!.id;

        // Validation
        if (!type || !amount || !categoryId || !description || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['INCOME', 'EXPENSE'].includes(type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        // Validate amount
        const parsedAmount = parseAmount(amount);
        if (parsedAmount === null) {
            return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
        }

        // Validate date
        const parsedDate = parseDateSafe(date);
        if (!parsedDate) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Verify category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Mutual exclusion: accountId and creditCardId
        const finalAccountId = creditCardId ? null : (accountId || null);
        const finalCreditCardId = accountId ? null : (creditCardId || null);

        // Validate credit card if provided (only for EXPENSE)
        let creditCard: any = null;
        if (finalCreditCardId) {
            if (type !== 'EXPENSE') {
                return res.status(400).json({ error: 'Credit card can only be linked to expense transactions' });
            }
            creditCard = await prisma.creditCard.findUnique({
                where: { id: finalCreditCardId }
            });
            if (!creditCard || creditCard.userId !== userId) {
                return res.status(404).json({ error: 'Credit card not found' });
            }
        }

        // Validate bank account if provided
        let bankAccount: any = null;
        if (finalAccountId) {
            bankAccount = await prisma.bankAccount.findUnique({
                where: { id: finalAccountId }
            });
            if (!bankAccount || bankAccount.userId !== userId) {
                return res.status(404).json({ error: 'Bank account not found' });
            }
        }

        const amountNum = Number(parsedAmount);

        // Use prisma.$transaction for atomicity when updating balances
        const transaction = await prisma.$transaction(async (tx) => {
            // Create transaction
            const created = await tx.transaction.create({
                data: {
                    userId,
                    type,
                    amount: parsedAmount,
                    currency: 'COP',
                    categoryId,
                    description,
                    date: parsedDate,
                    isRecurring: isRecurring || false,
                    recurringPattern: recurringPattern || null,
                    metadata: metadata || null,
                    createdBy: userId,
                    creditCardId: finalCreditCardId,
                    accountId: finalAccountId,
                },
                include: {
                    category: true,
                    account: {
                        select: { id: true, name: true, type: true }
                    },
                    creditCard: {
                        select: {
                            id: true,
                            name: true,
                            lastFourDigits: true,
                            brand: true,
                            color: true
                        }
                    },
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // Update bank account balance
            if (finalAccountId) {
                if (type === 'EXPENSE') {
                    await tx.bankAccount.update({
                        where: { id: finalAccountId },
                        data: { balance: { decrement: amountNum } }
                    });
                } else {
                    await tx.bankAccount.update({
                        where: { id: finalAccountId },
                        data: { balance: { increment: amountNum } }
                    });
                }
            }

            // Update credit card balance
            if (creditCard && finalCreditCardId) {
                await tx.creditCardTransaction.create({
                    data: {
                        creditCardId: finalCreditCardId,
                        amount: parsedAmount,
                        description,
                        transactionDate: parsedDate,
                        isPending: false
                    }
                });
                await tx.creditCard.update({
                    where: { id: finalCreditCardId },
                    data: {
                        currentBalance: { increment: amountNum },
                        availableCredit: { decrement: amountNum }
                    }
                });
            }

            return created;
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { type, amount, categoryId, description, date, isRecurring, recurringPattern, metadata, accountId, creditCardId } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Find existing transaction
        const existingTransaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && existingTransaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Determine final values
        const newType = type || existingTransaction.type;
        const newAmount = amount ? parseFloat(amount) : Number(existingTransaction.amount);

        // Mutual exclusion for account/creditCard
        let finalAccountId: string | null | undefined = undefined;
        let finalCreditCardId: string | null | undefined = undefined;
        if (accountId !== undefined || creditCardId !== undefined) {
            if (creditCardId) {
                finalAccountId = null;
                finalCreditCardId = creditCardId;
            } else if (accountId) {
                finalAccountId = accountId;
                finalCreditCardId = null;
            } else {
                // Explicitly clearing both
                finalAccountId = accountId === '' ? null : undefined;
                finalCreditCardId = creditCardId === '' ? null : undefined;
            }
        }

        // Validate new account if changing
        if (finalAccountId && finalAccountId !== existingTransaction.accountId) {
            const bankAccount = await prisma.bankAccount.findUnique({ where: { id: finalAccountId } });
            if (!bankAccount || bankAccount.userId !== userId) {
                return res.status(404).json({ error: 'Bank account not found' });
            }
        }

        const oldAmount = Number(existingTransaction.amount);
        const oldType = existingTransaction.type;
        const oldAccountId = existingTransaction.accountId;
        const resolvedNewAccountId = finalAccountId !== undefined ? finalAccountId : oldAccountId;

        const transaction = await prisma.$transaction(async (tx) => {
            // Revert balance on old account
            if (oldAccountId) {
                if (oldType === 'EXPENSE') {
                    await tx.bankAccount.update({
                        where: { id: oldAccountId },
                        data: { balance: { increment: oldAmount } }
                    });
                } else {
                    await tx.bankAccount.update({
                        where: { id: oldAccountId },
                        data: { balance: { decrement: oldAmount } }
                    });
                }
            }

            // Apply balance on new account
            if (resolvedNewAccountId) {
                if (newType === 'EXPENSE') {
                    await tx.bankAccount.update({
                        where: { id: resolvedNewAccountId },
                        data: { balance: { decrement: newAmount } }
                    });
                } else {
                    await tx.bankAccount.update({
                        where: { id: resolvedNewAccountId },
                        data: { balance: { increment: newAmount } }
                    });
                }
            }

            // Update transaction
            const updated = await tx.transaction.update({
                where: { id },
                data: {
                    ...(type && { type }),
                    ...(amount && { amount: parseFloat(amount) }),
                    ...(categoryId && { categoryId }),
                    ...(description && { description }),
                    ...(date && { date: new Date(date) }),
                    ...(isRecurring !== undefined && { isRecurring }),
                    ...(recurringPattern && { recurringPattern }),
                    ...(metadata && { metadata }),
                    ...(finalAccountId !== undefined && { accountId: finalAccountId }),
                    ...(finalCreditCardId !== undefined && { creditCardId: finalCreditCardId }),
                },
                include: {
                    category: true,
                    account: {
                        select: { id: true, name: true, type: true }
                    },
                    creditCard: {
                        select: {
                            id: true, name: true, lastFourDigits: true, brand: true, color: true
                        }
                    },
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            return updated;
        });

        res.json(transaction);
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Find transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check ownership
        if (userRole !== 'ADMIN' && transaction.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const amountNum = Number(transaction.amount);

        await prisma.$transaction(async (tx) => {
            // Revert bank account balance
            if (transaction.accountId) {
                if (transaction.type === 'EXPENSE') {
                    await tx.bankAccount.update({
                        where: { id: transaction.accountId },
                        data: { balance: { increment: amountNum } }
                    });
                } else {
                    await tx.bankAccount.update({
                        where: { id: transaction.accountId },
                        data: { balance: { decrement: amountNum } }
                    });
                }
            }

            // Revert credit card balance
            if (transaction.creditCardId) {
                await tx.creditCard.update({
                    where: { id: transaction.creditCardId },
                    data: {
                        currentBalance: { decrement: amountNum },
                        availableCredit: { increment: amountNum }
                    }
                });
            }

            // Delete transaction
            await tx.transaction.delete({
                where: { id }
            });
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const bulkCreateTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'transactions array is required' });
        }

        if (transactions.length > 500) {
            return res.status(400).json({ error: 'Maximum 500 transactions per import' });
        }

        // Collect all category IDs and validate upfront
        const categoryIds = [...new Set(transactions.map((t: any) => t.categoryId).filter(Boolean))];
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true }
        });
        const validCategoryIds = new Set(categories.map(c => c.id));

        const errors: { row: number; error: string }[] = [];
        const validRows: any[] = [];

        for (let i = 0; i < transactions.length; i++) {
            const t = transactions[i];
            const row = i + 1;

            if (!t.type || !['INCOME', 'EXPENSE'].includes(t.type)) {
                errors.push({ row, error: 'Tipo invalido' });
                continue;
            }

            const parsedAmount = parseAmount(t.amount);
            if (parsedAmount === null) {
                errors.push({ row, error: 'Monto invalido' });
                continue;
            }

            if (!t.categoryId || !validCategoryIds.has(t.categoryId)) {
                errors.push({ row, error: 'Categoria invalida' });
                continue;
            }

            if (!t.description || t.description.trim().length === 0) {
                errors.push({ row, error: 'Descripcion requerida' });
                continue;
            }

            const parsedDate = parseDateSafe(t.date);
            if (!parsedDate) {
                errors.push({ row, error: 'Fecha invalida' });
                continue;
            }

            validRows.push({
                userId,
                type: t.type,
                amount: parsedAmount,
                currency: 'COP',
                categoryId: t.categoryId,
                description: t.description.trim(),
                date: parsedDate,
                createdBy: userId
            });
        }

        // Insert in batches of 50
        let created = 0;
        for (let i = 0; i < validRows.length; i += 50) {
            const batch = validRows.slice(i, i + 50);
            const result = await prisma.transaction.createMany({ data: batch });
            created += result.count;
        }

        res.status(201).json({
            created,
            errors,
            totalErrors: errors.length,
            totalProcessed: transactions.length
        });
    } catch (error) {
        console.error('Bulk create transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransactionStats = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, accountId } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const where: any = {};

        if (userRole !== 'ADMIN') {
            where.userId = userId;
        }

        if (accountId) {
            where.accountId = accountId as string;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate as string);
            }
            if (endDate) {
                where.date.lte = new Date(endDate as string);
            }
        }

        // Get income and expense totals
        const [incomeTotal, expenseTotal, transactionsByCategory] = await Promise.all([
            prisma.transaction.aggregate({
                where: { ...where, type: 'INCOME' },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { ...where, type: 'EXPENSE' },
                _sum: { amount: true }
            }),
            prisma.transaction.groupBy({
                by: ['categoryId'],
                where,
                _sum: { amount: true },
                _count: true
            })
        ]);

        // Get category details
        const categoryIds = transactionsByCategory.map(t => t.categoryId);
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true, icon: true, type: true }
        });

        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const byCategory = transactionsByCategory.map(t => ({
            category: categoryMap.get(t.categoryId),
            total: t._sum.amount ? Number(t._sum.amount) : 0,
            count: t._count
        }));

        // Calculate totals
        const income = incomeTotal._sum.amount ? Number(incomeTotal._sum.amount) : 0;
        const expense = expenseTotal._sum.amount ? Number(expenseTotal._sum.amount) : 0;
        const balance = income - expense;

        res.json({
            income,
            expense,
            balance,
            byCategory
        });
    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
