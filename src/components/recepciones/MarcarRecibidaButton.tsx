'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { marcarRecibida, cancelarRecepcion } from '@/lib/actions/recepciones'

export function MarcarRecibidaButton({ recepcionId }: { recepcionId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleEnviar = () => {
    if (!confirm('¿Enviar al admin para cierre? Después de esto no podrás editar las cantidades.')) return
    startTransition(async () => {
      const result = await marcarRecibida(recepcionId)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Recepción enviada al admin')
      router.refresh()
    })
  }

  return (
    <Button onClick={handleEnviar} disabled={pending}>
      <Send size={14} className="mr-1.5" />
      {pending ? 'Enviando...' : 'Enviar al admin'}
    </Button>
  )
}

export function CancelarRecepcionButton({
  recepcionId,
  estado,
}: {
  recepcionId: string
  estado: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (estado === 'cerrada' || estado === 'cancelada') return null

  const handleCancelar = () => {
    const motivo = prompt('Motivo de la cancelación (opcional)')
    if (motivo === null) return // user pressed cancel
    startTransition(async () => {
      const result = await cancelarRecepcion({ recepcion_id: recepcionId, motivo: motivo || undefined })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Recepción cancelada')
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleCancelar} disabled={pending} size="sm">
      {pending ? 'Cancelando...' : 'Cancelar recepción'}
    </Button>
  )
}
