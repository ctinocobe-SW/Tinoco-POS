'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { offlineDB } from '@/lib/offline/db'
import { processSyncQueue } from '@/lib/offline/sync'
import { warmAllCaches } from '@/lib/offline/cache'

interface OfflineContextValue {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  syncNow: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: async () => {},
})

export function useOffline() {
  return useContext(OfflineContext)
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const prevOnlineRef = useRef(true)

  const pendingCount =
    useLiveQuery(() => offlineDB.syncQueue.filter((e) => e.intentos < 5).count(), [], 0) ?? 0

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return
    setIsSyncing(true)
    try {
      const { synced, errors } = await processSyncQueue()
      if (synced > 0)
        toast.success(`${synced} ticket${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''}`)
      if (errors > 0)
        toast.error(`${errors} ticket${errors > 1 ? 's' : ''} con error al sincronizar`)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing])

  // Toasts y auto-sync al cambiar estado de conexión
  useEffect(() => {
    const wasOnline = prevOnlineRef.current
    prevOnlineRef.current = isOnline

    if (isOnline && !wasOnline) {
      toast.success('Conexión restaurada')
      syncNow()
      warmAllCaches().catch(() => {})
    } else if (!isOnline && wasOnline) {
      toast.warning('Sin conexión — modo offline activo')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // Warm caches al montar si hay conexión
  useEffect(() => {
    if (isOnline) {
      warmAllCaches().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}
