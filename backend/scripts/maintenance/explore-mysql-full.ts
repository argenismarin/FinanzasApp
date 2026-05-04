import mysql from 'mysql2/promise';

const mysqlConfig = {
    host: 'srv1769.hstgr.io',
    port: 3306,
    user: 'u412677652_argema08',
    password: 'Yosoyargenis108$',
    database: 'u412677652_semanamineria'
};

async function explore() {
    const conn = await mysql.createConnection(mysqlConfig);

    console.log('=== CHECKLIST COMPLETIONS ===');
    const [completions] = await conn.query('SELECT * FROM checklist_completions');
    console.log('Total:', (completions as any[]).length);
    console.log(completions);

    console.log('\n=== MONTHLY CHECKLIST (Items) ===');
    const [checklist] = await conn.query('SELECT * FROM monthly_checklist');
    console.log('Total:', (checklist as any[]).length);
    console.log(checklist);

    console.log('\n=== CREDIT CARDS ===');
    const [cards] = await conn.query('SELECT * FROM credit_cards');
    console.log('Total:', (cards as any[]).length);
    console.log(cards);

    console.log('\n=== CREDIT CARD TRANSACTIONS ===');
    const [ccTx] = await conn.query('SELECT * FROM credit_card_transactions');
    console.log('Total:', (ccTx as any[]).length);
    console.log(ccTx);

    console.log('\n=== CREDIT CARD PAYMENTS ===');
    const [ccPay] = await conn.query('SELECT * FROM credit_card_payments');
    console.log('Total:', (ccPay as any[]).length);
    console.log(ccPay);

    console.log('\n=== BANK ACCOUNTS ===');
    const [accounts] = await conn.query('SELECT * FROM bank_accounts');
    console.log('Total:', (accounts as any[]).length);
    console.log(accounts);

    console.log('\n=== RECURRING TRANSACTIONS ===');
    const [recurring] = await conn.query('SELECT * FROM recurring_transactions');
    console.log('Total:', (recurring as any[]).length);
    console.log(recurring);

    console.log('\n=== RECEIPTS ===');
    const [receipts] = await conn.query('SELECT * FROM receipts');
    console.log('Total:', (receipts as any[]).length);
    console.log(receipts);

    console.log('\n=== NOTIFICATIONS ===');
    const [notifs] = await conn.query('SELECT * FROM notifications');
    console.log('Total:', (notifs as any[]).length);
    if ((notifs as any[]).length > 0) {
        console.log('Primeros 5:', (notifs as any[]).slice(0, 5));
    }

    console.log('\n=== PAYMENT REMINDERS ===');
    const [reminders] = await conn.query('SELECT * FROM payment_reminders');
    console.log('Total:', (reminders as any[]).length);
    console.log(reminders);

    await conn.end();
}

explore().catch(console.error);
