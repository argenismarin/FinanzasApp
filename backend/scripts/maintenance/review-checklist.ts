import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function review() {
    console.log('=== REVISANDO CHECKLIST ITEMS ===\n');

    // Get all checklist items with their completions
    const items = await prisma.checklistItem.findMany({
        include: {
            category: true,
            completions: {
                include: {
                    transaction: true
                }
            }
        },
        orderBy: { dueDay: 'asc' }
    });

    console.log('=== ITEMS CON TRANSACCIÓN (SE MANTIENEN) ===\n');
    const keepItems: string[] = [];
    const deleteItems: string[] = [];

    for (const item of items) {
        const hasTransaction = item.completions.some(c => c.transactionId !== null);

        if (hasTransaction) {
            keepItems.push(item.id);
            const tx = item.completions.find(c => c.transaction)?.transaction;
            console.log(`✅ ${item.name} - $${item.amount} (día ${item.dueDay}) [${item.category.name}]`);
            if (tx) {
                console.log(`   └─ Transacción: ${tx.description} - $${tx.amount}`);
            }
        }
    }

    console.log('\n=== ITEMS SIN TRANSACCIÓN (SE ELIMINARÁN) ===\n');
    for (const item of items) {
        const hasTransaction = item.completions.some(c => c.transactionId !== null);

        if (!hasTransaction) {
            deleteItems.push(item.id);
            console.log(`❌ ${item.name} - $${item.amount} (día ${item.dueDay}) [${item.category.name}]`);
        }
    }

    console.log(`\n=== RESUMEN ===`);
    console.log(`Mantener: ${keepItems.length} items`);
    console.log(`Eliminar: ${deleteItems.length} items`);

    await prisma.$disconnect();
}

review().catch(console.error);
