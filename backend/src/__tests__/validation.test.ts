import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseFloatSafe,
    parseIntSafe,
    isPositiveNumber,
    isNonNegativeNumber,
    parseAmount,
    isValidDateString,
    parseDateSafe,
    toDateOnlyString,
    parsePagination
} from '../lib/validation';

describe('parseFloatSafe', () => {
    test('parses valid number strings', () => {
        assert.equal(parseFloatSafe('100'), 100);
        assert.equal(parseFloatSafe('100.5'), 100.5);
        assert.equal(parseFloatSafe('0'), 0);
        assert.equal(parseFloatSafe('-50'), -50);
    });

    test('passes through numbers', () => {
        assert.equal(parseFloatSafe(42), 42);
        assert.equal(parseFloatSafe(0), 0);
    });

    test('returns null for empty/null/undefined', () => {
        assert.equal(parseFloatSafe(''), null);
        assert.equal(parseFloatSafe(null), null);
        assert.equal(parseFloatSafe(undefined), null);
    });

    test('returns null for invalid strings', () => {
        assert.equal(parseFloatSafe('abc'), null);
        assert.equal(parseFloatSafe('not-a-number'), null);
    });
});

describe('parseIntSafe', () => {
    test('parses integer strings', () => {
        assert.equal(parseIntSafe('100'), 100);
        assert.equal(parseIntSafe('0'), 0);
    });

    test('truncates decimals when given a number', () => {
        assert.equal(parseIntSafe(100.7), 100);
        assert.equal(parseIntSafe(99.9), 99);
    });

    test('returns null for invalid input', () => {
        assert.equal(parseIntSafe(''), null);
        assert.equal(parseIntSafe('abc'), null);
        assert.equal(parseIntSafe(undefined), null);
    });
});

describe('isPositiveNumber', () => {
    test('true for positive numbers', () => {
        assert.equal(isPositiveNumber(1), true);
        assert.equal(isPositiveNumber(0.01), true);
        assert.equal(isPositiveNumber(100000), true);
    });

    test('false for zero, negatives, null', () => {
        assert.equal(isPositiveNumber(0), false);
        assert.equal(isPositiveNumber(-1), false);
        assert.equal(isPositiveNumber(null), false);
    });
});

describe('isNonNegativeNumber', () => {
    test('true for zero and positives', () => {
        assert.equal(isNonNegativeNumber(0), true);
        assert.equal(isNonNegativeNumber(1), true);
    });

    test('false for negatives and null', () => {
        assert.equal(isNonNegativeNumber(-1), false);
        assert.equal(isNonNegativeNumber(null), false);
    });
});

describe('parseAmount', () => {
    test('accepts positive amounts', () => {
        assert.equal(parseAmount('1000'), 1000);
        assert.equal(parseAmount(50000), 50000);
        assert.equal(parseAmount('99.99'), 99.99);
    });

    test('rejects zero', () => {
        assert.equal(parseAmount('0'), null);
        assert.equal(parseAmount(0), null);
    });

    test('rejects negatives', () => {
        assert.equal(parseAmount('-100'), null);
        assert.equal(parseAmount(-1), null);
    });

    test('rejects NaN, empty, undefined', () => {
        assert.equal(parseAmount('abc'), null);
        assert.equal(parseAmount(''), null);
        assert.equal(parseAmount(undefined), null);
        assert.equal(parseAmount(null), null);
    });

    test('rejects whitespace-only', () => {
        // parseFloatSafe of '   ' returns NaN → null
        assert.equal(parseAmount('   '), null);
    });
});

describe('isValidDateString', () => {
    test('valid YYYY-MM-DD format', () => {
        assert.equal(isValidDateString('2026-05-03'), true);
        assert.equal(isValidDateString('2024-12-31'), true);
        assert.equal(isValidDateString('2024-01-01'), true);
    });

    test('rejects invalid date components (Feb 30)', () => {
        assert.equal(isValidDateString('2024-02-30'), false);
    });

    test('accepts ISO datetime strings', () => {
        assert.equal(isValidDateString('2026-05-03T12:00:00Z'), true);
    });

    test('rejects empty/null', () => {
        assert.equal(isValidDateString(''), false);
        assert.equal(isValidDateString(null), false);
        assert.equal(isValidDateString(undefined), false);
    });
});

describe('parseDateSafe', () => {
    test('preserves date for YYYY-MM-DD without timezone shift', () => {
        const date = parseDateSafe('2026-05-03');
        assert.notEqual(date, null);
        assert.equal(date!.getUTCFullYear(), 2026);
        assert.equal(date!.getUTCMonth(), 4); // May = 4 (0-indexed)
        assert.equal(date!.getUTCDate(), 3);
    });

    test('parses full ISO timestamps', () => {
        const date = parseDateSafe('2026-05-03T12:30:00Z');
        assert.notEqual(date, null);
        assert.equal(date!.getUTCFullYear(), 2026);
    });

    test('returns null for invalid dates', () => {
        assert.equal(parseDateSafe(''), null);
        assert.equal(parseDateSafe(null), null);
        assert.equal(parseDateSafe('not-a-date'), null);
    });
});

describe('toDateOnlyString', () => {
    test('formats UTC date components consistently', () => {
        const date = new Date(Date.UTC(2026, 4, 3, 12, 0, 0));
        assert.equal(toDateOnlyString(date), '2026-05-03');
    });

    test('pads single-digit month and day', () => {
        const date = new Date(Date.UTC(2024, 0, 5));
        assert.equal(toDateOnlyString(date), '2024-01-05');
    });
});

describe('parsePagination', () => {
    test('uses defaults when undefined', () => {
        const r = parsePagination(undefined, undefined);
        assert.equal(r.page, 1);
        assert.equal(r.limit, 10);
        assert.equal(r.skip, 0);
    });

    test('respects valid page and limit', () => {
        const r = parsePagination('3', '20');
        assert.equal(r.page, 3);
        assert.equal(r.limit, 20);
        assert.equal(r.skip, 40);
    });

    test('caps limit to maxLimit', () => {
        const r = parsePagination('1', '500', 100);
        assert.equal(r.limit, 100);
    });

    test('coerces page < 1 to 1', () => {
        const r = parsePagination('0', '10');
        assert.equal(r.page, 1);
        const r2 = parsePagination('-5', '10');
        assert.equal(r2.page, 1);
    });

    test('coerces invalid limit to default 10', () => {
        const r = parsePagination('1', '0');
        assert.equal(r.limit, 10);
        const r2 = parsePagination('1', '-5');
        assert.equal(r2.limit, 10);
    });

    test('handles invalid string inputs gracefully', () => {
        const r = parsePagination('abc', 'xyz');
        assert.equal(r.page, 1);
        assert.equal(r.limit, 10);
    });
});
