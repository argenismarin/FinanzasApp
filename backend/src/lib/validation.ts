/**
 * Validation utilities for backend
 */

/**
 * Parse a string to a float, returning null if invalid
 */
export function parseFloatSafe(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? null : num;
}

/**
 * Parse a string to an integer, returning null if invalid
 */
export function parseIntSafe(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const num = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
    return isNaN(num) ? null : num;
}

/**
 * Validate that a value is a positive number
 */
export function isPositiveNumber(value: number | null): value is number {
    return value !== null && value > 0;
}

/**
 * Validate that a value is a non-negative number
 */
export function isNonNegativeNumber(value: number | null): value is number {
    return value !== null && value >= 0;
}

/**
 * Parse and validate an amount (must be positive)
 */
export function parseAmount(value: string | number | undefined | null): number | null {
    const num = parseFloatSafe(value);
    return isPositiveNumber(num) ? num : null;
}

/**
 * Validate a date string (YYYY-MM-DD format)
 */
export function isValidDateString(value: string | undefined | null): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Parse a date string safely
 */
export function parseDateSafe(value: string | undefined | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Validate pagination parameters and return safe values
 */
export function parsePagination(page: string | undefined, limit: string | undefined, maxLimit: number = 100): { page: number; limit: number; skip: number } {
    const pageNum = parseIntSafe(page) ?? 1;
    let limitNum = parseIntSafe(limit) ?? 10;

    // Ensure limit doesn't exceed maximum
    if (limitNum > maxLimit) {
        limitNum = maxLimit;
    }
    if (limitNum < 1) {
        limitNum = 10;
    }

    const safePage = Math.max(1, pageNum);
    const skip = (safePage - 1) * limitNum;

    return { page: safePage, limit: limitNum, skip };
}
