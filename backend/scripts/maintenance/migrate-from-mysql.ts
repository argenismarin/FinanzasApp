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

// Map of MySQL user IDs to PostgreSQL user IDs (by email)
const userIdMap: Map<string, string> = new Map();
const categoryIdMap: Map<string, string> = new Map();
const debtIdMap: Map<string, string> = new Map();

async function migrate() {
    console.log('🚀 Iniciando migración de MySQL a PostgreSQL...\n');

    const mysqlConn = await mysql.createConnection(mysqlConfig);

    try {
        // Step 1: Migrate Users
        console.log('📦 Paso 1: Migrando usuarios...');
        await migrateUsers(mysqlConn);

        // Step 2: Migrate Categories
        console.log('\n📦 Paso 2: Migrando categorías...');
        await migrateCategories(mysqlConn);

        // Step 3: Migrate Debts
        console.log('\n📦 Paso 3: Migrando deudas...');
        await migrateDebts(mysqlConn);

        // Step 4: Migrate Debt Payments
        console.log('\n📦 Paso 4: Migrando pagos de deudas...');
        await migrateDebtPayments(mysqlConn);

        // Step 5: Migrate Savings
        console.log('\n📦 Paso 5: Migrando ahorros...');
        await migrateSavings(mysqlConn);

        // Step 6: Migrate Savings Goals
        console.log('\n📦 Paso 6: Migrando metas de ahorro...');
        await migrateSavingsGoals(mysqlConn);

        // Step 7: Migrate Transactions
        console.log('\n📦 Paso 7: Migrando transacciones...');
        await migrateTransactions(mysqlConn);

        // Step 8: Migrate Budgets
        console.log('\n📦 Paso 8: Migrando presupuestos...');
        await migrateBudgets(mysqlConn);

        // Step 9: Migrate Checklist Items
        console.log('\n📦 Paso 9: Migrando checklist...');
        await migrateChecklistItems(mysqlConn);

        console.log('\n✅ Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        await mysqlConn.end();
        await prisma.$disconnect();
    }
}

async function migrateUsers(mysqlConn: mysql.Connection) {
    const [mysqlUsers] = await mysqlConn.query('SELECT * FROM users');

    for (const mysqlUser of mysqlUsers as any[]) {
        // Check if user exists in PostgreSQL by email
        let pgUser = await prisma.user.findUnique({
            where: { email: mysqlUser.email }
        });

        if (!pgUser) {
            // Create user in PostgreSQL
            pgUser = await prisma.user.create({
                data: {
                    email: mysqlUser.email,
                    name: mysqlUser.name,
                    password: mysqlUser.password,
                    role: mysqlUser.role || 'USER',
                    isActive: mysqlUser.is_active === 1,
                    settings: mysqlUser.settings,
                    theme: mysqlUser.theme || 'light',
                    defaultCurrency: mysqlUser.default_currency || 'COP',
                    avatarUrl: mysqlUser.avatar_url,
                    microsoftId: mysqlUser.microsoft_id,
                }
            });
            console.log(`  ✓ Usuario creado: ${pgUser.email}`);
        } else {
            console.log(`  → Usuario existente: ${pgUser.email}`);
        }

        // Map MySQL user ID to PostgreSQL user ID
        userIdMap.set(mysqlUser.id, pgUser.id);
    }

    console.log(`  Total: ${(mysqlUsers as any[]).length} usuarios procesados`);
}

async function migrateCategories(mysqlConn: mysql.Connection) {
    const [mysqlCategories] = await mysqlConn.query('SELECT * FROM categories');

    for (const mysqlCat of mysqlCategories as any[]) {
        // Check if category exists
        const existingCat = await prisma.category.findFirst({
            where: {
                name: mysqlCat.name,
                type: mysqlCat.type,
                userId: mysqlCat.user_id ? userIdMap.get(mysqlCat.user_id) : null
            }
        });

        if (!existingCat) {
            try {
                const newCat = await prisma.category.create({
                    data: {
                        name: mysqlCat.name,
                        type: mysqlCat.type,
                        color: mysqlCat.color,
                        icon: mysqlCat.icon,
                        isDefault: mysqlCat.is_default === 1,
                        userId: mysqlCat.user_id ? userIdMap.get(mysqlCat.user_id) : null,
                    }
                });
                categoryIdMap.set(mysqlCat.id, newCat.id);
                console.log(`  ✓ Categoría creada: ${newCat.name}`);
            } catch (e: any) {
                console.log(`  ⚠ Categoría omitida (duplicada): ${mysqlCat.name}`);
            }
        } else {
            categoryIdMap.set(mysqlCat.id, existingCat.id);
            console.log(`  → Categoría existente: ${existingCat.name}`);
        }
    }

    console.log(`  Total: ${(mysqlCategories as any[]).length} categorías procesadas`);
}

async function migrateDebts(mysqlConn: mysql.Connection) {
    const [mysqlDebts] = await mysqlConn.query('SELECT * FROM debts');
    let created = 0, skipped = 0;

    for (const debt of mysqlDebts as any[]) {
        const pgUserId = userIdMap.get(debt.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Deuda omitida - usuario no encontrado: ${debt.user_id}`);
            skipped++;
            continue;
        }

        // Check if debt already exists
        const existingDebt = await prisma.debt.findFirst({
            where: {
                userId: pgUserId,
                creditor: debt.creditor,
                totalAmount: parseFloat(debt.totalAmount)
            }
        });

        if (!existingDebt) {
            const newDebt = await prisma.debt.create({
                data: {
                    userId: pgUserId,
                    creditor: debt.creditor,
                    totalAmount: parseFloat(debt.totalAmount),
                    paidAmount: parseFloat(debt.paidAmount),
                    description: debt.description,
                    dueDate: debt.due_date,
                }
            });
            debtIdMap.set(debt.id, newDebt.id);
            created++;
            console.log(`  ✓ Deuda creada: ${debt.creditor} - $${debt.totalAmount}`);
        } else {
            debtIdMap.set(debt.id, existingDebt.id);
            console.log(`  → Deuda existente: ${debt.creditor}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} creadas, ${skipped} omitidas`);
}

async function migrateDebtPayments(mysqlConn: mysql.Connection) {
    const [mysqlPayments] = await mysqlConn.query('SELECT * FROM debt_payments');
    let created = 0, skipped = 0;

    for (const payment of mysqlPayments as any[]) {
        // Get mapped debt ID
        const pgDebtId = debtIdMap.get(payment.debt_id);

        if (!pgDebtId) {
            console.log(`  ⚠ Pago omitido - deuda no mapeada: ${payment.debt_id}`);
            skipped++;
            continue;
        }

        // Check if payment already exists
        const existingPayment = await prisma.debtPayment.findFirst({
            where: {
                debtId: pgDebtId,
                amount: parseFloat(payment.amount),
                paymentDate: payment.payment_date
            }
        });

        if (!existingPayment) {
            await prisma.debtPayment.create({
                data: {
                    debtId: pgDebtId,
                    amount: parseFloat(payment.amount),
                    description: payment.description,
                    paymentDate: payment.payment_date,
                }
            });
            created++;
            console.log(`  ✓ Pago creado: $${payment.amount}`);
        } else {
            console.log(`  → Pago existente: $${payment.amount}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} creados, ${skipped} omitidos`);
}

async function migrateSavings(mysqlConn: mysql.Connection) {
    const [mysqlSavings] = await mysqlConn.query('SELECT * FROM savings');
    let created = 0, skipped = 0;

    for (const saving of mysqlSavings as any[]) {
        const pgUserId = userIdMap.get(saving.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Ahorro omitido - usuario no encontrado: ${saving.user_id}`);
            skipped++;
            continue;
        }

        // Check if saving already exists
        const existingSaving = await prisma.saving.findFirst({
            where: {
                userId: pgUserId,
                name: saving.name
            }
        });

        if (!existingSaving) {
            await prisma.saving.create({
                data: {
                    userId: pgUserId,
                    name: saving.name,
                    amount: parseFloat(saving.amount),
                    purpose: saving.purpose,
                }
            });
            created++;
            console.log(`  ✓ Ahorro creado: ${saving.name} - $${saving.amount}`);
        } else {
            console.log(`  → Ahorro existente: ${saving.name}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} creados, ${skipped} omitidos`);
}

