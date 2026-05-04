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

// Maps
const userIdMap: Map<string, string> = new Map();
const categoryIdMap: Map<string, string> = new Map();
const checklistItemIdMap: Map<string, string> = new Map();
const transactionIdMap: Map<string, string> = new Map();

async function migrate() {
    console.log('🚀 Migrando datos restantes de MySQL a PostgreSQL...\n');

    const mysqlConn = await mysql.createConnection(mysqlConfig);

    try {
        // Build user map
        console.log('📦 Construyendo mapas de usuarios...');
        await buildUserMap(mysqlConn);

        // Build category map
        console.log('📦 Construyendo mapas de categorías...');
        await buildCategoryMap(mysqlConn);

        // Build transaction map
        console.log('📦 Construyendo mapas de transacciones...');
        await buildTransactionMap(mysqlConn);

        // Step 1: Delete existing checklist items and completions to rebuild
        console.log('\n📦 Limpiando checklist existente para reconstruir...');
        await cleanupChecklist();

        // Step 2: Migrate checklist items with original IDs
        console.log('\n📦 Migrando checklist items...');
        await migrateChecklistItems(mysqlConn);

        // Step 3: Migrate checklist completions
        console.log('\n📦 Migrando checklist completions...');
        await migrateChecklistCompletions(mysqlConn);

        // Step 4: Migrate receipts
        console.log('\n📦 Migrando recibos...');
        await migrateReceipts(mysqlConn);

        // Step 5: Migrate notifications
        console.log('\n📦 Migrando notificaciones...');
        await migrateNotifications(mysqlConn);

        console.log('\n✅ Migración de datos restantes completada!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mysqlConn.end();
        await prisma.$disconnect();
    }
}

async function buildUserMap(mysqlConn: mysql.Connection) {
    const [mysqlUsers] = await mysqlConn.query('SELECT id, email FROM users');

    for (const mysqlUser of mysqlUsers as any[]) {
        const pgUser = await prisma.user.findUnique({
            where: { email: mysqlUser.email }
        });

        if (pgUser) {
            userIdMap.set(mysqlUser.id, pgUser.id);
        }
    }
    console.log(`  Mapeados ${userIdMap.size} usuarios`);
}

async function buildCategoryMap(mysqlConn: mysql.Connection) {
    const [mysqlCategories] = await mysqlConn.query('SELECT id, name, type FROM categories');

    for (const mysqlCat of mysqlCategories as any[]) {
        // Try to find by original ID first
        let pgCat = await prisma.category.findUnique({
            where: { id: mysqlCat.id }
        });

        if (!pgCat) {
            // Find by name and type
            pgCat = await prisma.category.findFirst({
                where: { name: mysqlCat.name, type: mysqlCat.type }
            });
        }

        if (pgCat) {
            categoryIdMap.set(mysqlCat.id, pgCat.id);
        }
    }
    console.log(`  Mapeadas ${categoryIdMap.size} categorías`);
}

async function buildTransactionMap(mysqlConn: mysql.Connection) {
    const [mysqlTx] = await mysqlConn.query('SELECT id, description, amount, date FROM transactions');

    for (const tx of mysqlTx as any[]) {
        // Try to find by original ID first
        let pgTx = await prisma.transaction.findUnique({
            where: { id: tx.id }
        });

        if (!pgTx) {
            // Find by description, amount and date
            pgTx = await prisma.transaction.findFirst({
                where: {
                    description: tx.description,
                    amount: parseFloat(tx.amount),
                    date: tx.date
                }
            });
        }

        if (pgTx) {
            transactionIdMap.set(tx.id, pgTx.id);
        }
    }
    console.log(`  Mapeadas ${transactionIdMap.size} transacciones`);
}

async function cleanupChecklist() {
    // Delete completions first (foreign key)
    const deletedCompletions = await prisma.checklistCompletion.deleteMany({});
    console.log(`  Eliminadas ${deletedCompletions.count} completions existentes`);

    // Delete checklist items
    const deletedItems = await prisma.checklistItem.deleteMany({});
    console.log(`  Eliminados ${deletedItems.count} checklist items existentes`);
}

async function migrateChecklistItems(mysqlConn: mysql.Connection) {
    const [mysqlItems] = await mysqlConn.query('SELECT * FROM monthly_checklist');
    let created = 0;

    for (const item of mysqlItems as any[]) {
        const pgUserId = userIdMap.get(item.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Item omitido - usuario no mapeado: ${item.name}`);
            continue;
        }

        let pgCategoryId = categoryIdMap.get(item.category_id);
        if (!pgCategoryId) {
            console.log(`  ⚠ Item omitido - categoría no mapeada: ${item.name}`);
            continue;
        }

        try {
            const newItem = await prisma.checklistItem.create({
                data: {
                    id: item.id, // Preserve original ID for completions
                    userId: pgUserId,
                    name: item.name,
                    amount: parseFloat(item.amount),
                    categoryId: pgCategoryId,
                    dueDay: item.due_day,
                    isActive: item.is_active === 1,
                    deletedAt: item.deleted_at,
                }
            });
            checklistItemIdMap.set(item.id, newItem.id);
            created++;
            console.log(`  ✓ Item creado: ${item.name} (${item.is_active ? 'activo' : 'inactivo'})`);
        } catch (e: any) {
            console.log(`  ⚠ Error creando item ${item.name}: ${e.message}`);
        }
    }

    console.log(`  Total: ${created} items creados`);
}

async function migrateChecklistCompletions(mysqlConn: mysql.Connection) {
    const [mysqlCompletions] = await mysqlConn.query('SELECT * FROM checklist_completions');
    let created = 0, skipped = 0;

    for (const comp of mysqlCompletions as any[]) {
        // Check if checklist item exists
        const checklistItem = await prisma.checklistItem.findUnique({
            where: { id: comp.checklist_item_id }
        });

        if (!checklistItem) {
            console.log(`  ⚠ Completion omitida - item no encontrado: ${comp.checklist_item_id}`);
            skipped++;
            continue;
        }

        // Map transaction ID if exists
        let pgTransactionId = null;
        if (comp.transaction_id) {
            pgTransactionId = transactionIdMap.get(comp.transaction_id);
            if (!pgTransactionId) {
                // Try direct lookup
                const tx = await prisma.transaction.findUnique({
                    where: { id: comp.transaction_id }
                });
                if (tx) {
                    pgTransactionId = tx.id;
                }
            }
        }

        try {
            await prisma.checklistCompletion.create({
                data: {
                    id: comp.id,
                    checklistItemId: comp.checklist_item_id,
                    transactionId: pgTransactionId,
                    month: comp.month,
                    isCompleted: comp.is_completed === 1,
                    completedAt: comp.completed_at,
                }
            });
            created++;
            console.log(`  ✓ Completion creada para item: ${checklistItem.name} (${comp.month.toISOString().slice(0, 7)})`);
        } catch (e: any) {
            console.log(`  ⚠ Error: ${e.message}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} completions creadas, ${skipped} omitidas`);
}

async function migrateReceipts(mysqlConn: mysql.Connection) {
    const [mysqlReceipts] = await mysqlConn.query('SELECT * FROM receipts');
    let created = 0, skipped = 0;

    for (const receipt of mysqlReceipts as any[]) {
        const pgUserId = userIdMap.get(receipt.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Recibo omitido - usuario no mapeado`);
            skipped++;
            continue;
        }

        // Check if receipt already exists
        const existing = await prisma.receipt.findFirst({
            where: {
                userId: pgUserId,
                imageUrl: receipt.image_url
            }
        });

        if (existing) {
            console.log(`  → Recibo existente: ${receipt.image_url}`);
            skipped++;
            continue;
        }

        try {
            await prisma.receipt.create({
                data: {
                    userId: pgUserId,
                    imageUrl: receipt.image_url,
                    ocrData: receipt.ocr_data,
                    extractedAmount: receipt.extracted_amount ? parseFloat(receipt.extracted_amount) : null,
                    extractedDate: receipt.extracted_date,
                    extractedMerchant: receipt.extracted_merchant,
                    confidenceScore: receipt.confidence_score,
                    status: receipt.status || 'PENDING',
                }
            });
            created++;
            console.log(`  ✓ Recibo creado: ${receipt.image_url}`);
        } catch (e: any) {
            console.log(`  ⚠ Error: ${e.message}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} recibos creados, ${skipped} omitidos`);
}

async function migrateNotifications(mysqlConn: mysql.Connection) {
    const [mysqlNotifs] = await mysqlConn.query('SELECT * FROM notifications');
    let created = 0, skipped = 0;

    for (const notif of mysqlNotifs as any[]) {
        const pgUserId = userIdMap.get(notif.user_id);
        if (!pgUserId) {
            console.log(`  ⚠ Notificación omitida - usuario no mapeado`);
            skipped++;
            continue;
        }

        // Check if notification already exists
        const existing = await prisma.notification.findFirst({
            where: {
                userId: pgUserId,
                title: notif.title,
                createdAt: notif.created_at
            }
        });

        if (existing) {
            skipped++;
            continue;
        }

        try {
            await prisma.notification.create({
                data: {
                    userId: pgUserId,
                    type: notif.type,
                    title: notif.title,
                    message: notif.message,
                    icon: notif.icon || '🔔',
                    link: notif.link,
                    priority: notif.priority || 'NORMAL',
                    isRead: notif.is_read === 1,
                    readAt: notif.read_at,
                }
            });
            created++;
            console.log(`  ✓ Notificación creada: ${notif.title}`);
        } catch (e: any) {
            console.log(`  ⚠ Error: ${e.message}`);
            skipped++;
        }
    }

    console.log(`  Total: ${created} notificaciones creadas, ${skipped} omitidas`);
}

migrate().catch(console.error);
