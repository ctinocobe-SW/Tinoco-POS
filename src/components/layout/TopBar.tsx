'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  profile: { nombre: string; rol: string }
  onMenuClick: () => void
}

export function TopBar({ profile, onMenuClick }: TopBarProps) {
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-brand-surface border-b border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Botón hamburguesa — solo visible en móvil */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-brand-muted/40 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        {/* Estado de conexión */}
        <div className="flex items-center gap-1.5 text-xs">
          {isOnline ? (
            <><Wifi size={13} className="text-green-500" /><span className="text-green-500 hidden sm:inline">En línea</span></>
          ) : (
            <><WifiOff size={13} className="text-yellow-500" /><span className="text-yellow-500 font-medium">Sin conexión</span></>
          )}
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-brand-muted/40"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </header>
  )
}
