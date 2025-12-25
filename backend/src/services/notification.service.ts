import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
    // Create notification
    static async create(
        userId: string, 
        type: NotificationType, 
        title: string, 
        message: string,
        options?: {
            icon?: string;
            link?: string;
            priority?: NotificationPriority;
        }
    ) {
        return await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                icon: options?.icon || '🔔',
                link: options?.link,
                priority: options?.priority || 'NORMAL'
            }
        });
    }

    // Check and create budget alerts
    static async checkBudgetAlerts(userId: string) {
        // Get current month transactions
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const budgets = await prisma.budget.findMany({
            where: { userId, isActive: true },
            include: { category: true }
        });

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: monthStart }
            }
        });

        for (const budget of budgets) {
            const spent = transactions
                .filter(t => t.categoryId === budget.categoryId)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            
            const percentage = (spent / Number(budget.amount)) * 100;

            // 80% warning
            if (percentage >= 80 && percentage < 90) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'BUDGET_ALERT',
                        message: { contains: budget.category.name },
                        createdAt: { gte: monthStart }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'BUDGET_ALERT',
                        `⚠️ Presupuesto al ${Math.round(percentage)}%`,
                        `Tu presupuesto de ${budget.category.name} está al ${Math.round(percentage)}%. Has gastado $${spent.toLocaleString()} de $${Number(budget.amount).toLocaleString()}.`,
                        {
                            icon: '⚠️',
                            link: '/budgets',
                            priority: 'NORMAL'
                        }
                    );
                }
            }

            // 100% alert
            if (percentage >= 100) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'BUDGET_ALERT',
                        message: { contains: 'superado' },
                        message: { contains: budget.category.name },
                        createdAt: { gte: monthStart }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'BUDGET_ALERT',
                        `🚨 Presupuesto Superado`,
                        `¡Has superado tu presupuesto de ${budget.category.name}! Gastaste $${spent.toLocaleString()} de $${Number(budget.amount).toLocaleString()}.`,
                        {
                            icon: '🚨',
                            link: '/budgets',
                            priority: 'HIGH'
                        }
                    );
                }
            }
        }
    }

    // Check payment reminders
    static async checkPaymentReminders(userId: string) {
        const today = new Date();
        const dayOfMonth = today.getDate();
        
        const reminders = await prisma.paymentReminder.findMany({
            where: {
                userId,
                isRecurring: true,
                isPaid: false
            },
            include: { category: true }
        });

        for (const reminder of reminders) {
            const daysUntil = reminder.dueDay - dayOfMonth;

            // 3 days before
            if (daysUntil === 3) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'PAYMENT_REMINDER',
                        message: { contains: reminder.name },
                        createdAt: {
                            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                        }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'PAYMENT_REMINDER',
                        `📅 Pago Próximo: ${reminder.name}`,
                        `Recuerda que en 3 días (día ${reminder.dueDay}) debes pagar ${reminder.name} por $${Number(reminder.amount).toLocaleString()}.`,
                        {
                            icon: '📅',
                            link: '/reminders',
                            priority: 'NORMAL'
                        }
                    );
                }
            }

            // 1 day before
            if (daysUntil === 1) {
                await this.create(
                    userId,
                    'PAYMENT_REMINDER',
                    `⏰ Pago Mañana: ${reminder.name}`,
                    `¡Mañana debes pagar ${reminder.name} por $${Number(reminder.amount).toLocaleString()}!`,
                    {
                        icon: '⏰',
                        link: '/reminders',
                        priority: 'HIGH'
                    }
                );
            }

            // Today
            if (daysUntil === 0) {
                await this.create(
                    userId,
                    'PAYMENT_REMINDER',
                    `🔴 Pago HOY: ${reminder.name}`,
                    `¡Hoy debes pagar ${reminder.name} por $${Number(reminder.amount).toLocaleString()}!`,
                    {
                        icon: '🔴',
                        link: '/reminders',
                        priority: 'URGENT'
                    }
                );
            }
        }
    }

    // Check savings goals completion
    static async checkGoalsProgress(userId: string) {
        const goals = await prisma.savingsGoal.findMany({
            where: { userId, isCompleted: false }
        });

        for (const goal of goals) {
            const percentage = (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100;

            // Goal completed
            if (percentage >= 100) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'GOAL_COMPLETED',
                        message: { contains: goal.name }
                    }
                });

                if (!existing) {
                    await prisma.savingsGoal.update({
                        where: { id: goal.id },
                        data: { isCompleted: true }
                    });

                    await this.create(
                        userId,
                        'GOAL_COMPLETED',
                        `🎉 ¡Meta Alcanzada!`,
                        `¡Felicitaciones! Has completado tu meta "${goal.name}" de $${Number(goal.targetAmount).toLocaleString()}.`,
                        {
                            icon: '🎉',
                            link: '/goals',
                            priority: 'HIGH'
                        }
                    );
                }
            }

            // 75% milestone
            else if (percentage >= 75 && percentage < 80) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'GOAL_COMPLETED',
                        message: { contains: '75%' },
                        message: { contains: goal.name }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'GOAL_COMPLETED',
                        `💪 ¡Casi lo logras!`,
                        `Ya llevas el 75% de tu meta "${goal.name}". ¡Sigue así!`,
                        {
                            icon: '💪',
                            link: '/goals',
                            priority: 'NORMAL'
                        }
                    );
                }
            }
        }
    }

    // Check for unusual spending
    static async checkUnusualSpending(userId: string) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentExpenses = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: monthStart }
            }
        });

        const previousExpenses = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: prevMonthStart, lte: prevMonthEnd }
            }
        });

        const currentTotal = currentExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const previousTotal = previousExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

        if (previousTotal > 0) {
            const increase = ((currentTotal - previousTotal) / previousTotal) * 100;

            if (increase > 50) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'UNUSUAL_SPENDING',
                        createdAt: { gte: monthStart }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'UNUSUAL_SPENDING',
                        `📊 Gastos Inusuales Detectados`,
                        `Tus gastos este mes son ${Math.round(increase)}% más altos que el mes pasado. Revisa tus transacciones.`,
                        {
                            icon: '📊',
                            link: '/transactions',
                            priority: 'NORMAL'
                        }
                    );
                }
            }
        }
    }

    // Run all checks
    static async runAllChecks(userId: string) {
        await Promise.all([
            this.checkBudgetAlerts(userId),
            this.checkPaymentReminders(userId),
            this.checkGoalsProgress(userId),
            this.checkUnusualSpending(userId)
        ]);
    }
}

