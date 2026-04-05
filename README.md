# POS TINOCO

Sistema de Punto de Venta con Gestión de Inventarios, Logística y Analítica

**Stack:** Next.js 14 · Supabase · Vercel · Tailwind CSS · shadcn/ui · Dexie.js (offline)

---

## Configuración inicial

### 1. Variables de entorno

```bash
cp .env.local.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Supabase local (opcional para desarrollo)

```bash
npx supabase start
npx supabase db reset   # aplica migraciones + seed
npm run db:generate     # genera tipos TypeScript
```

### 4. Correr en desarrollo

```bash
npm run dev
# http://localhost:3000
```

---

## Estructura del proyecto

```
pos-tinoco/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/login/     # Pantalla de acceso
│   │   ├── (dashboard)/      # Layout + dashboards por rol
│   │   │   ├── admin/
│   │   │   ├── despachador/
│   │   │   └── checador/
│   │   └── api/              # Route Handlers
│   ├── components/
│   │   ├── layout/           # Sidebar, TopBar, LoginForm
│   │   ├── tickets/          # Componentes de tickets
│   │   ├── inventario/
│   │   ├── surtido/
│   │   └── analytics/
│   ├── lib/
│   │   ├── supabase/         # Clientes browser + server
│   │   ├── offline/          # Dexie.js IndexedDB
│   │   ├── validations/      # Schemas Zod
│   │   └── utils/            # cn, format, etc.
│   ├── hooks/                # React hooks personalizados
│   └── types/                # database.types.ts (auto-generado)
├── supabase/
│   ├── migrations/           # SQL migrations
│   ├── functions/            # Edge Functions
│   └── seed/                 # Datos de prueba
└── .github/workflows/        # CI/CD
```

---

## Roadmap (según PRD)

| Fase | Alcance | Estado |
|------|---------|--------|
| 0 | Infraestructura base | ✅ Completa |
| 1 | Flujo core de ventas (tickets) | 🔜 Siguiente |
| 2 | Inventarios multi-almacén | ⏳ Pendiente |
| 3 | Logística de surtido | ⏳ Pendiente |
| 4 | WhatsApp + CFDI 4.0 | ⏳ Pendiente |
| 5 | PWA offline | ⏳ Pendiente |
| 6 | Analítica y dashboards | ⏳ Pendiente |
| 7 | Optimización y escalado | ⏳ Pendiente |

---

## Deploy

**Vercel** (automático desde `main`):
- Conectar repo en vercel.com
- Agregar env vars en Settings → Environment Variables
- Deploy automático en cada push a `main`

**Supabase**:
- Proyecto ID: `[configurar en .env.local]`
- Migraciones: `npx supabase db push`

---

*TINOCO software · Abril 2026*
