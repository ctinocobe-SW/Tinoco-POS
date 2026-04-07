'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, CornerDownLeft } from 'lucide-react'

import { aprobarTicket } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface ApprovalActionsProps {
  ticketId: string
}

export function ApprovalActions({ ticketId }: ApprovalActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogAction, setDialogAction] = useState<'rechazar' | 'devolver' | null>(null)
  const [motivo, setMotivo] = useState('')

  const handleAprobar = () => {
    startTransition(async () => {
      const result = await aprobarTicket({ ticket_id: ticketId, accion: 'aprobar' })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket aprobado')
        router.push('/admin/tickets')
      }
    })
  }

  const handleDialogSubmit = () => {
    if (!dialogAction) return
    startTransition(async () => {
      const result = await aprobarTicket({
        ticket_id: ticketId,
        accion: dialogAction,
        motivo: motivo || undefined,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(dialogAction === 'rechazar' ? 'Ticket rechazado' : 'Ticket devuelto')
        setDialogAction(null)
        setMotivo('')
        router.push('/admin/tickets')
      }
    })
  }

  return (
    <>
      <div className="flex gap-3">
        <Button onClick={handleAprobar} disabled={isPending}>
          <Check size={16} className="mr-1.5" />
          Aprobar
        </Button>
        <Button
          variant="outline"
          onClick={() => setDialogAction('devolver')}
          disabled={isPending}
        >
          <CornerDownLeft size={16} className="mr-1.5" />
          Devolver
        </Button>
        <Button
          variant="destructive"
          onClick={() => setDialogAction('rechazar')}
          disabled={isPending}
        >
          <X size={16} className="mr-1.5" />
          Rechazar
        </Button>
      </div>

      <Dialog
        open={dialogAction !== null}
        onClose={() => { setDialogAction(null); setMotivo('') }}
        title={dialogAction === 'rechazar' ? 'Rechazar ticket' : 'Devolver ticket'}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Motivo {dialogAction === 'devolver' && '(opcional)'}
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full bg-white border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors resize-none"
              placeholder="Explica el motivo..."
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setDialogAction(null); setMotivo('') }}>
              Cancelar
            </Button>
            <Button
              variant={dialogAction === 'rechazar' ? 'destructive' : 'default'}
              onClick={handleDialogSubmit}
              disabled={isPending}
            >
              {isPending ? 'Procesando...' : dialogAction === 'rechazar' ? 'Rechazar' : 'Devolver'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
