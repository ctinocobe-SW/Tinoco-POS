import { offlineDB } from './db'
import { crearTicket } from '@/lib/actions/tickets'
import type { CrearTicketInput } from '@/lib/validations/schemas'

type CreateTicketPayload = { input: CrearTicketInput; folio_local: string }

export async function processSyncQueue(): Promise<{ synced: number; errors: number }> {
  const pending = await offlineDB.syncQueue
    .filter((e) => e.intentos < 5)
    .toArray()

  let synced = 0
  let errors = 0

  for (const event of pending) {
    try {
      if (event.tipo === 'create_ticket') {
        const { input, folio_local } = event.payload as CreateTicketPayload
        const result = await crearTicket(input)

        if (result.error) {
          await offlineDB.syncQueue.update(event.id!, {
            intentos: event.intentos + 1,
            error: result.error,
          })
          errors++
        } else {
          await offlineDB.tickets.update(folio_local, { sincronizado: true })
          await offlineDB.syncQueue.delete(event.id!)
          synced++
        }
      }
    } catch (err) {
      await offlineDB.syncQueue.update(event.id!, {
        intentos: event.intentos + 1,
        error: String(err),
      })
      errors++
    }
  }

  return { synced, errors }
}

export async function getPendingSyncCount(): Promise<number> {
  return offlineDB.syncQueue.filter((e) => e.intentos < 5).count()
}
