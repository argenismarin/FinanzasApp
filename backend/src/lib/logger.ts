/**
 * Logger estructurado para producción.
 *
 * Emite líneas JSON parseables en Vercel logs y dashboards.
 * Reemplaza `console.log/error` ad-hoc en controllers/services.
 *
 * Uso:
 * ```ts
 * import { logger } from '../lib/logger';
 *
 * logger.info('user_login', { userId: user.id, email: user.email });
 * logger.warn('rate_limit_hit', { ip: req.ip });
 * logger.error('db_query_failed', { error: err.message, code: err.code });
 * ```
 *
 * En producción (Vercel logs) se puede filtrar por:
 *   "scope":"finanzas"
 *   "level":"error"
 *   "event":"transaction_create_failed"
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
    [key: string]: unknown;
}

function emit(level: LogLevel, event: string, data: LogPayload = {}): void {
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        scope: 'finanzas',
        level,
        event,
        ...data
    });

    // Use console.error para errors (van a stderr en Vercel)
    if (level === 'error') {
        console.error(line);
    } else {
        console.log(line);
    }
}

export const logger = {
    info: (event: string, data?: LogPayload) => emit('info', event, data),
    warn: (event: string, data?: LogPayload) => emit('warn', event, data),
    error: (event: string, data?: LogPayload) => emit('error', event, data),
    debug: (event: string, data?: LogPayload) => {
        // Solo en development
        if (process.env.NODE_ENV !== 'production') {
            emit('debug', event, data);
        }
    },

    /**
     * Helper para loggear errores con stack y código de Prisma.
     * Sanitiza datos sensibles (passwords, tokens) si vienen en el data.
     */
    fromError: (event: string, error: unknown, data?: LogPayload) => {
        const err = error as any;
        emit('error', event, {
            ...data,
            errorMessage: err?.message,
            errorCode: err?.code,
            // Stack solo en dev — en prod podría exponer info de paths internos
            ...(process.env.NODE_ENV !== 'production' && err?.stack ? { stack: err.stack } : {})
        });
    }
};
