import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

const mysqlConfig = {
    host: 'srv1769.hstgr.io',
    port: 3306,
    user: 'u412677652_argema08',
    password: 'Yosoyargenis108$',
    database: 'u412677652_semanamineria'
};

const prisma = new PrismaClient();

async function fix() {
    console.log('🔧 Corrigiendo datos...\n');

    const mysqlConn = await mysql.createConnection(mysqlConfig);

    try {
        // 1. Delete inactive checklist items
        console.log('📦 Paso 1: Eliminando checklist items inactivos...');

        // First delete completions for inactive items
        const inactiveItems = await prisma.checklistItem.findMany({
            where: { isActive: false },
            select: { id: true, name: true }
        });

        console.log(`  Encontrados ${inactiveItems.length} items inactivos`);

        for (const item of inactiveItems) {
            await prisma.checklistCompletion.deleteMany({
                where: { checklistItemId: item.id }
            });
            console.log(`  🗑️ Eliminando: ${item.name}`);
        }

        const deleted = await prisma.checklistItem.deleteMany({
            where: { isActive: false }
        });
        console.log(`  ✓ Eliminados ${deleted.count} items inactivos\n`);

        // 2. Fix debt dates from MySQL
        console.log('📦 Paso 2: Restaurando fechas de deudas desde MySQL...');

        const [mysqlDebts] = await mysqlConn.query('SELECT * FROM debts');

        for (const mysqlDebt of mysqlDebts as any[]) {
            // Find matching debt in PostgreSQL by creditor, amount and description
            const pgDebt = await prisma.debt.findFirst({
                where: {
                    creditor: mysqlDebt.creditor,
                    totalAmount: parseFloat(mysqlDebt.totalAmount),
                    description: mysqlDebt.description
                }
            });

            if (pgDebt) {
                await prisma.debt.update({
                    where: { id: pgDebt.id },
                    data: {
                        dueDate: mysqlDebt.due_date,
                        createdAt: mysqlDebt.created_at,
                        updatedAt: mysqlDebt.updated_at
                    }
                });
                console.log(`  ✓ Actualizado: ${mysqlDebt.creditor} - ${mysqlDebt.description || 'sin descripción'}`);
                console.log(`    Fecha vencimiento: ${mysqlDebt.due_date ? mysqlDebt.due_date.toISOString().slice(0, 10) : 'ninguna'}`);
                console.log(`    Creado: ${mysqlDebt.created_at.toISOString().slice(0, 10)}`);
            }
        }

        // 3. Fix debt payment dates
        console.log('\n📦 Paso 3: Restaurando fechas de pagos de deudas...');

        const [mysqlPayments] = await mysqlConn.query('SELECT * FROM debt_payments');

        for (const mysqlPay of mysqlPayments as any[]) {
            // Find the debt in MySQL to get creditor info
            const [mysqlDebtRows] = await mysqlConn.query(
                'SELECT creditor, totalAmount, description FROM debts WHERE id = ?',
                [mysqlPay.debt_id]
            );
            const mysqlDebt = (mysqlDebtRows as any[])[0];

            if (!mysqlDebt) continue;

            // Find matching debt in PostgreSQL
            const pgDebt = await prisma.debt.findFirst({
                where: {
                    creditor: mysqlDebt.creditor,
                    totalAmount: parseFloat(mysqlDebt.totalAmount),
                    description: mysqlDebt.description
                }
            });

            if (pgDebt) {
                // Find payment in PostgreSQL
                const pgPayment = await prisma.debtPayment.findFirst({
                    where: {
                        debtId: pgDebt.id,
                        amount: parseFloat(mysqlPay.amount)
                    }
                });

                if (pgPayment) {
                    await prisma.debtPayment.update({
                        where: { id: pgPayment.id },
                        data: {
                            paymentDate: mysqlPay.payment_date,
                            createdAt: mysqlPay.created_at
                        }
                    });
                    console.log(`  ✓ Pago actualizado: $${mysqlPay.amount} - ${mysqlPay.payment_date.toISOString().slice(0, 10)}`);
                }
            }
        }

        // 4. Fix transaction dates
        console.log('\n📦 Paso 4: Restaurando fechas de transacciones...');

        const [mysqlTx] = await mysqlConn.query('SELECT * FROM transactions');
        let txUpdated = 0;

        for (const tx of mysqlTx as any[]) {
            const pgTx = await prisma.transaction.findFirst({
                where: {
                    description: tx.description,
                    amount: parseFloat(tx.amount),
                    date: tx.date
                }
            });

            if (pgTx) {
                await prisma.transaction.update({
                    where: { id: pgTx.id },
                    data: {
                        createdAt: tx.created_at,
                        updatedAt: tx.updated_at
                    }
                });
                txUpdated++;
            }
        }
        console.log(`  ✓ ${txUpdated} transacciones actualizadas`);

        // 5. Fix savings dates
        console.log('\n📦 Paso 5: Restaurando fechas de ahorros...');

        const [mysqlSavings] = await mysqlConn.query('SELECT * FROM savings');

        for (const saving of mysqlSavings as any[]) {
            const pgSaving = await prisma.saving.findFirst({
                where: { name: saving.name }
            });

            if (pgSaving) {
                await prisma.saving.update({
                    where: { id: pgSaving.id },
                    data: {
                        createdAt: saving.created_at,
                        updatedAt: saving.updated_at
                    }
                });
                console.log(`  ✓ Ahorro actualizado: ${saving.name}`);
            }
        }

        // 6. Fix savings goals dates
        console.log('\n📦 Paso 6: Restaurando fechas de metas de ahorro...');

        const [mysqlGoals] = await mysqlConn.query('SELECT * FROM savings_goals');

        for (const goal of mysqlGoals as any[]) {
            const pgGoal = await prisma.savingsGoal.findFirst({
                where: { name: goal.name }
            });

            if (pgGoal) {
                await prisma.savingsGoal.update({
                    where: { id: pgGoal.id },
                    data: {
                        deadline: goal.deadline,
                        createdAt: goal.created_at,
                        updatedAt: goal.updated_at
                    }
                });
                console.log(`  ✓ Meta actualizada: ${goal.name}`);
            }
        }

        console.log('\n✅ Correcciones completadas!');

        // Show final checklist
        console.log('\n=== CHECKLIST FINAL ===');
        const finalItems = await prisma.checklistItem.findMany({
            include: { category: true },
            orderBy: { dueDay: 'asc' }
        });

        for (const item of finalItems) {
            console.log(`  ✅ ${item.name} - $${item.amount} (día ${item.dueDay}) [${item.category.name}]`);
        }

        // Show debts with dates
        console.log('\n=== DEUDAS CON FECHAS ===');
        const finalDebts = await prisma.debt.findMany({
            orderBy: { createdAt: 'asc' }
        });

        for (const debt of finalDebts) {
            const dueStr = debt.dueDate ? debt.dueDate.toISOString().slice(0, 10) : 'sin fecha';
            const createdStr = debt.createdAt.toISOString().slice(0, 10);
            console.log(`  ${debt.creditor}: $${debt.totalAmount} | Vence: ${dueStr} | Creada: ${createdStr} | ${debt.description || ''}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mysqlConn.end();
        await prisma.$disconnect();
    }
}

fix().catch(console.error);