async function migrateSavingsGoals(mysqlConn: mysql.Connection) {
    const [mysqlGoals] = await mysqlConn.query('SELECT * FROM savings_goals');
    let created = 0, skipped = 0;

    for (const goal of mysqlGoals as any[]) {
        const pgUserId = userIdMap.get(goal.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Meta omitida - usuario no encontrado: ${goal.user_id}`);
            skipped++;
            continue;
        }

        // Check if goal already exists
        const existingGoal = await prisma.savingsGoal.findFirst({
            where: {
                userId: pgUserId,
                name: goal.name
            }
        });

        if (!existingGoal) {
            await prisma.savingsGoal.create({
                data: {
                    userId: pgUserId,
                    name: goal.name,
                    targetAmount: parseFloat(goal.target_amount),
                    currentAmount: parseFloat(goal.current_amount),
                    deadline: goal.deadline,
                    isCompleted: goal.is_completed === 1,
                }
            });
            created++;
            console.log(`  ✓ Meta creada: ${goal.name} - $${goal.target_amount}`);
        } else {
            console.log(`  → Meta existente: ${goal.name}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} creadas, ${skipped} omitidas`);
}

async function migrateTransactions(mysqlConn: mysql.Connection) {
    const [mysqlTransactions] = await mysqlConn.query('SELECT * FROM transactions ORDER BY date');
    let created = 0, skipped = 0;

    for (const tx of mysqlTransactions as any[]) {
        const pgUserId = userIdMap.get(tx.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Transacción omitida - usuario no encontrado: ${tx.user_id}`);
            skipped++;
            continue;
        }

        let pgCategoryId = categoryIdMap.get(tx.category_id);
        if (!pgCategoryId) {
            // Try to find category in PostgreSQL
            const existingCat = await prisma.category.findUnique({
                where: { id: tx.category_id }
            });
            if (existingCat) {
                pgCategoryId = existingCat.id;
            } else {
                console.log(`  ⚠ Transacción omitida - categoría no encontrada: ${tx.category_id}`);
                skipped++;
                continue;
            }
        }

        // Check if transaction already exists
        const existingTx = await prisma.transaction.findFirst({
            where: {
                userId: pgUserId,
                amount: parseFloat(tx.amount),
                date: tx.date,
                description: tx.description
            }
        });

        if (!existingTx) {
            try {
                await prisma.transaction.create({
                    data: {
                        userId: pgUserId,
                        type: tx.type,
                        amount: parseFloat(tx.amount),
                        currency: tx.currency || 'COP',
                        categoryId: pgCategoryId,
                        description: tx.description,
                        date: tx.date,
                        isRecurring: tx.is_recurring === 1,
                        recurringPattern: tx.recurring_pattern,
                        metadata: tx.metadata,
                        createdBy: tx.created_by ? userIdMap.get(tx.created_by) : null,
                    }
                });
                created++;
            } catch (e: any) {
                console.log(`  ⚠ Error creando transacción: ${e.message}`);
                skipped++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`  Total: ${created} creadas, ${skipped} omitidas`);
}

