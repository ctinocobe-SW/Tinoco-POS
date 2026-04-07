'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  Warehouse,
  Truck,
  BarChart3,
  CheckSquare,
  ShoppingCart,
  Settings,
} from 'lucide-react'
import type { UserRole } from '@/types/database.types'
import { cn } from '@/lib/utils/cn'

interface SidebarProps {
  rol: UserRole
  nombre: string
}

const navByRole: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Tickets', href: '/admin/tickets', icon: Receipt },
    { label: 'Productos', href: '/admin/productos', icon: Package },
    { label: 'Clientes', href: '/admin/clientes', icon: Users },
    { label: 'Inventario', href: '/admin/inventario', icon: Warehouse },
    { label: 'Surtido', href: '/admin/surtido', icon: Truck },
    { label: 'Analítica', href: '/admin/analitica', icon: BarChart3 },
    { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
  ],
  despachador: [
    { label: 'Inicio', href: '/despachador', icon: LayoutDashboard },
    { label: 'Mis Tickets', href: '/despachador/tickets', icon: Receipt },
    { label: 'Nuevo Ticket', href: '/despachador/tickets/nuevo', icon: ShoppingCart },
    { label: 'Recepción', href: '/despachador/recepciones', icon: Package },
    { label: 'Surtido', href: '/despachador/surtido', icon: Truck },
  ],
  checador: [
    { label: 'Cola', href: '/checador', icon: CheckSquare },
    { label: 'Historial', href: '/checador/historial', icon: Receipt },
  ],
}

export function Sidebar({ rol, nombre }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navByRole[rol] ?? []

  return (
    <aside className="w-60 flex-shrink-0 bg-brand-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="font-heading text-2xl font-semibold text-brand-accent tracking-wide">TINOCO</h1>
        <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Sistema POS</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-brand-accent/10 text-brand-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-brand-muted/40'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs font-medium text-foreground truncate">{nombre}</p>
        <p className="text-xs text-muted-foreground capitalize">{rol}</p>
      </div>
    </aside>
  )
}
