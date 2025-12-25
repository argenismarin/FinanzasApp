# Instrucciones para aplicar la migración del historial de pagos

## 📋 Cambios realizados

Se ha agregado una nueva tabla `debt_payments` para llevar un historial completo de todos los pagos realizados a las deudas.

## 🗄️ Aplicar la migración a la base de datos

### Opción 1: Ejecutar el script SQL directamente

1. Conéctate a tu base de datos MySQL
2. Ejecuta el archivo: `backend/migrations/create_debt_payments_table.sql`

```bash
mysql -u tu_usuario -p tu_base_de_datos < backend/migrations/create_debt_payments_table.sql
```

O copia y pega el contenido del archivo en tu gestor de base de datos (phpMyAdmin, MySQL Workbench, etc.)

### Opción 2: Desde el panel de hosting

Si usas Hostinger o similar:
1. Ve al panel de phpMyAdmin
2. Selecciona tu base de datos
3. Ve a la pestaña "SQL"
4. Copia y pega el contenido de `backend/migrations/create_debt_payments_table.sql`
5. Ejecuta

## 🔄 Actualizar el cliente de Prisma

Después de aplicar la migración, ejecuta:

```bash
cd backend
npx prisma generate
```

## ✅ Verificar la migración

Para verificar que la tabla se creó correctamente:

```sql
SHOW TABLES LIKE 'debt_payments';
DESCRIBE debt_payments;
```

## 🎯 Funcionalidades nuevas

1. **Historial de pagos**: Cada vez que registres un pago de una deuda, se guardará un registro con:
   - Monto pagado
   - Fecha y hora del pago
   - Descripción opcional del pago

2. **Vista reorganizada**: 
   - Las deudas pendientes se muestran primero en rojo
   - Los saldos a tu favor (abonos) se muestran después en verde

3. **Botón de historial**: Cada deuda muestra un botón para ver todos los pagos realizados

## 🚀 Reiniciar el backend

Después de aplicar la migración y generar el cliente:

```bash
cd backend
npm run dev
```

## ⚠️ Nota importante

Si tienes deudas existentes, estas NO tendrán historial de pagos previos. Solo se comenzará a registrar el historial a partir de ahora.

