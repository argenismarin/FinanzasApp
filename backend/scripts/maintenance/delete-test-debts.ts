import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
    // Delete test debts with amount 1000
    const result = await prisma.debt.deleteMany({
        where: {
            totalAmount: 1000
        }
    });
    console.log('Deudas de prueba eliminadas:', result.count);

    const finalCount = await prisma.debt.count();
    console.log('Total deudas restantes:', finalCount);

    // Show remaining debts
    const debts = await prisma.debt.findMany({
        orderBy: { creditor: 'asc' }
    });

    console.log('\nDeudas finales:');
    for (const debt of debts) {
        const pending = Number(debt.totalAmount) - Number(debt.paidAmount);
        console.log(`  ${debt.creditor}: $${debt.totalAmount} (Pendiente: $${pending}) - ${debt.description || ''}`);
    }

    await prisma.$disconnect();
}
cleanup();
