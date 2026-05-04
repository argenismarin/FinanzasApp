import { z } from 'zod';

/**
 * Schemas Zod centralizados para validación de formularios.
 * Mensajes de error en español, listos para usar con react-hook-form.
 *
 * Uso:
 * ```tsx
 * import { goalSchema, type GoalFormData } from '@/lib/schemas';
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 *
 * const form = useForm<GoalFormData>({ resolver: zodResolver(goalSchema) });
 * ```
 */

// === Helpers ===

const positiveAmount = z
    .union([z.string(), z.number()])
    .refine(
        (v) => {
            const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '')) : v;
            return !isNaN(n) && n > 0;
        },
        { message: 'El monto debe ser un número positivo' }
    )
    .transform((v) => (typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '')) : v));

const nonNegativeAmount = z
    .union([z.string(), z.number()])
    .refine(
        (v) => {
            const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '')) : v;
            return !isNaN(n) && n >= 0;
        },
        { message: 'El monto no puede ser negativo' }
    )
    .transform((v) => (typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '')) : v));

const dateStringYMD = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (YYYY-MM-DD)' });

const optionalDateStringYMD = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (YYYY-MM-DD)' })
    .optional()
    .or(z.literal(''));

// === Schemas por entidad ===

export const goalSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    targetAmount: positiveAmount,
    deadline: optionalDateStringYMD
});
export type GoalFormData = z.infer<typeof goalSchema>;

export const budgetSchema = z.object({
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    amount: positiveAmount,
    period: z.enum(['MONTHLY', 'WEEKLY', 'YEARLY'], {
        errorMap: () => ({ message: 'Periodo inválido' })
    }).default('MONTHLY'),
    startDate: dateStringYMD
});
export type BudgetFormData = z.infer<typeof budgetSchema>;

export const savingSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    amount: positiveAmount,
    purpose: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal(''))
});
export type SavingFormData = z.infer<typeof savingSchema>;

export const debtSchema = z.object({
    creditor: z.string().min(1, 'El acreedor es requerido').max(100, 'Máximo 100 caracteres'),
    totalAmount: positiveAmount,
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    dueDate: optionalDateStringYMD
});
export type DebtFormData = z.infer<typeof debtSchema>;

export const accountSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER'], {
        errorMap: () => ({ message: 'Tipo de cuenta inválido' })
    }),
    balance: nonNegativeAmount.optional(),
    currency: z.string().length(3, 'Código de moneda de 3 letras').default('COP')
});
export type AccountFormData = z.infer<typeof accountSchema>;

export const transactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE'], {
        errorMap: () => ({ message: 'Tipo de transacción inválido' })
    }),
    amount: positiveAmount,
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    description: z.string().min(1, 'La descripción es requerida').max(500, 'Máximo 500 caracteres'),
    date: dateStringYMD,
    accountId: z.string().optional().or(z.literal('')),
    creditCardId: z.string().optional().or(z.literal(''))
}).refine(
    (data) => !(data.accountId && data.creditCardId),
    { message: 'Solo puedes asociar la transacción a una cuenta O una tarjeta, no ambas', path: ['accountId'] }
);
export type TransactionFormData = z.infer<typeof transactionSchema>;

export const transferSchema = z.object({
    fromAccountId: z.string().min(1, 'Selecciona la cuenta origen'),
    toAccountId: z.string().min(1, 'Selecciona la cuenta destino'),
    amount: positiveAmount,
    description: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    transferDate: dateStringYMD
}).refine(
    (data) => data.fromAccountId !== data.toAccountId,
    { message: 'La cuenta origen y destino deben ser diferentes', path: ['toAccountId'] }
);
export type TransferFormData = z.infer<typeof transferSchema>;

export const debtPaymentSchema = z.object({
    amount: positiveAmount,
    description: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    paymentDate: dateStringYMD
});
export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>;

export const goalContributionSchema = z.object({
    amount: positiveAmount
});
export type GoalContributionFormData = z.infer<typeof goalContributionSchema>;

