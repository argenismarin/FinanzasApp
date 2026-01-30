import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Obtener todas las tarjetas de crédito del usuario
export const getCreditCards = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const cards = await prisma.creditCard.findMany({
            where: { userId, isActive: true },
            include: {
                transactions: {
                    where: { isPending: true },
                    orderBy: { transactionDate: 'desc' },
                    take: 5
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 3
                }
            },
            orderBy: { name: 'asc' }
        });

        // Calcular estadísticas por tarjeta
        const cardsWithStats = cards.map(card => {
            const totalUsed = Number(card.currentBalance);
            const limit = Number(card.creditLimit);
            const usagePercentage = limit > 0 ? (totalUsed / limit) * 100 : 0;

            return {
                ...card,
                currentBalance: Number(card.currentBalance),
                creditLimit: Number(card.creditLimit),
                availableCredit: Number(card.availableCredit),
                minimumPayment: card.minimumPayment ? Number(card.minimumPayment) : null,
                interestRate: card.interestRate ? Number(card.interestRate) : null,
                usagePercentage: Math.round(usagePercentage * 100) / 100,
                transactions: card.transactions.map(t => ({
                    ...t,
                    amount: Number(t.amount),
                    installmentAmount: t.installmentAmount ? Number(t.installmentAmount) : null
                })),
                payments: card.payments.map(p => ({
                    ...p,
                    amount: Number(p.amount)
                }))
            };
        });

        res.json(cardsWithStats);
    } catch (error) {
        console.error('Error fetching credit cards:', error);
        res.status(500).json({ error: 'Error al obtener tarjetas de crédito' });
    }
};

// Obtener una tarjeta específica con sus transacciones
export const getCreditCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const card = await prisma.creditCard.findFirst({
            where: { id, userId },
            include: {
                transactions: {
                    orderBy: { transactionDate: 'desc' }
                },
                payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });

        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json({
            ...card,
            currentBalance: Number(card.currentBalance),
            creditLimit: Number(card.creditLimit),
            availableCredit: Number(card.availableCredit),
            minimumPayment: card.minimumPayment ? Number(card.minimumPayment) : null,
            interestRate: card.interestRate ? Number(card.interestRate) : null,
            transactions: card.transactions.map(t => ({
                ...t,
                amount: Number(t.amount),
                installmentAmount: t.installmentAmount ? Number(t.installmentAmount) : null
            })),
            payments: card.payments.map(p => ({
                ...p,
                amount: Number(p.amount)
            }))
        });
    } catch (error) {
        console.error('Error fetching credit card:', error);
        res.status(500).json({ error: 'Error al obtener tarjeta' });
    }
};

// Crear nueva tarjeta de crédito
export const createCreditCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const {
            name,
            lastFourDigits,
            brand,
            creditLimit,
            cutOffDay,
            paymentDueDay,
            interestRate,
            color
        } = req.body;

        if (!name || !creditLimit || !cutOffDay || !paymentDueDay) {
            return res.status(400).json({
                error: 'Nombre, límite de crédito, día de corte y día de pago son requeridos'
            });
        }

        const card = await prisma.creditCard.create({
            data: {
                userId: userId!,
                name,
                lastFourDigits: lastFourDigits || null,
                brand: brand || 'OTHER',
                creditLimit,
                availableCredit: creditLimit,
                currentBalance: 0,
                cutOffDay: parseInt(cutOffDay),
                paymentDueDay: parseInt(paymentDueDay),
                interestRate: interestRate ? parseFloat(interestRate) : null,
                color: color || '#1e40af'
            }
        });

        res.status(201).json({
            ...card,
            creditLimit: Number(card.creditLimit),
            availableCredit: Number(card.availableCredit),
            currentBalance: Number(card.currentBalance)
        });
    } catch (error) {
        console.error('Error creating credit card:', error);
        res.status(500).json({ error: 'Error al crear tarjeta de crédito' });
    }
};

// Actualizar tarjeta de crédito
export const updateCreditCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const updateData = req.body;

        // Verificar que la tarjeta pertenece al usuario
        const existing = await prisma.creditCard.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        const card = await prisma.creditCard.update({
            where: { id },
            data: {
                name: updateData.name,
                lastFourDigits: updateData.lastFourDigits,
                brand: updateData.brand,
                creditLimit: updateData.creditLimit,
                cutOffDay: updateData.cutOffDay,
                paymentDueDay: updateData.paymentDueDay,
                interestRate: updateData.interestRate,
                color: updateData.color
            }
        });

        // Recalcular crédito disponible
        const updatedCard = await prisma.creditCard.update({
            where: { id },
            data: {
                availableCredit: Number(card.creditLimit) - Number(card.currentBalance)
            }
        });

        res.json(updatedCard);
    } catch (error) {
        console.error('Error updating credit card:', error);
        res.status(500).json({ error: 'Error al actualizar tarjeta' });
    }
};

