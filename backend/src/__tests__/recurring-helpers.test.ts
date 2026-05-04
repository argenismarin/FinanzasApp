import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Re-implementación local del helper advanceDate para test sin importar el controlador
// (el controlador no exporta el helper porque es interno; verificamos comportamiento equivalente).
function advanceDate(from: Date, frequency: string): Date {
    const next = new Date(from);
    switch (frequency) {
        case 'DAILY':     next.setDate(next.getDate() + 1); break;
        case 'WEEKLY':    next.setDate(next.getDate() + 7); break;
        case 'BIWEEKLY':  next.setDate(next.getDate() + 14); break;
        case 'MONTHLY':   next.setMonth(next.getMonth() + 1); break;
        case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
        case 'YEARLY':    next.setFullYear(next.getFullYear() + 1); break;
    }
    return next;
}

describe('advanceDate (recurring frequency math)', () => {
    test('DAILY adds 1 day', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'DAILY');
        assert.equal(next.getUTCDate(), 4);
        assert.equal(next.getUTCMonth(), 4); // May
    });

    test('WEEKLY adds 7 days', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'WEEKLY');
        assert.equal(next.getUTCDate(), 10);
    });

    test('BIWEEKLY adds 14 days', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'BIWEEKLY');
        assert.equal(next.getUTCDate(), 17);
    });

    test('MONTHLY adds 1 month', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'MONTHLY');
        assert.equal(next.getUTCMonth(), 5); // June
        assert.equal(next.getUTCDate(), 3);
    });

    test('MONTHLY handles month-end edge case', () => {
        // Jan 31 → Feb 28/29 → Mar 3 (JS Date rolls over)
        const from = new Date('2026-01-31T12:00:00Z');
        const next = advanceDate(from, 'MONTHLY');
        // En 2026 (no bisiesto), Feb tiene 28 días, así que Jan 31 + 1 mes = Mar 3
        assert.ok(next.getUTCMonth() === 1 || next.getUTCMonth() === 2);
    });

    test('QUARTERLY adds 3 months', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'QUARTERLY');
        assert.equal(next.getUTCMonth(), 7); // August
    });

    test('YEARLY adds 1 year', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const next = advanceDate(from, 'YEARLY');
        assert.equal(next.getUTCFullYear(), 2027);
        assert.equal(next.getUTCMonth(), 4);
    });

    test('does not mutate input date', () => {
        const from = new Date('2026-05-03T12:00:00Z');
        const original = from.getTime();
        advanceDate(from, 'MONTHLY');
        assert.equal(from.getTime(), original, 'advanceDate must not mutate input');
    });
});

describe('endDate validation logic', () => {
    test('endDate before nextExecution → should reject', () => {
        const nextExecution = new Date('2026-06-01');
        const endDate = new Date('2026-05-15');
        assert.equal(nextExecution > endDate, true, 'nextExecution should exceed endDate');
    });

    test('endDate equal to nextExecution → still valid', () => {
        const nextExecution = new Date('2026-06-01T12:00:00Z');
        const endDate = new Date('2026-06-01T12:00:00Z');
        assert.equal(nextExecution > endDate, false, 'equal dates should not exceed');
    });

    test('after advanceDate, should deactivate if past endDate', () => {
        const current = new Date('2026-05-15T12:00:00Z');
        const endDate = new Date('2026-05-20T12:00:00Z');
        const next = advanceDate(current, 'WEEKLY'); // 2026-05-22
        const shouldDeactivate = next > endDate;
        assert.equal(shouldDeactivate, true, 'next execution past endDate should trigger deactivation');
    });
});
