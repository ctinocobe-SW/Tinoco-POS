# CLAUDE.md — Guía para Claude Code

Este archivo orienta a Claude Code sobre la arquitectura y convenciones del proyecto.

## Proyecto

**POS TINOCO** — Sistema de Punto de Venta con inventarios, logística y analítica.
PRD v1.0 disponible en `docs/PRD-Sistema-POS-TINOCO.docx`.

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript strict)
- **UI:** Tailwind CSS + shadcn/ui. Paleta: obsidiana `#1C1C2E`, dorado `#C9A84C`
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Validaciones:** Zod (siempre validar en servidor con schemas de `src/lib/validations/schemas.ts`)
- **Estado servidor:** TanStack Query
- **Offline:** Dexie.js → `src/lib/offline/db.ts`
- **Hosting:** Vercel

## Convenciones

### Archivos
- Server Components por defecto. Agregar `'use client'` solo cuando sea necesario (interactividad, hooks del browser)
- Clientes Supabase: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server)
- Tipos DB en `src/types/database.types.ts` — NO editar manualmente, regenerar con `npm run db:generate`
- Utilidades: `cn()` en `src/lib/utils/cn.ts`, `formatMXN()` / `formatDate()` en `src/lib/utils/format.ts`

### Rutas
- `/login` — pública
- `/admin/*` — solo rol `admin`
- `/despachador/*` — roles `admin` y `despachador`
- `/checador/*` — roles `admin` y `checador`
- Protección en `src/middleware.ts`

### Base de datos
- Migraciones SQL en `supabase/migrations/` con nombre `YYYYMMDDHHMMSS_descripcion.sql`
- RLS habilitado en todas las tablas sensibles
- Función helper `get_user_role()` disponible en PostgreSQL
- Siempre usar `.select()` con columnas explícitas (no `*` en producción)

### Roles y permisos
```
admin       → acceso total, aprueba tickets, ve analítica
despachador → crea tickets, recibe mercancía, genera listas de surtido
checador    → solo verifica tickets aprobados (checklist)
```

### Ciclo de vida del ticket
```
borrador → pendiente_aprobacion → aprobado/rechazado/devuelto
       → en_verificacion → verificado/con_incidencias
       → despachado → facturado → cerrado
```

## Fase actual: 1 — Flujo Core de Ventas

Siguiente tarea: implementar el módulo completo de tickets.

**Archivos a crear:**
- `src/app/(dashboard)/despachador/tickets/nuevo/page.tsx` — formulario de creación
- `src/app/(dashboard)/admin/tickets/page.tsx` — cola de aprobación
- `src/app/(dashboard)/checador/verificar/[id]/page.tsx` — checklist de verificación
- `src/components/tickets/TicketForm.tsx` — formulario con búsqueda de productos
- `src/components/tickets/TicketCard.tsx` — tarjeta de ticket
- `src/app/api/tickets/route.ts` — POST crear ticket
- `src/app/api/tickets/[id]/route.ts` — GET, PATCH, DELETE

## Comandos útiles

```bash
npm run dev               # servidor de desarrollo
npm run type-check        # verificar TypeScript
npm run db:generate       # regenerar tipos Supabase
npx supabase db reset     # resetear DB local con seed
```
