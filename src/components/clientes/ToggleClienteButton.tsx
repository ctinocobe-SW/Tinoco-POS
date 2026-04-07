'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleCliente } from '@/lib/actions/clientes'

interface ToggleClienteButtonProps {
  clienteId: string
  activo: boolean
}

export function ToggleClienteButton({ clienteId, activo: initialActivo }: ToggleClienteButtonProps) {
  const [activo, setActivo] = useState(initialActivo)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleCliente(clienteId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setActivo(result.data!.activo)
      toast.success(result.data!.activo ? 'Cliente activado' : 'Cliente desactivado')
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? 'Procesando...' : activo ? 'Desactivar' : 'Activar'}
    </Button>
  )
}
