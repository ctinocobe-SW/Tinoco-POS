'use client'

import { Loader2, WifiOff, Wifi, LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useOffline } from '@/components/providers/OfflineProvider'

interface TopBarProps {
  profile: { nombre: string; rol: string }
  onMenuClick: () => void
}

export function TopBar({ profile, onMenuClick }: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline()

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
            <>
              <Wifi size={13} className="text-green-500" />
              <span className="text-green-500 hidden sm:inline">En línea</span>
              {isSyncing && (
                <>
                  <Loader2 size={12} className="animate-spin text-muted-foreground ml-1" />
                  <span className="text-muted-foreground hidden sm:inline">Sincronizando...</span>
                </>
              )}
              {!isSyncing && pendingCount > 0 && (
                <button
                  onClick={syncNow}
                  className="ml-1 text-yellow-600 hover:text-yellow-700 underline hidden sm:inline"
                >
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </button>
              )}
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-yellow-500" />
              <span className="text-yellow-500 font-medium">Sin conexión</span>
              {pendingCount > 0 && (
                <span className="text-yellow-500 hidden sm:inline">
                  · {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </>
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