async function migrateBudgets(mysqlConn: mysql.Connection) {
    const [mysqlBudgets] = await mysqlConn.query('SELECT * FROM budgets');
    let created = 0, skipped = 0;

    for (const budget of mysqlBudgets as any[]) {
        const pgUserId = userIdMap.get(budget.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Presupuesto omitido - usuario no encontrado`);
            skipped++;
            continue;
        }

        let pgCategoryId = categoryIdMap.get(budget.category_id);
        if (!pgCategoryId) {
            const existingCat = await prisma.category.findUnique({
                where: { id: budget.category_id }
            });
            if (existingCat) {
                pgCategoryId = existingCat.id;
            } else {
                console.log(`  ⚠ Presupuesto omitido - categoría no encontrada`);
                skipped++;
                continue;
            }
        }

        const existingBudget = await prisma.budget.findFirst({
            where: {
                userId: pgUserId,
                categoryId: pgCategoryId
            }
        });

        if (!existingBudget) {
            await prisma.budget.create({
                data: {
                    userId: pgUserId,
                    categoryId: pgCategoryId,
                    amount: parseFloat(budget.amount),
                    period: budget.period || 'MONTHLY',
                    startDate: budget.start_date,
                    endDate: budget.end_date,
                    isActive: budget.is_active === 1,
                }
            });
            created++;
            console.log(`  ✓ Presupuesto creado: $${budget.amount}`);
        } else {
            skipped++;
        }
    }

    console.log(`  Total: ${created} creados, ${skipped} omitidos`);
}

async function migrateChecklistItems(mysqlConn: mysql.Connection) {
    const [mysqlItems] = await mysqlConn.query('SELECT * FROM monthly_checklist');
    let created = 0, skipped = 0;

    for (const item of mysqlItems as any[]) {
        const pgUserId = userIdMap.get(item.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Item omitido - usuario no encontrado`);
            skipped++;
            continue;
        }

        let pgCategoryId = categoryIdMap.get(item.category_id);
        if (!pgCategoryId) {
            const existingCat = await prisma.category.findUnique({
                where: { id: item.category_id }
            });
            if (existingCat) {
                pgCategoryId = existingCat.id;
            } else {
                console.log(`  ⚠ Item omitido - categoría no encontrada`);
                skipped++;
                continue;
            }
        }

        const existingItem = await prisma.checklistItem.findFirst({
            where: {
                userId: pgUserId,
                name: item.name
            }
        });

        if (!existingItem) {
            await prisma.checklistItem.create({
                data: {
                    userId: pgUserId,
                    name: item.name,
                    amount: parseFloat(item.amount),
                    categoryId: pgCategoryId,
                    dueDay: item.due_day,
                    isActive: item.is_active === 1,
                }
            });
            created++;
            console.log(`  ✓ Item creado: ${item.name}`);
        } else {
            skipped++;
        }
    }

    console.log(`  Total: ${created} creados, ${skipped} omitidos`);
}

// Run migration
migrate().catch(console.error);
