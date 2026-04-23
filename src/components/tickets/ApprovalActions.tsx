'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Trash2 } from 'lucide-react'

import { aprobarTicket } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface ApprovalActionsProps {
  ticketId: string
}

export function ApprovalActions({ ticketId }: ApprovalActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
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

  const handleCancelar = () => {
    startTransition(async () => {
      const result = await aprobarTicket({
        ticket_id: ticketId,
        accion: 'rechazar',
        motivo: motivo || undefined,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket cancelado')
        setCancelOpen(false)
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
          variant="destructive"
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
        >
          <Trash2 size={16} className="mr-1.5" />
          Cancelar ticket
        </Button>
      </div>

      <Dialog
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setMotivo('') }}
        title="Cancelar ticket"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El ticket quedará marcado como cancelado y no podrá procesarse.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full bg-white border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors resize-none"
              placeholder="Motivo de cancelación..."
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setMotivo('') }}>
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={isPending}
            >
              {isPending ? 'Cancelando...' : 'Cancelar ticket'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
