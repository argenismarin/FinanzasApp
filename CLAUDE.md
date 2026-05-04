# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinanzasApp is a full-stack personal finance management application for tracking transactions, budgets, debts, and receipts. Uses Colombian Peso (COP) as default currency.

**Stack:** Next.js 14 (frontend) + Express/TypeScript (backend) + PostgreSQL/Prisma + OpenAI Vision API (OCR)

## Development Commands

### Backend (runs on port 3001)
```bash
cd backend
npm run dev              # Start development server (tsx watch)
npm run build            # Compile TypeScript
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Regenerate Prisma Client
npm run db:studio        # Open Prisma Studio UI
npm run db:seed          # Seed default categories
```

### Frontend (runs on port 3000)
```bash
cd frontend
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
```

### Initial Setup
```bash
# Backend
cd backend && npm install && cp .env.example .env
npm run db:generate && npm run db:migrate && npm run db:seed

# Frontend (separate terminal)
cd frontend && npm install && cp .env.example .env.local
```

## Architecture

### Backend Structure (MVC + Service Layer)
- **Routes** (`src/routes/`) - Define API endpoints, apply auth middleware
- **Controllers** (`src/controllers/`) - Request handling, validation, business logic
- **Services** (`src/services/`) - External integrations (OpenAI, notifications)
- **Middleware** (`src/middleware/auth.ts`) - JWT validation, RBAC (ADMIN/USER roles)
- **Prisma** (`prisma/schema.prisma`) - Database schema with ~20 models

**API Pattern:** All data is scoped to `userId` from JWT token. Controllers check ownership before returning data.

### Frontend Structure (App Router + React Query)
- **Pages** (`src/app/`) - Next.js App Router pages (all use `'use client'`)
- **Components** (`src/components/`) - Reusable UI (CurrencyInput, CameraCapture, ExportMenu)
- **Contexts** (`src/contexts/`) - AuthContext (JWT handling), ThemeContext
- **API Client** (`src/lib/api.ts`) - Fetch-based API client class with auth headers

**State Management:** React Query for server state, React Context for local/auth/theme state. Zod for form validation with react-hook-form. (Note: Zustand is in package.json but unused—do not introduce Zustand stores.)

**Data Flow:** Pages → React Query hooks → api.ts → Backend API → Prisma → PostgreSQL

**Provider Tree** (defined in `frontend/src/components/providers.tsx`):
```
QueryClientProvider → ThemeProvider → AuthProvider → ToastProvider → AppShell → {children}
```

**Navigation** (`frontend/src/components/AppShell.tsx`): Wraps all pages except `/login` and `/register`. Contains collapsible `Sidebar` (5 sections: Dashboard, Finanzas, Planificación, Crédito, Análisis), `MobileNav` bottom bar, dark mode toggle, and FAB button linking to `/transactions/new`.

### Backend Controller Pattern

Controllers are standalone exported async functions (not class methods). Consistent pattern:
1. Destructure `req.body` / `req.query` / `req.params`
2. Extract `userId = req.user!.id`
3. Validate with `parseAmount` / `parseDateSafe` from `validation.ts`
4. Check ownership (`userId` match or ADMIN role)
5. Execute Prisma queries (use `prisma.$transaction()` for balance mutations)
6. Return JSON

**Entry point** (`backend/src/index.ts`): Sets up Express with helmet, CORS, rate-limit, JSON parser, then registers ~20 route modules under `/api/*`.

### Key Data Models
- `User` → owns all other entities
- `Transaction` → linked to Category and optional BankAccount
- `Debt` → has many `DebtPayment` records
- `ChecklistItem` → monthly recurring items with `ChecklistCompletion`
- `Receipt` → OCR-processed images with extracted data
- `CreditCard` → credit card tracking with transactions and payments
- `RecurringTransaction` → scheduled automatic transactions
- `AccountTransfer` → transfers between bank accounts

## API Endpoints

Base URL: `/api`

- `/auth/login` (**unauthenticated**), `/auth/me` - Authentication
- `/transactions` - CRUD with filters (type, category, date range) and pagination
- `/transactions/stats` - Income/expense/balance summary
- `/categories`, `/budgets`, `/debts`, `/goals`, `/savings` - Resource CRUD
- `/receipts` - Upload images for OCR processing
- `/checklist` - Monthly recurring expenses
- `/analytics` - Reports and charts data
- `/credit-cards` - Credit card management with transactions/payments
- `/recurring` - Recurring transaction templates
- `/transfers` - Account-to-account transfers
- `/ai/chat`, `/ai/analyze` - Financial advisor (OpenAI)
- `/notifications` - Alert system
- `/export` - CSV/PDF generation
- `GET /health`, `GET /api/health` - Health checks
- `GET /api/version` - Deployment version info
- `GET /api/db-check` - Database connectivity check
- `GET /api/openai-check` - OpenAI API validation

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<random-string>
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Key Implementation Details

