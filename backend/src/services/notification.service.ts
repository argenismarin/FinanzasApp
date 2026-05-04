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
                        message: { contains: budget.category.name },
                        title: { contains: 'Superado' },
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
                        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
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

    // Check checklist items that should be completed
    static async checkChecklistReminders(userId: string) {
        const now = new Date();
        const currentDay = now.getDate();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        // Get all active checklist items
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

        // Filter items that are past due and not completed
        const overdueItems = checklistItems.filter(item =>
            item.dueDay <= currentDay &&
            !completedItemIds.has(item.id)
        );

        if (overdueItems.length > 0) {
            // Check if we already sent a notification today
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const existing = await prisma.notification.findFirst({
                where: {
                    userId,
                    type: 'PAYMENT_REMINDER',
                    message: { contains: 'checklist' },
                    createdAt: { gte: today }
                }
            });

            if (!existing) {
                const totalPending = overdueItems.reduce((sum, item) => sum + Number(item.amount), 0);
                const itemNames = overdueItems.slice(0, 3).map(i => i.name).join(', ');
                const moreText = overdueItems.length > 3 ? ` y ${overdueItems.length - 3} más` : '';

                await this.create(
                    userId,
                    'PAYMENT_REMINDER',
                    `✅ ${overdueItems.length} item${overdueItems.length > 1 ? 's' : ''} del checklist pendiente${overdueItems.length > 1 ? 's' : ''}`,
                    `Tienes items vencidos sin marcar: ${itemNames}${moreText}. Total: $${totalPending.toLocaleString()}.`,
                    {
                        icon: '✅',
                        link: '/checklist',
                        priority: overdueItems.length >= 3 ? 'HIGH' : 'NORMAL'
                    }
                );
            }
        }

        // Also alert if end of month is approaching and items are not complete
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysRemaining = daysInMonth - currentDay;

        if (daysRemaining <= 5) {
            const incompleteItems = checklistItems.filter(item => !completedItemIds.has(item.id));

            if (incompleteItems.length > 0) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'PAYMENT_REMINDER',
                        message: { contains: 'fin de mes' },
                        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), currentDay - 3) }
                    }
                });

                if (!existing) {
                    const totalPending = incompleteItems.reduce((sum, item) => sum + Number(item.amount), 0);
                    await this.create(
                        userId,
                        'PAYMENT_REMINDER',
                        `⏰ ${incompleteItems.length} item${incompleteItems.length > 1 ? 's' : ''} sin completar`,
                        `Quedan ${daysRemaining} días para fin de mes y tienes ${incompleteItems.length} item${incompleteItems.length > 1 ? 's' : ''} del checklist sin marcar. Total: $${totalPending.toLocaleString()}.`,
                        {
                            icon: '⏰',
                            link: '/checklist',
                            priority: 'HIGH'
                        }
                    );
                }
            }
        }
    }

    // Check daily expense reminder
    static async checkDailyExpenseReminder(userId: string) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Check if we already sent this reminder today
        const existingReminder = await prisma.notification.findFirst({
            where: {
                userId,
                type: 'SYSTEM',
                message: { contains: 'registrar tus gastos' },
                createdAt: { gte: todayStart, lt: todayEnd }
            }
        });

        if (existingReminder) return;

        // Create daily reminder notification
        await this.create(
            userId,
            'SYSTEM',
            '📝 Registra tus gastos del día',
            'No olvides registrar tus gastos de hoy para mantener un mejor control de tus finanzas.',
            {
                icon: '📝',
                link: '/transactions/new',
                priority: 'LOW'
            }
        );
    }

    // Check debts approaching due dates
    static async checkDebtDueDates(userId: string) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get active debts with a due date
        const debts = await prisma.debt.findMany({
            where: {
                userId,
                dueDate: { not: null }
            }
        });

        // Filter to debts that still have a remaining balance
        const activeDebts = debts.filter(d => Number(d.paidAmount) < Number(d.totalAmount));

        for (const debt of activeDebts) {
            const dueDate = new Date(debt.dueDate!);
            const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            const diffTime = dueDateStart.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let priority: NotificationPriority | null = null;
            let icon: string = '💰';
            let titleText: string = '';
            let messageText: string = '';

            const remaining = Number(debt.totalAmount) - Number(debt.paidAmount);

            if (diffDays < 0) {
                // Overdue
                priority = 'URGENT';
                icon = '🔴';
                titleText = `🔴 Deuda vencida: ${debt.creditor}`;
                messageText = `Tu deuda con ${debt.creditor} venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}. Saldo pendiente: $${remaining.toLocaleString()}.`;
            } else if (diffDays === 0) {
                // Due today
                priority = 'URGENT';
                icon = '🔴';
                titleText = `🔴 Deuda vence HOY: ${debt.creditor}`;
                messageText = `Tu deuda con ${debt.creditor} vence hoy. Saldo pendiente: $${remaining.toLocaleString()}.`;
            } else if (diffDays <= 3) {
                // Due within 3 days
                priority = 'HIGH';
                icon = '💰';
                titleText = `💰 Deuda próxima: ${debt.creditor}`;
                messageText = `Tu deuda con ${debt.creditor} vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}. Saldo pendiente: $${remaining.toLocaleString()}.`;
            } else if (diffDays <= 7) {
                // Due within 7 days
                priority = 'NORMAL';
                icon = '💰';
                titleText = `💰 Deuda próxima: ${debt.creditor}`;
                messageText = `Tu deuda con ${debt.creditor} vence en ${diffDays} días. Saldo pendiente: $${remaining.toLocaleString()}.`;
            }

            if (priority) {
                // Deduplicate: check if notification already exists today for this debt
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'DEBT_DUE',
                        message: { contains: debt.creditor },
                        createdAt: { gte: today }
                    }
                });

                if (!existing) {
                    await this.create(
                        userId,
                        'DEBT_DUE',
                        titleText,
                        messageText,
                        {
                            icon,
                            link: '/debts',
                            priority
                        }
                    );
                }
            }
        }
    }

    // Check credit card payment due dates
    static async checkCreditCardPayments(userId: string) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get active credit cards with outstanding balance
        const creditCards = await prisma.creditCard.findMany({
            where: {
                userId,
                isActive: true
            }
        });

        const cardsWithBalance = creditCards.filter(c => Number(c.currentBalance) > 0);

        for (const card of cardsWithBalance) {
            // Calculate the next payment due date based on paymentDueDay
            let paymentDate: Date;
            if (now.getDate() <= card.paymentDueDay) {
                // Payment is this month
                paymentDate = new Date(now.getFullYear(), now.getMonth(), card.paymentDueDay);
            } else {
                // Payment is next month
                paymentDate = new Date(now.getFullYear(), now.getMonth() + 1, card.paymentDueDay);
            }

            const diffTime = paymentDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let priority: NotificationPriority | null = null;
            const balance = Number(card.currentBalance);
            const cardLabel = card.name + (card.lastFourDigits ? ` (*${card.lastFourDigits})` : '');

            if (diffDays === 0) {
                priority = 'URGENT';
            } else if (diffDays <= 2) {
                priority = 'HIGH';
            } else if (diffDays <= 5) {
                priority = 'NORMAL';
            }

            if (priority) {
                // Deduplicate: check if notification already exists today for this card
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'PAYMENT_REMINDER',
                        message: { contains: card.name },
                        createdAt: { gte: today }
                    }
                });

                if (!existing) {
                    let titleText: string;
                    let messageText: string;

                    if (diffDays === 0) {
                        titleText = `💳 Pago de tarjeta HOY: ${cardLabel}`;
                        messageText = `Hoy es el día de pago de tu tarjeta ${cardLabel}. Saldo actual: $${balance.toLocaleString()}.`;
                    } else {
                        titleText = `💳 Pago de tarjeta en ${diffDays} día${diffDays !== 1 ? 's' : ''}: ${cardLabel}`;
                        messageText = `Tu tarjeta ${cardLabel} tiene pago en ${diffDays} día${diffDays !== 1 ? 's' : ''} (día ${card.paymentDueDay}). Saldo actual: $${balance.toLocaleString()}.`;
                    }

                    await this.create(
                        userId,
                        'PAYMENT_REMINDER',
                        titleText,
                        messageText,
                        {
                            icon: '💳',
                            link: '/credit-cards',
                            priority
                        }
                    );
                }
            }
        }
    }

    // Check pending recurring transactions
    static async checkRecurringPending(userId: string) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // End of today for comparison (nextExecution <= today means it should have run)
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Get active recurring transactions that are manual (autoCreate: false) and past due
        const pendingRecurring = await prisma.recurringTransaction.findMany({
            where: {
                userId,
                isActive: true,
                autoCreate: false,
                nextExecution: { lt: todayEnd }
            }
        });

        if (pendingRecurring.length === 0) return;

        // Deduplicate: only one notification per day
        const existing = await prisma.notification.findFirst({
            where: {
                userId,
                type: 'SYSTEM',
                message: { contains: 'transacciones recurrentes' },
                createdAt: { gte: today }
            }
        });

        if (existing) return;

        const count = pendingRecurring.length;
        const itemDescriptions = pendingRecurring.slice(0, 3).map(r => r.description || 'Sin descripción').join(', ');
        const moreText = count > 3 ? ` y ${count - 3} más` : '';
        const priority: NotificationPriority = count >= 3 ? 'HIGH' : 'NORMAL';

        await this.create(
            userId,
            'SYSTEM',
            `🔄 ${count} transacción${count !== 1 ? 'es' : ''} recurrente${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`,
            `Tienes ${count} transacciones recurrentes pendientes de ejecución: ${itemDescriptions}${moreText}. Revisa y confirma.`,
            {
                icon: '🔄',
                link: '/recurring',
                priority
            }
        );
    }

    // Run all checks
    static async runAllChecks(userId: string) {
        await Promise.all([
            this.checkBudgetAlerts(userId),
            this.checkPaymentReminders(userId),
            this.checkGoalsProgress(userId),
            this.checkUnusualSpending(userId),
            this.checkChecklistReminders(userId),
            this.checkDailyExpenseReminder(userId),
            this.checkDebtDueDates(userId),
            this.checkCreditCardPayments(userId),
            this.checkRecurringPending(userId)
        ]);
    }
}

