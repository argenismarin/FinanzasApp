import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration: Create "General" accounts and assign orphan transactions...');

    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    console.log(`Found ${users.length} users`);

    for (const user of users) {
        console.log(`\nProcessing user: ${user.name} (${user.id})`);

        // Find or create "General" account
        let generalAccount = await prisma.bankAccount.findFirst({
            where: { userId: user.id, name: 'General' }
        });

        if (!generalAccount) {
            generalAccount = await prisma.bankAccount.create({
                data: {
                    userId: user.id,
                    name: 'General',
                    type: 'CHECKING',
                    balance: 0,
                    currency: 'COP',
                    isActive: true,
                }
            });
            console.log(`  Created "General" account: ${generalAccount.id}`);
        } else {
            console.log(`  "General" account already exists: ${generalAccount.id}`);
        }

        // Assign all transactions with no account to "General"
        const updated = await prisma.transaction.updateMany({
            where: { userId: user.id, accountId: null },
            data: { accountId: generalAccount.id }
        });
        console.log(`  Assigned ${updated.count} orphan transactions to "General"`);

        // Recalculate balance: sum(INCOME) - sum(EXPENSE)
        const [incomeAgg, expenseAgg] = await Promise.all([
            prisma.transaction.aggregate({
                where: { accountId: generalAccount.id, type: 'INCOME' },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { accountId: generalAccount.id, type: 'EXPENSE' },
                _sum: { amount: true }
            }),
        ]);

        const income = Number(incomeAgg._sum.amount || 0);
        const expense = Number(expenseAgg._sum.amount || 0);
        const newBalance = income - expense;

        await prisma.bankAccount.update({
            where: { id: generalAccount.id },
            data: { balance: newBalance }
        });
        console.log(`  Updated balance: ${newBalance} (income: ${income}, expense: ${expense})`);
    }

    console.log('\nMigration completed successfully!');
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
