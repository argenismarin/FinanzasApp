# Frontend - FinanzasApp

Progressive Web App (PWA) para gestión de finanzas personales.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=FinanzasApp
```

### 3. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
frontend/
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── icon-192.png       # Icono PWA 192x192
│   └── icon-512.png       # Icono PWA 512x512
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Layout principal
│   │   ├── page.tsx       # Página de inicio
│   │   └── globals.css    # Estilos globales
│   └── components/
│       └── providers.tsx  # React Query provider
├── next.config.js         # Configuración Next.js + PWA
├── tailwind.config.js     # Configuración Tailwind
└── package.json
```

## 🎨 Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS
- **Estado**: Zustand + React Query
- **Gráficos**: Recharts
- **PWA**: next-pwa

## 📱 PWA (Progressive Web App)

La aplicación es instalable en móviles y computadores:

### Características PWA
- ✅ Instalable como app nativa
- ✅ Funciona offline
- ✅ Sincronización en background
- ✅ Notificaciones push (recordatorios)

### Instalar en Móvil
1. Abre la app en el navegador
2. Toca "Agregar a pantalla de inicio"
3. ¡Listo! Ahora funciona como app nativa

### Instalar en Desktop
1. Abre la app en Chrome/Edge
2. Clic en el icono de instalación en la barra de direcciones
3. Confirma la instalación

## 🛠️ Scripts Disponibles

```bash
npm run dev    # Desarrollo
npm run build  # Compilar para producción
npm run start  # Servidor de producción
npm run lint   # Linter
```

## 📄 Páginas Planificadas

- `/` - Dashboard principal
- `/transactions` - Lista de transacciones
- `/checklist` - Checklist mensual
- `/scan` - Escanear facturas
- `/analytics` - Analítica y reportes
- `/settings` - Configuración

## 🎨 Diseño

La aplicación usa un diseño moderno con:
- Gradientes vibrantes
- Glassmorphism
- Animaciones suaves
- Responsive design
- Modo oscuro (opcional)

## 🔧 Configuración de PWA

El archivo `manifest.json` define:
- Nombre de la app
- Iconos
- Colores del tema
- Modo de visualización (standalone)

Los iconos deben estar en `public/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

**Nota**: Los iconos se deben generar manualmente o con herramientas como [RealFaviconGenerator](https://realfavicongenerator.net/)

## 📝 Próximos Pasos

1. Generar iconos PWA (192x192 y 512x512)
2. Implementar páginas principales
3. Conectar con API backend
4. Implementar autenticación
5. Agregar funcionalidad offline
