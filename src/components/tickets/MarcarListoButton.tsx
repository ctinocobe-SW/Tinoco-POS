'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PackageCheck } from 'lucide-react'
import { marcarListoParaVerificacion } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'

interface MarcarListoButtonProps {
  ticketId: string
}

export function MarcarListoButton({ ticketId }: MarcarListoButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = () => {
    startTransition(async () => {
      const result = await marcarListoParaVerificacion(ticketId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Pedido enviado a verificación')
      router.push('/despachador/tickets')
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
    >
      <PackageCheck size={16} className="mr-2" />
      {isPending ? 'Enviando...' : 'Pedido listo — enviar a verificación'}
    </Button>
  )
}
