import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pruebas de la matemática de saldos sin tocar la DB.
 * Replican la lógica que aplican los controladores en sus prisma.$transaction
 * para detectar regresiones en la fórmula misma.
 *
 * Tests con DB real (que verifican que el controlador actually persists correctly)
 * están descritos en el README de tests pero requieren setup adicional.
 */

// === Helpers que replican lógica de los controladores ===

function applyTransaction(balance: number, type: 'INCOME' | 'EXPENSE', amount: number): number {
    return type === 'EXPENSE' ? balance - amount : balance + amount;
}

function revertTransaction(balance: number, type: 'INCOME' | 'EXPENSE', amount: number): number {
    return type === 'EXPENSE' ? balance + amount : balance - amount;
}

function applyTransfer(fromBalance: number, toBalance: number, amount: number) {
    return { from: fromBalance - amount, to: toBalance + amount };
}

function revertTransfer(fromBalance: number, toBalance: number, amount: number) {
    return { from: fromBalance + amount, to: toBalance - amount };
}

function applyCreditCardCharge(currentBalance: number, creditLimit: number, amount: number) {
    const newBalance = currentBalance + amount;
    const newAvailable = Math.max(0, creditLimit - newBalance);
    return { currentBalance: newBalance, availableCredit: newAvailable };
}

function applyCreditCardPayment(currentBalance: number, creditLimit: number, amount: number) {
    const newBalance = Math.max(0, currentBalance - amount);
    const newAvailable = creditLimit - newBalance;
    return { currentBalance: newBalance, availableCredit: newAvailable };
}

// === Tests ===

describe('Transaction balance math', () => {
    test('EXPENSE decreases balance', () => {
        assert.equal(applyTransaction(10000, 'EXPENSE', 3000), 7000);
    });

    test('INCOME increases balance', () => {
        assert.equal(applyTransaction(10000, 'INCOME', 5000), 15000);
    });

    test('reverting an EXPENSE restores balance', () => {
        const after = applyTransaction(10000, 'EXPENSE', 3000); // 7000
        const restored = revertTransaction(after, 'EXPENSE', 3000);
        assert.equal(restored, 10000);
    });

    test('reverting INCOME restores balance', () => {
        const after = applyTransaction(10000, 'INCOME', 5000); // 15000
        const restored = revertTransaction(after, 'INCOME', 5000);
        assert.equal(restored, 10000);
    });

    test('apply then revert with different amounts (update scenario)', () => {
        // Crear EXPENSE 1000, luego cambiar a 500
        let balance = 10000;
        balance = applyTransaction(balance, 'EXPENSE', 1000); // 9000
        // Update: revert old, apply new
        balance = revertTransaction(balance, 'EXPENSE', 1000); // 10000
        balance = applyTransaction(balance, 'EXPENSE', 500); // 9500
        assert.equal(balance, 9500);
    });

    test('changing accountId mid-update reflects on both accounts', () => {
        let accountA = 10000;
        let accountB = 5000;
        // Original transaction: EXPENSE 1000 on A
        accountA = applyTransaction(accountA, 'EXPENSE', 1000); // 9000
        // Update: move to account B
        accountA = revertTransaction(accountA, 'EXPENSE', 1000); // 10000
        accountB = applyTransaction(accountB, 'EXPENSE', 1000); // 4000
        assert.equal(accountA, 10000);
        assert.equal(accountB, 4000);
    });
});

describe('Transfer balance math', () => {
    test('Transfer A→B moves amount from A to B', () => {
        const r = applyTransfer(10000, 5000, 2000);
        assert.equal(r.from, 8000);
        assert.equal(r.to, 7000);
    });

    test('Reverting transfer restores original balances', () => {
        const transferred = applyTransfer(10000, 5000, 2000); // {8000, 7000}
        const restored = revertTransfer(transferred.from, transferred.to, 2000);
        assert.equal(restored.from, 10000);
        assert.equal(restored.to, 5000);
    });

    test('Two identical transfers do not double-count when one is reversed', () => {
        // Estado inicial
        let A = 10000, B = 5000;
        // Transfer 1: 1000 A→B
        const t1 = applyTransfer(A, B, 1000);
        A = t1.from; B = t1.to; // A=9000, B=6000
        // Transfer 2 idéntica: 1000 A→B
        const t2 = applyTransfer(A, B, 1000);
        A = t2.from; B = t2.to; // A=8000, B=7000
        // Revertir solo Transfer 1
        const r = revertTransfer(A, B, 1000);
        A = r.from; B = r.to; // A=9000, B=6000
        // Resultado correcto: solo una transferencia activa
        assert.equal(A, 9000);
        assert.equal(B, 6000);
    });
});

describe('Credit card balance math', () => {
    test('Charge increases currentBalance and decreases availableCredit', () => {
        const r = applyCreditCardCharge(0, 1000000, 50000);
        assert.equal(r.currentBalance, 50000);
        assert.equal(r.availableCredit, 950000);
    });

    test('Charge cannot make availableCredit negative (clamped at 0)', () => {
        const r = applyCreditCardCharge(900000, 1000000, 200000);
        assert.equal(r.currentBalance, 1100000); // sí permite over-limit en balance
        assert.equal(r.availableCredit, 0); // pero crédito disponible no baja de 0
    });

    test('Payment decreases currentBalance and increases availableCredit', () => {
        const r = applyCreditCardPayment(50000, 1000000, 30000);
        assert.equal(r.currentBalance, 20000);
        assert.equal(r.availableCredit, 980000);
    });

    test('Payment overpaying clamps balance at 0', () => {
        const r = applyCreditCardPayment(50000, 1000000, 100000);
        assert.equal(r.currentBalance, 0);
        assert.equal(r.availableCredit, 1000000);
    });

    test('Charge then payment of same amount returns to zero', () => {
        const charged = applyCreditCardCharge(0, 1000000, 100000);
        const paid = applyCreditCardPayment(charged.currentBalance, 1000000, 100000);
        assert.equal(paid.currentBalance, 0);
        assert.equal(paid.availableCredit, 1000000);
    });
});

describe('Credit card payment with bank account (combined flow)', () => {
    test('Pay 100k from bank account: account -100k, card balance -100k, available +100k', () => {
        let accountBalance = 500000;
        let cardBalance = 200000;
        const cardLimit = 1000000;
        const paymentAmount = 100000;

        // 1. Debit account
        accountBalance -= paymentAmount;

        // 2. Credit card payment
        const cardAfter = applyCreditCardPayment(cardBalance, cardLimit, paymentAmount);

        assert.equal(accountBalance, 400000, 'account should decrease by payment');
        assert.equal(cardAfter.currentBalance, 100000, 'card balance should decrease');
        assert.equal(cardAfter.availableCredit, 900000, 'available credit should increase');
    });
});

describe('Decimal precision in COP (no fractional cents in practice)', () => {
    test('Sum of integer amounts has no drift', () => {
        const amounts = [1000, 2500, 750, 99999];
        const total = amounts.reduce((a, b) => a + b, 0);
        assert.equal(total, 104249);
    });

    test('Repeated addition does not cause float drift for typical COP values', () => {
        let balance = 0;
        for (let i = 0; i < 1000; i++) {
            balance += 100;
        }
        assert.equal(balance, 100000, 'no precision loss for 1000 × 100 COP');
    });
});
