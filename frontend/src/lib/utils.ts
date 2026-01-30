export function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Parse date strings ensuring they display correctly in user's local timezone.
 * The key insight: dates like "2024-01-15T00:00:00.000Z" (midnight UTC)
 * would show as Jan 14 in Colombia (UTC-5). We extract the date part and
 * create a local date instead.
 */
export function parseDate(date: string | Date): Date {
    if (date instanceof Date) {
        // For Date objects, extract local date components to avoid timezone issues
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    }

    // If it's a date-only string (YYYY-MM-DD), create local date at noon
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
    }

    // For ISO strings like "2024-01-15T00:00:00.000Z", extract just the date part
    // This handles the common case where backend sends UTC midnight timestamps
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
        const datePart = date.substring(0, 10); // Extract "YYYY-MM-DD"
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
    }

    // Fallback for other formats
    return new Date(date);
}

/**
 * Convert a Date to YYYY-MM-DD string for form inputs and API requests.
 * Uses local date components to ensure the date shown to user is preserved.
 */
export function toDateString(date: Date | string): string {
    const d = date instanceof Date ? date : parseDate(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayString(): string {
    return toDateString(new Date());
}

export function formatDate(date: string | Date): string {
    const d = parseDate(date);
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(d);
}

export function formatShortDate(date: string | Date): string {
    const d = parseDate(date);
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}
