'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** Filtro opcional: solo reacciona a tickets de este despachador_id */
  despachadorId?: string
}

export function TicketsRealtimeRefresh({ despachadorId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('tickets-realtime-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          // Si hay filtro por despachador, ignorar cambios de otros
          if (despachadorId) {
            const row = (payload.new ?? payload.old) as any
            if (row?.despachador_id && row.despachador_id !== despachadorId) return
          }
          router.refresh()
        }
      )
      .subscribe()

    // Polling de respaldo cada 20 segundos
    const timer = setInterval(() => router.refresh(), 20_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [router, despachadorId])

  return null
}
