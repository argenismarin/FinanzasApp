import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    goalSchema,
    budgetSchema,
    debtSchema,
    accountSchema,
    transactionSchema,
    transferSchema,
    reminderSchema,
    creditCardSchema,
    creditCardChargeSchema,
    creditCardPaymentSchema,
    categorizationRuleSchema,
    recurringTransactionSchema
} from '../schemas';

describe('goalSchema', () => {
    test('accepts valid input', () => {
        const r = goalSchema.safeParse({
            name: 'Casa nueva',
            targetAmount: '10000000',
            deadline: '2027-12-31'
        });
        assert.equal(r.success, true);
        if (r.success) {
            assert.equal(r.data.targetAmount, 10000000);
            assert.equal(r.data.name, 'Casa nueva');
        }
    });

    test('rejects negative amount', () => {
        const r = goalSchema.safeParse({ name: 'X', targetAmount: '-100' });
        assert.equal(r.success, false);
    });

    test('rejects empty name', () => {
        const r = goalSchema.safeParse({ name: '', targetAmount: '100' });
        assert.equal(r.success, false);
    });

    test('accepts empty deadline', () => {
        const r = goalSchema.safeParse({ name: 'X', targetAmount: '100', deadline: '' });
        assert.equal(r.success, true);
    });

    test('rejects malformed deadline', () => {
        const r = goalSchema.safeParse({ name: 'X', targetAmount: '100', deadline: '12/31/2026' });
        assert.equal(r.success, false);
    });
});

