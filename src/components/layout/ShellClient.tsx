'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { UserRole } from '@/types/database.types'

interface Props {
  children: React.ReactNode
  profile: { nombre: string; rol: UserRole; email: string }
}

export function ShellClient({ children, profile }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)   // desktop: icon-only por defecto
  const [mobileOpen, setMobileOpen] = useState(false) // mobile: cerrado por defecto

  // Cierra el sidebar móvil al navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-brand-bg">

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        rol={profile.rol}
        nombre={profile.nombre}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          profile={profile}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
