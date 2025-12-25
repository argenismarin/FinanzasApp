import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    getFinancialAdvice,
    analyzeSpendingPatterns,
    suggestBudget
} from '../services/openai.service';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Get financial advice from AI
export const askFinancialAdvice = async (req: AuthRequest, res: Response) => {
    try {
        const { question, includeContext } = req.body;
        const userId = req.user!.id;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        let context;
        if (includeContext) {
            // Get user's financial context
            const transactions = await prisma.transaction.findMany({
                where: { userId }
            });

            const income = transactions
                .filter(t => t.type === 'INCOME')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expense = transactions
                .filter(t => t.type === 'EXPENSE')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const savings = await prisma.saving.findMany({
                where: { userId }
            });

            const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0);

            const debts = await prisma.debt.findMany({
                where: { userId }
            });

            const totalDebts = debts.reduce((sum, d) => {
                const pending = Number(d.totalAmount) - Number(d.paidAmount);
                return sum + pending;
            }, 0);

            context = {
                monthlyIncome: income,
                monthlyExpenses: expense,
                savings: totalSavings,
                debts: totalDebts
            };
        }

        const advice = await getFinancialAdvice(question, context);

        res.json({
            question,
            advice,
            contextUsed: !!includeContext
        });
    } catch (error) {
        console.error('Ask financial advice error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Analyze user's spending patterns
export const analyzeSpending = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { months = 1 } = req.query;

        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months as string));

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: monthsAgo }
            },
            include: {
                category: true
            },
            orderBy: { date: 'desc' }
        });

        if (transactions.length === 0) {
            return res.json({
                analysis: 'No hay suficientes transacciones para analizar. Registra algunos gastos para obtener insights personalizados.',
                transactionsCount: 0
            });
        }

        const transactionsData = transactions.map(t => ({
            date: t.date.toISOString().split('T')[0],
            category: t.category.name,
            amount: Number(t.amount),
            description: t.description
        }));

        const analysis = await analyzeSpendingPatterns(transactionsData);

        res.json({
            analysis,
            transactionsCount: transactions.length,
            period: `Últimos ${months} mes(es)`
        });
    } catch (error) {
        console.error('Analyze spending error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get AI-powered budget suggestion
export const getBudgetSuggestion = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { monthlyIncome } = req.body;

        if (!monthlyIncome || monthlyIncome <= 0) {
            return res.status(400).json({ error: 'Valid monthly income is required' });
        }

        const suggestion = await suggestBudget(parseFloat(monthlyIncome));

        // Find or create categories
        const categoriesWithIds = await Promise.all(
            Object.entries(suggestion).map(async ([categoryName, amount]) => {
                let category = await prisma.category.findFirst({
                    where: {
                        name: categoryName,
                        OR: [{ userId: null }, { userId }]
                    }
                });

                if (!category) {
                    // Create category if it doesn't exist
                    const icons: Record<string, string> = {
                        'Vivienda': '🏠',
                        'Alimentación': '🍽️',
                        'Transporte': '🚗',
                        'Servicios': '💡',
                        'Salud': '💊',
                        'Entretenimiento': '🎬',
                        'Ahorros': '💰',
                        'Otros': '📦'
                    };

                    category = await prisma.category.create({
                        data: {
                            userId,
                            name: categoryName,
                            type: categoryName === 'Ahorros' ? 'INCOME' : 'EXPENSE',
                            color: '#3b82f6',
                            icon: icons[categoryName] || '📝'
                        }
                    });
                }

                return {
                    categoryId: category.id,
                    categoryName: category.name,
                    icon: category.icon,
                    suggestedAmount: amount
                };
            })
        );

        res.json({
            monthlyIncome: parseFloat(monthlyIncome),
            suggestions: categoriesWithIds,
            total: Object.values(suggestion).reduce((sum, val) => sum + val, 0)
        });
    } catch (error) {
        console.error('Get budget suggestion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