- **Authentication:** JWT tokens with bcrypt password hashing, stored in localStorage, sent via `Authorization: Bearer` header. JWT_SECRET is required (server exits if not defined).
- **Validation:** Use `src/lib/validation.ts` for safe parsing of numbers (`parseAmount`, `parseFloatSafe`, `parseIntSafe`) and dates (`parseDateSafe`). Pagination is limited to max 100 items per page.
- **Currency formatting:** CurrencyInput component formats as COP in real-time. Use `formatCOP()` from `frontend/src/lib/utils.ts`.
- **Date handling:** Use `parseDate()` from `frontend/src/lib/utils.ts` to avoid timezone issues with date-only strings.
- **OCR:** Upload receipt image → OpenAI Vision (`gpt-4o-mini`) extracts amount, date, merchant
- **PWA:** Configured via next-pwa, manifest in `/public/manifest.json`
- **Export:** jspdf + jspdf-autotable for PDF, xlsx for Excel
- **Charts:** Recharts library for analytics visualizations
- **AI Model:** Uses `gpt-4o-mini` for OCR and AI chat/analysis features
- **React Query defaults:** `staleTime: 60_000` (1 min), `refetchOnWindowFocus: true`
- **UI Language:** Entire UI is in **Spanish** (es-CO locale). All user-facing strings, toast messages, labels, and navigation must be in Spanish.
- **Decimal precision:** All monetary fields in Prisma use `Decimal(12,2)`.
- **Balance mutations:** Any operation affecting account balances must use `prisma.$transaction()` to ensure atomicity.
- **Bulk import:** Transaction controller supports bulk import of up to 500 rows, processed in batches of 50.
- **No test suite:** Neither backend nor frontend has test files or test runner configuration.

## Security Notes

- Passwords are hashed with bcrypt (10 salt rounds)
- JWT_SECRET must be defined in environment variables (required)
- All API endpoints require authentication except `/auth/login`
- User data is scoped by `userId` - users can only access their own data
- Rate limiting: 100 requests per 15 minutes globally
- CORS currently uses `origin: true` (permissive, allows all origins) — under active debugging/iteration

## Deployment (Vercel)

The backend is deployed as a Vercel serverless function:
- `process.env.VERCEL` check skips `app.listen()` in serverless mode
- Base64 images instead of filesystem (no persistent disk on Vercel)
- OpenAI timeout set to 55s (Vercel function limit is 60s)
- Config at `backend/vercel.json` (routes, CORS headers)
- Build command: `prisma generate && npm run build`

## TypeScript Configuration

- **Backend:** `strict: false` in tsconfig.json
- **Frontend:** `strict: true` in tsconfig.json, path alias `@/*` → `./src/*`

## UX Improvements

### Toast Notifications
- Use `useToast()` hook from `@/components/Toast` for user feedback
- Types: `success`, `error`, `warning`, `info`
- Example: `showToast('Operación exitosa', 'success')`
- DO NOT use `alert()` or `prompt()` - use Toast and modals instead

### Accessibility
- All icon-only buttons must have `aria-label` attribute
- Example: `<button aria-label="Editar transacción">✏️</button>`

### Authentication Pattern
- Always use `useAuth()` hook from `@/contexts/AuthContext`
- Never access `localStorage.getItem('token')` directly in components
- All pages follow this pattern:
```tsx
'use client';
// 1. Check useAuth() for isAuthenticated
// 2. Redirect to /login if not authenticated
// 3. Show LoadingSpinner while checking auth
// 4. Render page content
```

## Module Interrelation

### Dashboard Integration
- Shows checklist progress via `ChecklistProgressWidget`
- Budget alerts when spending ≥80%
- Goals progress with top 3 active goals
- 6-month trend visualization

### Notification System (`notification.service.ts`)
- Budget alerts (80%, 100% threshold)
- Payment reminders
- Goal milestones (75%, 100%)
- Checklist reminders (overdue items, end of month)
- Unusual spending detection

### Real-time Budget Alerts
- When creating expense transaction, shows budget status
- Displays: budget amount, current spent, after transaction preview
- Visual warning for ≥80% and exceeding budget
