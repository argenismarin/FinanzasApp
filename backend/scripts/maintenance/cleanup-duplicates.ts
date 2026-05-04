import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
    console.log('🧹 Limpiando duplicados...\n');

    // Get all debts
    const debts = await prisma.debt.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Total deudas: ${debts.length}`);

    // Find duplicates (same creditor, totalAmount, userId)
    const seen = new Map<string, string>();
    const duplicateIds: string[] = [];

    for (const debt of debts) {
        const key = `${debt.userId}-${debt.creditor}-${debt.totalAmount.toString()}-${debt.description || ''}`;

        if (seen.has(key)) {
            duplicateIds.push(debt.id);
            console.log(`  Duplicado encontrado: ${debt.creditor} - $${debt.totalAmount} (${debt.description || 'sin descripción'})`);
        } else {
            seen.set(key, debt.id);
        }
    }

    if (duplicateIds.length > 0) {
        console.log(`\nEliminando ${duplicateIds.length} duplicados...`);

        // First delete related debt payments
        await prisma.debtPayment.deleteMany({
            where: { debtId: { in: duplicateIds } }
        });

        // Then delete duplicate debts
        await prisma.debt.deleteMany({
            where: { id: { in: duplicateIds } }
        });

        console.log('✓ Duplicados eliminados');
    } else {
        console.log('\nNo se encontraron duplicados.');
    }

    // Show final count
    const finalCount = await prisma.debt.count();
    console.log(`\nTotal deudas después de limpieza: ${finalCount}`);

    // Show all debts
    const finalDebts = await prisma.debt.findMany({
        orderBy: { createdAt: 'desc' }
    });

    console.log('\nDeudas actuales:');
    for (const debt of finalDebts) {
        const pending = Number(debt.totalAmount) - Number(debt.paidAmount);
        console.log(`  - ${debt.creditor}: Total $${debt.totalAmount}, Pagado $${debt.paidAmount}, Pendiente $${pending} | ${debt.description || ''}`);
    }

    await prisma.$disconnect();
}

cleanupDuplicates().catch(console.error);
