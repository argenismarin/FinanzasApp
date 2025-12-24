# FinanzasApp

Aplicación web full-stack para gestión de finanzas personales con OCR de facturas, analítica avanzada y checklist de gastos mensuales.

## 🚀 Características

- ✅ **Autenticación JWT** - Login seguro con tokens
- 💰 **Gestión de Transacciones** - CRUD completo con filtros
- 📸 **OCR de Facturas** - Escaneo automático con OpenAI Vision API
- ✅ **Checklist Mensual** - Tracking de gastos recurrentes
- 📊 **Analítica Avanzada** - Gráficos interactivos con Recharts
- 🏷️ **Categorías** - 14 categorías por defecto + personalizadas
- 💵 **Formato COP** - Pesos colombianos
- 📱 **PWA** - Progressive Web App
- 🎨 **Diseño Moderno** - UI responsive con TailwindCSS

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- MySQL
- JWT
- OpenAI SDK
- Multer

### Frontend
- Next.js 14
- TypeScript
- TailwindCSS
- React Query
- Recharts
- PWA

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- Cuenta de OpenAI (para OCR)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales
npx prisma db push
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edita .env.local con la URL del backend
npm run dev
```

## 🔐 Variables de Entorno

### Backend (.env)
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
JWT_SECRET=your_secret_key
OPENAI_API_KEY=sk-your-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📚 Documentación

- [Guía de Configuración](./SETUP.md)
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## 🚀 Despliegue

### Vercel (Frontend)
1. Conecta tu repositorio
2. Configura variables de entorno
3. Deploy automático

### Backend
1. Sube a tu servidor
2. Configura variables de entorno
3. `npm run build && npm start`

## 📝 Licencia

MIT

## 👤 Autor

Argenis Marin
