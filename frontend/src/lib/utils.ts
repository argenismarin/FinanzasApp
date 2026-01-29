export function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Helper to parse date strings without timezone issues
export function parseDate(date: string | Date): Date {
    if (date instanceof Date) return date;
    // If it's a date-only string (YYYY-MM-DD), add time to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Date(date + 'T12:00:00');
    }
    return new Date(date);
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
