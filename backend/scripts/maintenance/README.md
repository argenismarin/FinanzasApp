# Scripts de mantenimiento

Scripts utilitarios para tareas operativas one-off. **No forman parte del runtime de producción**.

## Categorías

### Migración MySQL → PostgreSQL (histórico)
- `explore-mysql-full.ts` — exploración inicial del esquema MySQL legacy
- `migrate-mysql.ts` — migración inicial de tablas principales
- `migrate-from-mysql.ts` — migración con transformaciones
- `migrate-remaining.ts` — migración de tablas residuales
- `verify-migration.ts` — verificación post-migración

### Limpieza y revisión de datos
- `check-data.ts` — auditoría de integridad
- `cleanup-duplicates.ts` — eliminación de duplicados
- `delete-test-debts.ts` — limpieza de datos de prueba
- `fix-data.ts` — correcciones puntuales
- `review-checklist.ts` — revisión de items de checklist
- `review-transactions.ts` — revisión de transacciones

## Uso

```bash
cd backend
npx tsx scripts/maintenance/<script>.ts
```

> ⚠️ Antes de ejecutar cualquier script: hacer backup de la base de datos. Estos scripts pueden modificar o eliminar datos.
