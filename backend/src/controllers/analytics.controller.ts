import { Request, Response } from 'express';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Get analytics overview
export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate } = req.query;

        const where: any = { userId };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        // Get monthly trends
        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'asc' }
        });

        const monthlyData: any = {};
        transactions.forEach(t => {
            const month = t.date.toISOString().substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            if (t.type === 'INCOME') {
                monthlyData[month].income += Number(t.amount);
            } else {
                monthlyData[month].expense += Number(t.amount);
            }
        });

        const monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
            month,
            income: (data as any).income,
            expense: (data as any).expense
        }));

        res.json({ monthlyTrends });
    } catch (error) {
        console.error('Get analytics overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get category breakdown
export const getCategoryBreakdown = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate, type } = req.query;

        const where: any = { userId };
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            where.type = type as TransactionType;
        }
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: { category: true }
        });

        const categoryData: any = {};
        let total = 0;

        transactions.forEach(t => {
            const catName = t.category.name;
            const amount = Number(t.amount);
            if (!categoryData[catName]) {
                categoryData[catName] = {
                    name: catName,
                    icon: t.category.icon,
                    total: 0
                };
            }
            categoryData[catName].total += amount;
            total += amount;
        });

        const breakdown = Object.values(categoryData).map((cat: any) => ({
            name: cat.name,
            icon: cat.icon,
            total: cat.total,
            percentage: total > 0 ? (cat.total / total) * 100 : 0
        }));

        res.json(breakdown);
    } catch (error) {
        console.error('Get category breakdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get top categories
export const getTopCategories = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { limit = '5', type = 'EXPENSE' } = req.query;

        const where: any = { userId };
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            where.type = type as TransactionType;
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: { category: true }
        });

        const categoryTotals: any = {};
        transactions.forEach(t => {
            const catId = t.categoryId;
            if (!categoryTotals[catId]) {
                categoryTotals[catId] = {
                    category: t.category,
                    total: 0
                };
            }
            categoryTotals[catId].total += Number(t.amount);
        });

        const topCategories = Object.values(categoryTotals)
            .sort((a: any, b: any) => b.total - a.total)
            .slice(0, parseInt(limit as string));

        res.json(topCategories);
    } catch (error) {
        console.error('Get top categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get dashboard stats - NEW IMPROVED VERSION
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        
        // Get current month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Get previous month
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Current month transactions
        const currentTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: currentMonthStart, lte: currentMonthEnd }
            },
            include: { category: true }
        });

        // Previous month transactions
        const prevTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: prevMonthStart, lte: prevMonthEnd }
            }
        });

        // Calculate totals
        const currentIncome = currentTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const currentExpense = currentTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const prevIncome = prevTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const prevExpense = prevTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Calculate changes
        const incomeChange = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseChange = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;

        // Top 3 expense categories this month
        const categoryTotals: any = {};
        currentTransactions
            .filter(t => t.type === 'EXPENSE')
            .forEach(t => {
                const catId = t.categoryId;
                if (!categoryTotals[catId]) {
                    categoryTotals[catId] = {
                        category: t.category,
                        total: 0,
                        count: 0
                    };
                }
                categoryTotals[catId].total += Number(t.amount);
                categoryTotals[catId].count += 1;
            });

        const topCategories = Object.values(categoryTotals)
            .sort((a: any, b: any) => b.total - a.total)
            .slice(0, 3);

        // Get budget alerts (budgets near limit)
        const budgets = await prisma.budget.findMany({
            where: { userId, isActive: true },
            include: { category: true }
        });

        const budgetAlerts = [];
        for (const budget of budgets) {
            const spent = currentTransactions
                .filter(t => t.categoryId === budget.categoryId && t.type === 'EXPENSE')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            
            const percentage = (spent / Number(budget.amount)) * 100;
            if (percentage >= 80) {
                budgetAlerts.push({
                    category: budget.category,
                    budget: Number(budget.amount),
                    spent,
                    percentage: Math.round(percentage)
                });
            }
        }

        // Get upcoming reminders (next 7 days)
        const today = new Date();
        const dayOfMonth = today.getDate();
        const upcomingReminders = await prisma.paymentReminder.findMany({
            where: {
                userId,
                isRecurring: true,
                isPaid: false,
                dueDay: {
                    gte: dayOfMonth,
                    lte: dayOfMonth + 7
                }
            },
            include: { category: true },
            take: 5
        });

        // Get active savings goals progress
        const savingsGoals = await prisma.savingsGoal.findMany({
            where: { userId, isCompleted: false },
            orderBy: { deadline: 'asc' },
            take: 3
        });

        const goalsProgress = savingsGoals.map(goal => ({
            id: goal.id,
            name: goal.name,
            current: Number(goal.currentAmount),
            target: Number(goal.targetAmount),
            percentage: Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100),
            deadline: goal.deadline
        }));

        // Last 6 months trend
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const trendTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: sixMonthsAgo }
            },
            orderBy: { date: 'asc' }
        });

        const monthlyTrend: any = {};
        trendTransactions.forEach(t => {
            const month = t.date.toISOString().substring(0, 7);
            if (!monthlyTrend[month]) {
                monthlyTrend[month] = { income: 0, expense: 0 };
            }
            if (t.type === 'INCOME') {
                monthlyTrend[month].income += Number(t.amount);
            } else {
                monthlyTrend[month].expense += Number(t.amount);
            }
        });

        const trend = Object.entries(monthlyTrend).map(([month, data]) => ({
            month,
            income: (data as any).income,
            expense: (data as any).expense,
            balance: (data as any).income - (data as any).expense
        }));

        // Get checklist progress for current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const checklistItems = await prisma.checklistItem.findMany({
            where: { userId, isActive: true },
            include: { category: true }
        });

        // Get completions for current month
        const completions = await prisma.checklistCompletion.findMany({
            where: {
                checklistItem: { userId },
                month: {
                    gte: monthStart,
                    lte: monthEnd
                }
            }
        });

        const completedItemIds = new Set(completions.map(c => c.checklistItemId));

        const checklistProgress = {
            total: checklistItems.length,
            completed: checklistItems.filter(item => completedItemIds.has(item.id)).length,
            totalAmount: checklistItems.reduce((sum, item) => sum + Number(item.amount), 0),
            paidAmount: checklistItems
                .filter(item => completedItemIds.has(item.id))
                .reduce((sum, item) => sum + Number(item.amount), 0),
            pendingItems: checklistItems
                .filter(item => !completedItemIds.has(item.id))
                .slice(0, 3)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    amount: Number(item.amount),
                    dueDay: item.dueDay,
                    category: item.category
                }))
        };

        res.json({
            currentMonth: {
                income: currentIncome,
                expense: currentExpense,
                balance: currentIncome - currentExpense,
                transactionCount: currentTransactions.length
            },
            previousMonth: {
                income: prevIncome,
                expense: prevExpense,
                balance: prevIncome - prevExpense
            },
            changes: {
                income: Math.round(incomeChange),
                expense: Math.round(expenseChange)
            },
            topCategories,
            budgetAlerts,
            upcomingReminders,
            goalsProgress,
            checklistProgress,
            trend
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get financial report for a period
export const getFinancialReport = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const months = parseInt(req.query.months as string) || 6;

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

        // Get all transactions in period
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate }
            },
            include: { category: true },
            orderBy: { date: 'desc' }
        });

        // Calculate summary
        const totalIncome = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const balance = totalIncome - totalExpenses;
        const avgMonthlyIncome = totalIncome / months;
        const avgMonthlyExpenses = totalExpenses / months;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

        // Monthly trend
        const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

        // Initialize all months
        for (let i = 0; i < months; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
            monthlyData[key] = { income: 0, expenses: 0 };
        }

        transactions.forEach(t => {
            const key = t.date.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
            if (monthlyData[key]) {
                if (t.type === 'INCOME') {
                    monthlyData[key].income += Number(t.amount);
                } else {
                    monthlyData[key].expenses += Number(t.amount);
                }
            }
        });

        const monthlyTrend = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                income: data.income,
                expenses: data.expenses,
                balance: data.income - data.expenses
            }))
            .reverse();

        // Expenses by category
        const expenseCategoryData: { [key: string]: { name: string; icon: string; total: number; count: number } } = {};
        let totalExpenseAmount = 0;

        transactions
            .filter(t => t.type === 'EXPENSE')
            .forEach(t => {
                const catId = t.categoryId;
                if (!expenseCategoryData[catId]) {
                    expenseCategoryData[catId] = {
                        name: t.category.name,
                        icon: t.category.icon,
                        total: 0,
                        count: 0
                    };
                }
                expenseCategoryData[catId].total += Number(t.amount);
                expenseCategoryData[catId].count += 1;
                totalExpenseAmount += Number(t.amount);
            });

        const expensesByCategory = Object.entries(expenseCategoryData)
            .map(([catId, data]) => ({
                categoryId: catId,
                categoryName: data.name,
                categoryIcon: data.icon,
                total: data.total,
                count: data.count,
                percentage: totalExpenseAmount > 0 ? (data.total / totalExpenseAmount) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Income by category
        const incomeCategoryData: { [key: string]: { name: string; icon: string; total: number; count: number } } = {};
        let totalIncomeAmount = 0;

        transactions
            .filter(t => t.type === 'INCOME')
            .forEach(t => {
                const catId = t.categoryId;
                if (!incomeCategoryData[catId]) {
                    incomeCategoryData[catId] = {
                        name: t.category.name,
                        icon: t.category.icon,
                        total: 0,
                        count: 0
                    };
                }
                incomeCategoryData[catId].total += Number(t.amount);
                incomeCategoryData[catId].count += 1;
                totalIncomeAmount += Number(t.amount);
            });

        const incomeByCategory = Object.entries(incomeCategoryData)
            .map(([catId, data]) => ({
                categoryId: catId,
                categoryName: data.name,
                categoryIcon: data.icon,
                total: data.total,
                count: data.count,
                percentage: totalIncomeAmount > 0 ? (data.total / totalIncomeAmount) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Top expenses
        const topExpenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 10)
            .map(t => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount),
                date: t.date,
                category: {
                    name: t.category.name,
                    icon: t.category.icon
                }
            }));

        res.json({
            summary: {
                totalIncome,
                totalExpenses,
                balance,
                avgMonthlyIncome,
                avgMonthlyExpenses,
                savingsRate
            },
            monthlyTrend,
            expensesByCategory,
            incomeByCategory,
            topExpenses
        });
    } catch (error) {
        console.error('Get financial report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};