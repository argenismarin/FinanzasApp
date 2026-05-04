# Tests del Backend

Tests usan el runner built-in de Node 20+ (`node:test` vía `tsx --test`). No requieren dependencias adicionales.

## Ejecutar

```bash
cd backend
npm test          # corre todos los .test.ts
npm run test:watch # watch mode
```

También se pueden correr archivos específicos:
```bash
npx tsx --test src/__tests__/validation.test.ts
```

## Tests existentes

### `validation.test.ts` (puro, sin DB)
Cubre `src/lib/validation.ts`:
- `parseFloatSafe`, `parseIntSafe`, `parseAmount`, `parseDateSafe`
- `isPositiveNumber`, `isNonNegativeNumber`, `isValidDateString`
- `toDateOnlyString`, `parsePagination`

Esto previene regresiones donde `parseAmount` aceptara negativos/NaN/cero (bug crítico encontrado en revisión).

### `recurring-helpers.test.ts` (puro)
Cubre la lógica de avance de fechas en transacciones recurrentes (DAILY/WEEKLY/MONTHLY/etc.) y la validación de `endDate`.

### `balance-math.test.ts` (puro)
Replica la matemática que aplican los controladores en sus `prisma.$transaction` y verifica:
- Aplicar/revertir EXPENSE/INCOME en cuenta bancaria
- Aplicar/revertir transferencias (incluido el caso de "dos transferencias idénticas, sólo una se revierte")
- Cargos y pagos de tarjeta de crédito (con clamp en cero)
- Pago combinado tarjeta + cuenta bancaria
- No drift de precisión float para valores típicos en COP

## Tests de integración con DB (NO incluidos, pendientes)

Los tests actuales NO verifican que el código de los controladores **realmente** persiste correctamente — sólo validan la matemática y los helpers puros. Para tests end-to-end completos se requiere infraestructura adicional:

### Setup recomendado (cuando se decida invertir)

1. **DB de test separada**:
   - Postgres en Docker: `docker run -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16`
   - O usar `pg-mem` (no soporta todas las features de Prisma, pero es liviano)
   - O un schema separado: `DATABASE_URL_TEST=postgresql://...?schema=test`

2. **Supertest** para llamar endpoints HTTP:
   ```bash
   npm install --save-dev supertest @types/supertest
   ```
   Pero `npm install` falla cuando el repo está en Google Drive (errors EBADF/UNKNOWN). Mover el repo fuera de la sincronización para tests de integración.

3. **Helpers a crear** en `src/__tests__/helpers/`:
   - `setupTestDb.ts` — conecta, migra, limpia entre tests
   - `factories.ts` — `createTestUser`, `createTestAccount`, `createTestTransaction`, `getAuthToken`
   - `cleanup.ts` — borra todas las tablas en orden FK-safe

### Casos críticos que faltan testear (con DB)

1. **Transaction CRUD afecta balance**:
   - POST /transactions EXPENSE accountId=X amount=1000 → balance(X) -= 1000
   - PUT cambiar amount 1000→500 → balance se ajusta correctamente
   - PUT cambiar accountId X→Y → ambos balances se ajustan
   - DELETE → balance se restaura

2. **Transferencia mirror + reverse**:
   - POST /transfers → balance(A) -= amount, balance(B) += amount, 2 Transactions creadas vinculadas vía FK
   - DELETE /transfers/:id → solo se borran las 2 transacciones específicas (no transferencias gemelas con mismo monto/fecha)

3. **Pago tarjeta con cuenta**:
   - POST /credit-cards/:id/payments con fromAccountId → balance(account) -= amount, currentBalance(card) -= amount, availableCredit(card) += amount
   - Crea Transaction EXPENSE en la cuenta vinculada vía FK

4. **Validación de inputs en endpoints**:
   - POST /transactions amount=-1000 → 400
   - POST /transactions amount="abc" → 400
   - POST /transfers fromAccountId=toAccountId → 400

5. **Auth y ownership**:
   - Sin token → 401
   - Token válido pero acceso a recurso de otro usuario → 403/404
   - Recalculate de otro usuario sin ADMIN → 403

6. **Concurrent updates** (flaky pero útil):
   - 10 updates concurrentes sobre mismo balance → no drift > 0.01
