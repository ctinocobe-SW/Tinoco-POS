'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Receipt, Package, Users, Warehouse,
  Truck, BarChart3, CheckSquare, ShoppingCart, Settings, Menu, X,
} from 'lucide-react'
import type { UserRole } from '@/types/database.types'
import { cn } from '@/lib/utils/cn'

interface SidebarProps {
  rol: UserRole
  nombre: string
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onMobileClose: () => void
}

const navByRole: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: 'Dashboard',      href: '/admin',                icon: LayoutDashboard },
    { label: 'Tickets',        href: '/admin/tickets',        icon: Receipt },
    { label: 'Productos',      href: '/admin/productos',      icon: Package },
    { label: 'Clientes',       href: '/admin/clientes',       icon: Users },
    { label: 'Inventario',     href: '/admin/inventario',     icon: Warehouse },
    { label: 'Surtido',        href: '/admin/surtido',        icon: Truck },
    { label: 'Analítica',      href: '/admin/analitica',      icon: BarChart3 },
    { label: 'Configuración',  href: '/admin/configuracion',  icon: Settings },
  ],
  despachador: [
    { label: 'Inicio',         href: '/despachador',                    icon: LayoutDashboard },
    { label: 'Mis Tickets',    href: '/despachador/tickets',            icon: Receipt },
    { label: 'Nuevo Ticket',   href: '/despachador/tickets/nuevo',      icon: ShoppingCart },
    { label: 'Recepciones',    href: '/despachador/recepciones',        icon: Package },
    { label: 'Surtido',        href: '/despachador/surtido',            icon: Truck },
  ],
  checador: [
    { label: 'Cola',           href: '/checador',             icon: CheckSquare },
    { label: 'Surtido',        href: '/checador/surtido',     icon: Truck },
    { label: 'Historial',      href: '/checador/historial',   icon: Receipt },
  ],
  cajero: [
    { label: 'Caja',           href: '/cajero',               icon: LayoutDashboard },
  ],
}

export function Sidebar({ rol, nombre, collapsed, mobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navByRole[rol] ?? []

  const navContent = (showLabels: boolean, onItemClick?: () => void) => (
    <nav className="flex-1 py-2 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            title={!showLabels ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 mx-2 my-0.5 rounded-md text-sm transition-colors',
              showLabels ? 'px-3 py-2.5' : 'justify-center p-3',
              active
                ? 'bg-brand-accent/10 text-brand-accent font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-brand-muted/40'
            )}
          >
            <Icon size={showLabels ? 16 : 18} className="shrink-0" />
            {showLabels && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )

  const userFooter = (showLabels: boolean) => (
    <div className={cn('border-t border-border py-3', showLabels ? 'px-4' : 'px-2 flex justify-center')}>
      {showLabels ? (
        <>
          <p className="text-xs font-medium text-foreground truncate">{nombre}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{rol}</p>
        </>
      ) : (
        <div
          title={`${nombre} (${rol})`}
          className="w-8 h-8 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center text-xs font-bold"
        >
          {nombre.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 bg-brand-surface border-r border-border',
          'transition-all duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Header con toggle */}
        <div className={cn(
          'flex items-center border-b border-border h-14 flex-shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-3'
        )}>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-brand-muted/40 transition-colors"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <Menu size={18} />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-semibold text-brand-accent tracking-wide leading-none">TINOCO</h1>
              <p className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">Sistema POS</p>
            </div>
          )}
        </div>

        {navContent(!collapsed)}
        {userFooter(!collapsed)}
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 w-64 flex flex-col',
          'bg-brand-surface border-r border-border',
          'transition-transform duration-250 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header móvil */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <div>
            <h1 className="font-heading text-lg font-semibold text-brand-accent tracking-wide leading-none">TINOCO</h1>
            <p className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">Sistema POS</p>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {navContent(true, onMobileClose)}
        {userFooter(true)}
      </aside>
    </>
  )
}
