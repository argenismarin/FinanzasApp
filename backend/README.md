# Backend - FinanzasApp API

API REST para la aplicación de gestión de finanzas personales.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

**Variables críticas que debes configurar:**

```env
# Database - Reemplaza YOUR_PASSWORD_HERE con tu contraseña de MySQL
DATABASE_URL="mysql://u412677652_argema08:YOUR_PASSWORD_HERE@auth-db1769.hstgr.io:3306/u412677652_semanamineria"

# JWT - Genera un secreto seguro
JWT_SECRET=tu_secreto_jwt_muy_largo_y_aleatorio

# OpenAI - Tu API Key
OPENAI_API_KEY=sk-...

# Microsoft (configurar después de crear app en Azure AD)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

### 3. Configurar Base de Datos

```bash
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar con datos iniciales (categorías por defecto)
npm run db:seed
```

### 4. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## 📁 Estructura del Proyecto

```
backend/
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
├── src/
│   ├── index.ts           # Punto de entrada
│   ├── lib/
│   │   └── prisma.ts      # Cliente de Prisma
│   └── prisma/
│       └── seed.ts        # Datos iniciales
├── .env                   # Variables de entorno (crear manualmente)
├── .env.example           # Plantilla de variables
├── package.json
└── tsconfig.json
```

## 🗄️ Base de Datos

### Esquema Principal

- **users** - Usuarios del sistema (multi-usuario con roles)
- **transactions** - Transacciones (gastos e ingresos)
- **categories** - Categorías de transacciones
- **monthly_checklist** - Items de checklist mensual
- **checklist_completions** - Completaciones del checklist
- **receipts** - Facturas escaneadas con OCR
- **sharepoint_sync_log** - Log de sincronizaciones

### Comandos Útiles

```bash
# Ver base de datos en interfaz gráfica
npm run db:studio

# Crear nueva migración
npm run db:migrate

# Regenerar cliente de Prisma
npm run db:generate
```

## 🔐 Autenticación

El sistema usa **OAuth 2.0 con Microsoft** + **JWT**.

### Configurar Azure AD

1. Ve a [Azure Portal](https://portal.azure.com)
2. Registra una nueva aplicación
3. Configura permisos de Microsoft Graph API:
   - `User.Read`
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
4. Copia Client ID, Client Secret y Tenant ID al `.env`

## 📊 API Endpoints (Planificados)

### Autenticación
- `POST /api/auth/microsoft` - Login con Microsoft
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Usuario actual

### Transacciones
- `GET /api/transactions` - Listar
- `POST /api/transactions` - Crear
- `PUT /api/transactions/:id` - Actualizar
- `DELETE /api/transactions/:id` - Eliminar

### Categorías
- `GET /api/categories` - Listar
- `POST /api/categories` - Crear

### Checklist
- `GET /api/checklist` - Items del checklist
- `POST /api/checklist/:id/complete` - Marcar completado

### OCR
- `POST /api/receipts/upload` - Subir factura
- `POST /api/receipts/:id/process` - Procesar con OCR

### Sincronización
- `POST /api/sync/sharepoint/push` - Enviar a Excel
- `POST /api/sync/sharepoint/pull` - Traer de Excel

## 🛠️ Scripts Disponibles

```bash
npm run dev        # Desarrollo con hot-reload
npm run build      # Compilar TypeScript
npm run start      # Producción
npm run db:migrate # Migraciones
npm run db:studio  # UI de base de datos
npm run db:seed    # Datos iniciales
```

## 📝 Notas Importantes

- La base de datos tiene **1 MB** de espacio, almacena imágenes en OneDrive
- El sistema es **multi-usuario** con roles (admin/user)
- Moneda por defecto: **COP** (Pesos Colombianos)
- Sincronización con SharePoint cada 5 minutos (configurable)
