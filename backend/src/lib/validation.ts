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
    // For date-only strings, validate format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
               date.getMonth() === month - 1 &&
               date.getDate() === day;
    }
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Parse a date string safely, treating date-only strings as local dates.
 * For date fields (not datetime), we want to preserve the exact date
 * regardless of timezone. Using noon (12:00) prevents date shift issues.
 */
export function parseDateSafe(value: string | undefined | null): Date | null {
    if (!value) return null;

    // For date-only strings (YYYY-MM-DD), create date at noon to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        return isNaN(date.getTime()) ? null : date;
    }

    // For full ISO strings, parse normally
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Convert a Date to YYYY-MM-DD string (date only, no time/timezone)
 * Extracts the UTC date components for consistency
 */
export function toDateOnlyString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