// Eliminar (desactivar) tarjeta de crédito
export const deleteCreditCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const card = await prisma.creditCard.findFirst({
            where: { id, userId }
        });

        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        await prisma.creditCard.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Tarjeta eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting credit card:', error);
        res.status(500).json({ error: 'Error al eliminar tarjeta' });
    }
};

// Agregar transacción a tarjeta de crédito
export const addCreditCardTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const {
            amount,
            description,
            merchant,
            categoryId,
            installments,
            transactionDate
        } = req.body;

        // Verificar que la tarjeta pertenece al usuario
        const card = await prisma.creditCard.findFirst({
            where: { id, userId }
        });

        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        const numInstallments = installments || 1;
        const installmentAmount = numInstallments > 1 ? amount / numInstallments : null;

        const transaction = await prisma.creditCardTransaction.create({
            data: {
                creditCardId: id,
                amount,
                description,
                merchant: merchant || null,
                categoryId: categoryId || null,
                installments: numInstallments,
                installmentAmount,
                transactionDate: new Date(transactionDate || Date.now()),
                isPending: true
            }
        });

        // Actualizar saldo de la tarjeta
        const newBalance = Number(card.currentBalance) + Number(amount);
        const newAvailable = Number(card.creditLimit) - newBalance;

        await prisma.creditCard.update({
            where: { id },
            data: {
                currentBalance: newBalance,
                availableCredit: newAvailable > 0 ? newAvailable : 0
            }
        });

        res.status(201).json({
            ...transaction,
            amount: Number(transaction.amount),
            installmentAmount: transaction.installmentAmount ? Number(transaction.installmentAmount) : null
        });
    } catch (error) {
        console.error('Error adding credit card transaction:', error);
        res.status(500).json({ error: 'Error al agregar transacción' });
    }
};

// Registrar pago a tarjeta de crédito
export const addCreditCardPayment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { amount, paymentType, paymentDate, description } = req.body;

        // Verificar que la tarjeta pertenece al usuario
        const card = await prisma.creditCard.findFirst({
            where: { id, userId }
        });

        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        const payment = await prisma.creditCardPayment.create({
            data: {
                creditCardId: id,
                amount,
                paymentType: paymentType || 'PARTIAL',
                paymentDate: new Date(paymentDate || Date.now()),
                description: description || null
            }
        });

        // Actualizar saldo de la tarjeta
        const newBalance = Math.max(0, Number(card.currentBalance) - Number(amount));
        const newAvailable = Number(card.creditLimit) - newBalance;

        await prisma.creditCard.update({
            where: { id },
            data: {
                currentBalance: newBalance,
                availableCredit: newAvailable
            }
        });

        // Marcar transacciones pendientes como facturadas si fue pago total
        if (paymentType === 'FULL') {
            await prisma.creditCardTransaction.updateMany({
                where: { creditCardId: id, isPending: true },
                data: { isPending: false }
            });
        }

        res.status(201).json({
            ...payment,
            amount: Number(payment.amount)
        });
    } catch (error) {
        console.error('Error adding credit card payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
};

// Obtener resumen de todas las tarjetas
export const getCreditCardsSummary = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const cards = await prisma.creditCard.findMany({
            where: { userId, isActive: true }
        });

        const totalLimit = cards.reduce((sum, c) => sum + Number(c.creditLimit), 0);
        const totalBalance = cards.reduce((sum, c) => sum + Number(c.currentBalance), 0);
        const totalAvailable = cards.reduce((sum, c) => sum + Number(c.availableCredit), 0);

        // Próximos pagos (tarjetas con saldo > 0)
        const today = new Date();
        const currentDay = today.getDate();

        const upcomingPayments = cards
            .filter(c => Number(c.currentBalance) > 0)
            .map(card => {
                let dueDate = new Date(today.getFullYear(), today.getMonth(), card.paymentDueDay);
                if (currentDay > card.paymentDueDay) {
                    dueDate.setMonth(dueDate.getMonth() + 1);
                }
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    cardId: card.id,
                    cardName: card.name,
                    balance: Number(card.currentBalance),
                    minimumPayment: card.minimumPayment ? Number(card.minimumPayment) : null,
                    dueDate,
                    daysUntilDue,
                    isOverdue: daysUntilDue < 0,
                    isUrgent: daysUntilDue >= 0 && daysUntilDue <= 5
                };
            })
            .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        res.json({
            totalCards: cards.length,
            totalLimit,
            totalBalance,
            totalAvailable,
            usagePercentage: totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0,
            upcomingPayments
        });
    } catch (error) {
        console.error('Error fetching credit cards summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen' });
    }
};
