import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('=== VERIFICACIÓN FINAL DE DATOS ===\n');

    // Users
    const users = await prisma.user.count();
    console.log(`👤 Usuarios: ${users}`);

    // Categories
    const categories = await prisma.category.count();
    console.log(`📁 Categorías: ${categories}`);

    // Transactions
    const transactions = await prisma.transaction.count();
    console.log(`💰 Transacciones: ${transactions}`);

    // Debts
    const debts = await prisma.debt.count();
    const debtPayments = await prisma.debtPayment.count();
    console.log(`💳 Deudas: ${debts} (con ${debtPayments} pagos)`);

    // Savings
    const savings = await prisma.saving.count();
    console.log(`🐷 Ahorros (cajitas): ${savings}`);

    // Savings Goals
    const savingsGoals = await prisma.savingsGoal.count();
    console.log(`🎯 Metas de ahorro: ${savingsGoals}`);

    // Budgets
    const budgets = await prisma.budget.count();
    console.log(`📊 Presupuestos: ${budgets}`);

    // Checklist Items
    const checklistItems = await prisma.checklistItem.count();
    const activeItems = await prisma.checklistItem.count({ where: { isActive: true } });
    console.log(`✅ Checklist items: ${checklistItems} (${activeItems} activos)`);

    // Checklist Completions
    const completions = await prisma.checklistCompletion.count();
    console.log(`☑️ Checklist completions: ${completions}`);

    // Receipts
    const receipts = await prisma.receipt.count();
    console.log(`🧾 Recibos: ${receipts}`);

    // Notifications
    const notifications = await prisma.notification.count();
    console.log(`🔔 Notificaciones: ${notifications}`);

    // Show active checklist with completions
    console.log('\n=== CHECKLIST ACTIVO CON ESTADO ===\n');
    const activeChecklist = await prisma.checklistItem.findMany({
        where: { isActive: true },
        include: {
            category: true,
            completions: {
                orderBy: { month: 'desc' },
                take: 2
            }
        },
        orderBy: { dueDay: 'asc' }
    });

    for (const item of activeChecklist) {
        const status = item.completions.length > 0 ? '✅' : '⬜';
        const lastCompletion = item.completions[0];
        const completedMonth = lastCompletion ? lastCompletion.month.toISOString().slice(0, 7) : 'nunca';
        console.log(`${status} ${item.name} - $${item.amount} (día ${item.dueDay}) [${item.category.name}] - Último: ${completedMonth}`);
    }

    // Show debts summary
    console.log('\n=== RESUMEN DE DEUDAS ===\n');
    const allDebts = await prisma.debt.findMany({
        orderBy: { totalAmount: 'desc' }
    });

    let totalDebt = 0;
    let totalOwed = 0;

    for (const debt of allDebts) {
        const pending = Number(debt.totalAmount) - Number(debt.paidAmount);
        if (pending > 0) {
            totalDebt += pending;
            console.log(`📍 ${debt.creditor}: Pendiente $${pending.toLocaleString()} - ${debt.description || ''}`);
        } else if (pending < 0) {
            totalOwed += Math.abs(pending);
            console.log(`📍 ${debt.creditor}: Te debe $${Math.abs(pending).toLocaleString()} - ${debt.description || ''}`);
        }
    }

    console.log(`\n💰 Total deudas: $${totalDebt.toLocaleString()}`);
    console.log(`💵 Total que te deben: $${totalOwed.toLocaleString()}`);
    console.log(`📊 Balance neto: $${(totalOwed - totalDebt).toLocaleString()}`);

    await prisma.$disconnect();
}

verify().catch(console.error);
