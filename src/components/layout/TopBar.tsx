'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  profile: {
    nombre: string
    rol: string
  }
}

export function TopBar({ profile }: TopBarProps) {
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
    <header className="h-14 bg-brand-surface border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      {/* Estado de conexión */}
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <><Wifi size={14} className="text-green-400" /><span className="text-green-400 text-xs">En línea</span></>
        ) : (
          <><WifiOff size={14} className="text-yellow-400" /><span className="text-yellow-400 text-xs font-medium">Sin conexión — modo offline</span></>
        )}
      </div>

      {/* Acciones */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut size={14} />
        Salir
      </button>
    </header>
  )
}
