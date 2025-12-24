# Guía de Configuración Inicial

Esta guía te ayudará a configurar el proyecto desde cero.

## 📋 Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Acceso a la base de datos MySQL en Hostinger
- Cuenta de Office 365 (para Microsoft Graph API)
- API Key de OpenAI

## 🚀 Pasos de Configuración

### 1. Clonar/Descargar el Proyecto

El proyecto ya está en:
```
c:\DRIVE\Desktop\Carpetas\1.Personal\2.Software\11.WebAppFinanzas
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp .env.example .env
```

**Edita `backend/.env` con tus credenciales:**

```env
# Database - IMPORTANTE: Reemplaza YOUR_PASSWORD_HERE
DATABASE_URL="mysql://u412677652_argema08:TU_PASSWORD_AQUI@auth-db1769.hstgr.io:3306/u412677652_semanamineria"

# JWT - Genera un secreto aleatorio largo
JWT_SECRET=genera_un_string_muy_largo_y_aleatorio_aqui

# OpenAI
OPENAI_API_KEY=tu_api_key_de_openai
```

**Configurar base de datos:**

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear tablas en la base de datos
npm run db:migrate

# Poblar con datos iniciales (categorías)
npm run db:seed
```

**Iniciar servidor:**

```bash
npm run dev
```

El backend estará en `http://localhost:3001`

### 3. Configurar Frontend

Abre una **nueva terminal**:

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp .env.example .env.local
```

**Edita `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=FinanzasApp
```

**Iniciar aplicación:**

```bash
npm run dev
```

El frontend estará en `http://localhost:3000`

### 4. Configurar Microsoft Graph API (Opcional - para SharePoint)

> ⚠️ Esto se puede hacer después, no es necesario para empezar

1. Ve a [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations → New registration
3. Nombre: "FinanzasApp"
4. Redirect URI: `http://localhost:3001/api/auth/callback`
5. Clic en "Register"
6. Copia el **Application (client) ID**
7. Ve a "Certificates & secrets" → New client secret
8. Copia el **Value** (Client Secret)
9. Ve a "API permissions" → Add permission → Microsoft Graph
10. Agrega permisos:
    - `User.Read`
    - `Files.ReadWrite.All`
    - `Sites.ReadWrite.All`
11. Clic en "Grant admin consent"

**Actualiza `backend/.env`:**

```env
MICROSOFT_CLIENT_ID=tu_client_id
MICROSOFT_CLIENT_SECRET=tu_client_secret
MICROSOFT_TENANT_ID=tu_tenant_id
```

### 5. Generar Iconos PWA

Los iconos PWA deben estar en `frontend/public/`:
- `icon-192.png` (192x192 píxeles)
- `icon-512.png` (512x512 píxeles)

**Opciones para generar:**

1. **Manualmente**: Crea un diseño en Figma/Photoshop
2. **Online**: Usa [RealFaviconGenerator](https://realfavicongenerator.net/)
3. **Placeholder**: Por ahora, puedes usar emojis o texto

## ✅ Verificar Instalación

### Backend
1. Abre `http://localhost:3001/health`
2. Deberías ver: `{"status":"ok","timestamp":"..."}`

### Frontend
1. Abre `http://localhost:3000`
2. Deberías ver la página de inicio de FinanzasApp

## 🔧 Solución de Problemas

### Error de conexión a base de datos
- Verifica que el password en `DATABASE_URL` sea correcto
- Verifica que tu IP tenga acceso a la base de datos en Hostinger

### Error al instalar dependencias
- Asegúrate de tener Node.js 18+: `node --version`
- Borra `node_modules` y `package-lock.json`, luego `npm install`

### Puerto ya en uso
- Backend: Cambia `PORT=3001` en `.env` a otro puerto
- Frontend: Usa `npm run dev -- -p 3001` para otro puerto

## 📝 Próximos Pasos

Una vez configurado:

1. ✅ Verifica que backend y frontend funcionen
2. ✅ Revisa la base de datos con `npm run db:studio` (en backend)
3. ✅ Comienza a desarrollar las funcionalidades core
4. ✅ Configura Microsoft Graph API cuando estés listo

## 🆘 Ayuda

Si tienes problemas:
1. Revisa los logs en la terminal
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que ambos servidores (backend y frontend) estén corriendo