export const reminderSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    amount: positiveAmount,
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    dueDay: z.union([z.string(), z.number()])
        .refine((v) => {
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return !isNaN(n) && n >= 1 && n <= 31;
        }, { message: 'Día debe estar entre 1 y 31' })
        .transform((v) => typeof v === 'string' ? parseInt(v, 10) : v),
    isRecurring: z.boolean().default(true)
});
export type ReminderFormData = z.infer<typeof reminderSchema>;

export const creditCardSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    lastFourDigits: z.string()
        .regex(/^\d{0,4}$/, 'Debe ser de 0 a 4 dígitos')
        .optional()
        .or(z.literal('')),
    brand: z.enum(['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DINERS', 'OTHER']).default('OTHER'),
    creditLimit: positiveAmount,
    cutOffDay: z.union([z.string(), z.number()])
        .refine((v) => {
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return !isNaN(n) && n >= 1 && n <= 31;
        }, { message: 'Día de corte debe estar entre 1 y 31' })
        .transform((v) => typeof v === 'string' ? parseInt(v, 10) : v),
    paymentDueDay: z.union([z.string(), z.number()])
        .refine((v) => {
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return !isNaN(n) && n >= 1 && n <= 31;
        }, { message: 'Día de pago debe estar entre 1 y 31' })
        .transform((v) => typeof v === 'string' ? parseInt(v, 10) : v),
    interestRate: z.union([z.string(), z.number(), z.literal(''), z.null(), z.undefined()])
        .optional()
        .transform((v) => {
            if (v === '' || v === null || v === undefined) return null;
            const n = typeof v === 'string' ? parseFloat(v) : v;
            return isNaN(n) ? null : n;
        }),
    color: z.string().optional()
});
export type CreditCardFormData = z.infer<typeof creditCardSchema>;

export const creditCardChargeSchema = z.object({
    amount: positiveAmount,
    description: z.string().min(1, 'La descripción es requerida').max(500, 'Máximo 500 caracteres'),
    merchant: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    categoryId: z.string().optional().or(z.literal('')),
    installments: z.union([z.string(), z.number()])
        .transform((v) => {
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return isNaN(n) || n < 1 ? 1 : n;
        }),
    transactionDate: dateStringYMD
});
export type CreditCardChargeFormData = z.infer<typeof creditCardChargeSchema>;

export const creditCardPaymentSchema = z.object({
    amount: positiveAmount,
    paymentType: z.enum(['FULL', 'MINIMUM', 'PARTIAL']).default('PARTIAL'),
    paymentDate: dateStringYMD,
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    fromAccountId: z.string().optional().or(z.literal(''))
});
export type CreditCardPaymentFormData = z.infer<typeof creditCardPaymentSchema>;

export const categorizationRuleSchema = z.object({
    pattern: z.string().min(1, 'El patrón es requerido').max(200, 'Máximo 200 caracteres'),
    matchType: z.enum(['CONTAINS', 'STARTS_WITH', 'EXACT'], {
        errorMap: () => ({ message: 'Tipo de coincidencia inválido' })
    }),
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    priority: z.union([z.string(), z.number()])
        .transform((v) => {
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return isNaN(n) ? 0 : n;
        })
});
export type CategorizationRuleFormData = z.infer<typeof categorizationRuleSchema>;

export const recurringTransactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE'], {
        errorMap: () => ({ message: 'Tipo inválido' })
    }),
    amount: positiveAmount,
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    description: z.string().min(1, 'La descripción es requerida').max(500, 'Máximo 500 caracteres'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
        errorMap: () => ({ message: 'Frecuencia inválida' })
    }),
    dayOfMonth: z.union([z.string(), z.number(), z.literal(''), z.null(), z.undefined()])
        .optional()
        .transform((v) => {
            if (v === '' || v === null || v === undefined) return null;
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return isNaN(n) ? null : n;
        }),
    dayOfWeek: z.union([z.string(), z.number(), z.literal(''), z.null(), z.undefined()])
        .optional()
        .transform((v) => {
            if (v === '' || v === null || v === undefined) return null;
            const n = typeof v === 'string' ? parseInt(v, 10) : v;
            return isNaN(n) ? null : n;
        }),
    startDate: dateStringYMD,
    endDate: optionalDateStringYMD,
    autoCreate: z.boolean().default(false),
    accountId: z.string().optional().or(z.literal(''))
});
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