describe('budgetSchema', () => {
    test('accepts valid input with default period', () => {
        const r = budgetSchema.safeParse({
            categoryId: 'cat-1',
            amount: '500000',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, true);
        if (r.success) {
            assert.equal(r.data.period, 'MONTHLY');
        }
    });

    test('rejects invalid period', () => {
        const r = budgetSchema.safeParse({
            categoryId: 'cat-1',
            amount: '500000',
            period: 'HOURLY',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, false);
    });
});

describe('debtSchema', () => {
    test('accepts valid input', () => {
        const r = debtSchema.safeParse({
            creditor: 'Banco XYZ',
            totalAmount: '5000000'
        });
        assert.equal(r.success, true);
    });

    test('rejects empty creditor', () => {
        const r = debtSchema.safeParse({ creditor: '', totalAmount: '100' });
        assert.equal(r.success, false);
    });

    test('rejects zero amount', () => {
        const r = debtSchema.safeParse({ creditor: 'X', totalAmount: '0' });
        assert.equal(r.success, false);
    });
});

describe('accountSchema', () => {
    test('accepts valid input with optional balance', () => {
        const r = accountSchema.safeParse({
            name: 'Cuenta principal',
            type: 'CHECKING',
            balance: '0'
        });
        assert.equal(r.success, true);
        if (r.success) {
            assert.equal(r.data.currency, 'COP');
        }
    });

    test('accepts zero balance (non-negative allowed)', () => {
        const r = accountSchema.safeParse({
            name: 'Vacía',
            type: 'CASH',
            balance: '0'
        });
        assert.equal(r.success, true);
    });

    test('rejects invalid type', () => {
        const r = accountSchema.safeParse({ name: 'X', type: 'CRYPTO' });
        assert.equal(r.success, false);
    });
});

describe('transactionSchema', () => {
    test('accepts valid INCOME with accountId', () => {
        const r = transactionSchema.safeParse({
            type: 'INCOME',
            amount: '50000',
            categoryId: 'cat-1',
            description: 'Salario',
            date: '2026-05-03',
            accountId: 'acc-1'
        });
        assert.equal(r.success, true);
    });

    test('rejects when both accountId and creditCardId are set', () => {
        const r = transactionSchema.safeParse({
            type: 'EXPENSE',
            amount: '1000',
            categoryId: 'cat-1',
            description: 'Compra',
            date: '2026-05-03',
            accountId: 'acc-1',
            creditCardId: 'cc-1'
        });
        assert.equal(r.success, false);
    });

    test('rejects empty description', () => {
        const r = transactionSchema.safeParse({
            type: 'EXPENSE',
            amount: '1000',
            categoryId: 'cat-1',
            description: '',
            date: '2026-05-03'
        });
        assert.equal(r.success, false);
    });
});

describe('transferSchema', () => {
    test('accepts valid transfer between different accounts', () => {
        const r = transferSchema.safeParse({
            fromAccountId: 'a',
            toAccountId: 'b',
            amount: '5000',
            transferDate: '2026-05-03'
        });
        assert.equal(r.success, true);
    });

    test('rejects same account for from and to', () => {
        const r = transferSchema.safeParse({
            fromAccountId: 'a',
            toAccountId: 'a',
            amount: '5000',
            transferDate: '2026-05-03'
        });
        assert.equal(r.success, false);
    });

    test('rejects negative amount', () => {
        const r = transferSchema.safeParse({
            fromAccountId: 'a',
            toAccountId: 'b',
            amount: '-100',
            transferDate: '2026-05-03'
        });
        assert.equal(r.success, false);
    });
});

describe('reminderSchema', () => {
    test('accepts valid reminder', () => {
        const r = reminderSchema.safeParse({
            name: 'Arriendo',
            amount: '1500000',
            categoryId: 'cat-1',
            dueDay: '15'
        });
        assert.equal(r.success, true);
        if (r.success) {
            assert.equal(r.data.dueDay, 15);
            assert.equal(r.data.isRecurring, true);
        }
    });

    test('rejects dueDay > 31', () => {
        const r = reminderSchema.safeParse({
            name: 'X',
            amount: '100',
            categoryId: 'cat-1',
            dueDay: '32'
        });
        assert.equal(r.success, false);
    });

    test('rejects dueDay < 1', () => {
        const r = reminderSchema.safeParse({
            name: 'X',
            amount: '100',
            categoryId: 'cat-1',
            dueDay: '0'
        });
        assert.equal(r.success, false);
    });
});

describe('creditCardSchema', () => {
    test('accepts valid card', () => {
        const r = creditCardSchema.safeParse({
            name: 'Visa Bancolombia',
            lastFourDigits: '1234',
            brand: 'VISA',
            creditLimit: '5000000',
            cutOffDay: '15',
            paymentDueDay: '5'
        });
        assert.equal(r.success, true);
        if (r.success) {
            assert.equal(r.data.cutOffDay, 15);
            assert.equal(r.data.paymentDueDay, 5);
        }
    });

    test('rejects lastFourDigits with letters', () => {
        const r = creditCardSchema.safeParse({
            name: 'X',
            lastFourDigits: 'abcd',
            creditLimit: '1000',
            cutOffDay: '1',
            paymentDueDay: '1'
        });
        assert.equal(r.success, false);
    });

    test('rejects cutOffDay > 31', () => {
        const r = creditCardSchema.safeParse({
            name: 'X',
            creditLimit: '1000',
            cutOffDay: '40',
            paymentDueDay: '1'
        });
        assert.equal(r.success, false);
    });

    test('accepts empty interestRate', () => {
        const r = creditCardSchema.safeParse({
            name: 'X',
            creditLimit: '1000',
            cutOffDay: '15',
            paymentDueDay: '5',
            interestRate: ''
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.interestRate, null);
    });
});

describe('creditCardChargeSchema', () => {
    test('accepts valid charge with installments', () => {
        const r = creditCardChargeSchema.safeParse({
            amount: '500000',
            description: 'Compra electrodomésticos',
            installments: '12',
            transactionDate: '2026-05-03'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.installments, 12);
    });

    test('defaults installments to 1 when invalid', () => {
        const r = creditCardChargeSchema.safeParse({
            amount: '1000',
            description: 'X',
            installments: '0',
            transactionDate: '2026-05-03'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.installments, 1);
    });

    test('rejects empty description', () => {
        const r = creditCardChargeSchema.safeParse({
            amount: '1000',
            description: '',
            installments: '1',
            transactionDate: '2026-05-03'
        });
        assert.equal(r.success, false);
    });
});

describe('creditCardPaymentSchema', () => {
    test('accepts valid payment', () => {
        const r = creditCardPaymentSchema.safeParse({
            amount: '500000',
            paymentType: 'FULL',
            paymentDate: '2026-05-03'
        });
        assert.equal(r.success, true);
    });

    test('default paymentType is PARTIAL', () => {
        const r = creditCardPaymentSchema.safeParse({
            amount: '100',
            paymentDate: '2026-05-03'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.paymentType, 'PARTIAL');
    });

    test('rejects invalid paymentType', () => {
        const r = creditCardPaymentSchema.safeParse({
            amount: '100',
            paymentType: 'OVERPAY',
            paymentDate: '2026-05-03'
        });
        assert.equal(r.success, false);
    });
});

describe('categorizationRuleSchema', () => {
    test('accepts valid rule', () => {
        const r = categorizationRuleSchema.safeParse({
            pattern: 'Rappi',
            matchType: 'CONTAINS',
            categoryId: 'cat-1',
            priority: '5'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.priority, 5);
    });

    test('rejects empty pattern', () => {
        const r = categorizationRuleSchema.safeParse({
            pattern: '',
            matchType: 'CONTAINS',
            categoryId: 'cat-1',
            priority: 0
        });
        assert.equal(r.success, false);
    });

    test('coerces priority to 0 when invalid string', () => {
        const r = categorizationRuleSchema.safeParse({
            pattern: 'X',
            matchType: 'EXACT',
            categoryId: 'cat-1',
            priority: 'abc'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.priority, 0);
    });
});

describe('recurringTransactionSchema', () => {
    test('accepts valid MONTHLY recurring', () => {
        const r = recurringTransactionSchema.safeParse({
            type: 'EXPENSE',
            amount: '500000',
            categoryId: 'cat-1',
            description: 'Arriendo',
            frequency: 'MONTHLY',
            dayOfMonth: '15',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, true);
    });

    test('accepts WEEKLY with dayOfWeek', () => {
        const r = recurringTransactionSchema.safeParse({
            type: 'INCOME',
            amount: '100',
            categoryId: 'cat-1',
            description: 'Ingreso semanal',
            frequency: 'WEEKLY',
            dayOfWeek: '5',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, true);
    });

    test('rejects invalid frequency', () => {
        const r = recurringTransactionSchema.safeParse({
            type: 'EXPENSE',
            amount: '100',
            categoryId: 'cat-1',
            description: 'X',
            frequency: 'HOURLY',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, false);
    });

    test('coerces empty dayOfMonth to null', () => {
        const r = recurringTransactionSchema.safeParse({
            type: 'EXPENSE',
            amount: '100',
            categoryId: 'cat-1',
            description: 'X',
            frequency: 'DAILY',
            dayOfMonth: '',
            startDate: '2026-05-01'
        });
        assert.equal(r.success, true);
        if (r.success) assert.equal(r.data.dayOfMonth, null);
    });
});
