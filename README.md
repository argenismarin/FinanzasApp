# FinanzasApp

Aplicación web full-stack para gestión de finanzas personales con OCR de facturas, transferencias entre cuentas, tarjetas de crédito, presupuestos, metas, transacciones recurrentes y analítica avanzada.

## Características

- Autenticación JWT con bcrypt y `JWT_SECRET` validado al arranque
- Transacciones CRUD con filtros, paginación y bulk import (hasta 500 filas)
- Cuentas bancarias con balance atómico (Prisma `$transaction`)
- Transferencias entre cuentas con reverso preciso (FK a transacciones)
- Tarjetas de crédito con cargos, pagos y disponible recalculable
- Pagos de tarjeta integrados con cuentas bancarias (deducción atómica)
- Deudas con plan de pagos
- Metas de ahorro con aportes
- Presupuestos con alertas a 80% y 100%
- Transacciones recurrentes (cron diario en Vercel) con `endDate`
- OCR de recibos con OpenAI Vision
- Reportes y analítica con Recharts
- Exportación a CSV y PDF
- PWA installable
- Endpoint admin para recálculo de saldos desde transacciones (recovery)

## Stack

**Backend:** Node.js · Express · TypeScript · Prisma · PostgreSQL · OpenAI SDK · JWT · Vercel serverless
**Frontend:** Next.js 14 (App Router) · TypeScript · React Query · TailwindCSS · Recharts · next-pwa
**UI:** 100% en español (es-CO), formato COP

## Setup local

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+ (puede ser remoto: Supabase, Neon, etc.)
- Cuenta de OpenAI (`sk-...`)

### Backend (puerto 3001)

```bash
cd backend
npm install
cp .env.example .env
# Edita .env (ver sección "Variables de entorno" abajo)

npm run db:generate    # Genera Prisma Client
npm run db:migrate     # Aplica migraciones (crea schema)
npm run db:seed        # Categorías por defecto

npm run dev            # tsx watch en :3001
```

### Frontend (puerto 3000)

```bash
cd frontend
npm install
cp .env.example .env.local

npm run dev            # Next.js en :3000
```

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ | Secreto para firmar tokens. **El servidor sale con `process.exit(1)` si falta** |
| `JWT_EXPIRES_IN` | – | Default `7d` |
| `OPENAI_API_KEY` | ✅ | `sk-...` para OCR y análisis |
| `FRONTEND_URL` | ✅ (en prod) | Lista separada por comas para CORS allowlist. Ej: `https://app.ejemplo.com,https://staging.ejemplo.com` |
| `CRON_SECRET` | ✅ (en prod) | Secret para `/api/cron/recurring`. Generar con `openssl rand -hex 32` |
| `PORT` | – | Default 3001 (ignorado en Vercel) |

### Frontend (`frontend/.env.local`)

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | URL del backend, ej: `http://localhost:3001/api` |

## Comandos útiles

```bash
# Backend
npm run dev            # Dev server con watch
npm run build          # Compila TypeScript
npm run db:studio      # UI de Prisma para inspeccionar DB
npm run db:migrate     # Crea/aplica migraciones

# Frontend
npm run dev            # Next.js dev
npm run build          # Build de producción
npm run lint           # ESLint

# Type check (sin emitir archivos)
cd backend  && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

## Despliegue (Vercel)

El backend está configurado como función serverless (`backend/vercel.json`).

1. **Backend:** importar repo en Vercel, root directory = `backend/`. Configurar variables de entorno listadas arriba (especialmente `CRON_SECRET` para que el cron diario funcione).
2. **Frontend:** importar repo en Vercel, root directory = `frontend/`. Configurar `NEXT_PUBLIC_API_URL` apuntando al backend desplegado.
3. Después del primer deploy, agregar el dominio del frontend a `FRONTEND_URL` del backend.

### Cron de transacciones recurrentes

`backend/vercel.json` define un cron a las 06:00 UTC que ejecuta `/api/cron/recurring`. Este endpoint requiere el header `Authorization: Bearer <CRON_SECRET>`. Si `CRON_SECRET` no está configurado, el cron falla silenciosamente y las transacciones recurrentes no se crean.

Logs estructurados en JSON: filtra por `"scope":"cron"` en Vercel logs.

## Estructura del proyecto

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # Modelos (~20)
│   ├── scripts/maintenance/        # Scripts one-off (migración, cleanup)
│   ├── src/
│   │   ├── controllers/            # Lógica de negocio
│   │   ├── routes/                 # Endpoints Express
│   │   ├── services/               # OpenAI, notificaciones
│   │   ├── middleware/auth.ts      # JWT + RBAC
│   │   ├── lib/validation.ts       # parseAmount, parseDateSafe
│   │   └── index.ts                # Entry point
│   └── vercel.json                 # Config serverless + cron
├── frontend/
│   ├── src/
│   │   ├── app/                    # Páginas (Next App Router)
│   │   ├── components/             # UI reusable
│   │   ├── contexts/               # AuthContext, ThemeContext
│   │   └── lib/
│   │       ├── api.ts              # Cliente HTTP
│   │       ├── errorMessages.ts    # Traducciones de errores HTTP
│   │       └── utils.ts            # formatCOP, parseDate
│   └── next.config.js
└── README.md
```

## Decisiones técnicas

- **Decimal(12,2)** en TODOS los campos monetarios de Prisma
- **`prisma.$transaction`** en toda mutación que afecte balance (transferencias, pagos, transacciones con cuenta)
- **CORS allowlist** desde `FRONTEND_URL` (no `origin: true`)
- **Tokens en localStorage** — vulnerable a XSS, migración a HttpOnly cookies pendiente
- **No hay test suite** todavía — alta deuda técnica
- **OpenAI `gpt-4o-mini`** para OCR y AI advisor (timeout 55s, dentro del límite Vercel de 60s)

## Troubleshooting

### "JWT_SECRET no está definido"
Define `JWT_SECRET` en `.env`. El servidor falla rápido a propósito.

### CORS bloqueado en producción
Verifica que `FRONTEND_URL` en backend coincide con el origen del frontend (incluyendo protocolo y subdominio).

### El cron diario no ejecuta transacciones
1. Verifica `CRON_SECRET` definido en Vercel
2. Revisa logs JSON con `"scope":"cron"` en Vercel
3. Manualmente: `POST /api/cron/recurring` con `Authorization: Bearer <CRON_SECRET>`

### Saldos desincronizados
Endpoint admin/usuario `POST /api/balance/recalculate` recomputa desde las transacciones. El usuario sólo puede recalcular sus cuentas; ADMIN puede pasar `?userId=` para cualquier cuenta.

### Vulnerabilidades npm
Vulnerabilidades pendientes (al 2026-05-03) en dev/build dependencies:
- `next-pwa@5.6.0` (abandonado): considerar migrar a `@ducanh2912/next-pwa`
- `xlsx@0.18.5`: prototype pollution conocido, considerar `exceljs`
- `bcrypt`/`@mapbox/node-pre-gyp` → tar transitivo (no afecta runtime salvo durante install)
- `eslint-plugin-next` (devDep)

`npm audit fix --force` aplicaría breaking changes — revisar manualmente.

## Licencia

MIT

## Autor

Argenis Marín
