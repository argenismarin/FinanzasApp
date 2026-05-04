import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('=== VERIFICANDO DATOS EN LA BASE DE DATOS ===\n');

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, password: true }
    });
    console.log(`Users: ${users.length} registros`);
    console.log('Usuarios:', users.map(u => ({ email: u.email, name: u.name, hasPassword: !!u.password })));

    const transactions = await prisma.transaction.count();
    console.log(`Transactions: ${transactions} registros`);

    const categories = await prisma.category.count();
    console.log(`Categories: ${categories} registros`);

    const bankAccounts = await prisma.bankAccount.count();
    console.log(`BankAccounts: ${bankAccounts} registros`);

    const budgets = await prisma.budget.count();
    console.log(`Budgets: ${budgets} registros`);

    const debts = await prisma.debt.count();
    console.log(`Debts: ${debts} registros`);

    const savingsGoals = await prisma.savingsGoal.count();
    console.log(`SavingsGoals: ${savingsGoals} registros`);

    const reminders = await prisma.paymentReminder.count();
    console.log(`Reminders: ${reminders} registros`);

    const savings = await prisma.saving.count();
    console.log(`Savings: ${savings} registros`);

    const receipts = await prisma.receipt.count();
    console.log(`Receipts: ${receipts} registros`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
