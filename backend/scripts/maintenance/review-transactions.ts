import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function review() {
    console.log('=== REVISANDO TRANSACCIONES ===\n');

    // Get transactions linked to checklist completions
    const completions = await prisma.checklistCompletion.findMany({
        where: { transactionId: { not: null } },
        select: { transactionId: true }
    });

    const checklistTxIds = new Set(completions.map(c => c.transactionId));
    console.log(`Transacciones de checklist: ${checklistTxIds.size}\n`);

    // Get all transactions
    const allTransactions = await prisma.transaction.findMany({
        include: { category: true },
        orderBy: { date: 'desc' }
    });

    console.log('=== TRANSACCIONES DE CHECKLIST (SE MANTIENEN) ===\n');
    const keepTx: string[] = [];
    const deleteTx: string[] = [];

    for (const tx of allTransactions) {
        if (checklistTxIds.has(tx.id)) {
            keepTx.push(tx.id);
            console.log(`✅ ${tx.date.toISOString().slice(0, 10)} | ${tx.type} | $${tx.amount} | ${tx.description} | [${tx.category.name}]`);
        }
    }

    console.log('\n=== OTRAS TRANSACCIONES (SE ELIMINARÁN) ===\n');
    for (const tx of allTransactions) {
        if (!checklistTxIds.has(tx.id)) {
            deleteTx.push(tx.id);
            console.log(`❌ ${tx.date.toISOString().slice(0, 10)} | ${tx.type} | $${tx.amount} | ${tx.description} | [${tx.category.name}]`);
        }
    }

    console.log(`\n=== RESUMEN ===`);
    console.log(`Mantener: ${keepTx.length} transacciones`);
    console.log(`Eliminar: ${deleteTx.length} transacciones`);

    await prisma.$disconnect();
}

review().catch(console.error);
