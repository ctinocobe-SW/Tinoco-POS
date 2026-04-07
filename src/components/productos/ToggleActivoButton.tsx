'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleProducto } from '@/lib/actions/productos'

interface ToggleActivoButtonProps {
  productoId: string
  activo: boolean
}

export function ToggleActivoButton({ productoId, activo: initialActivo }: ToggleActivoButtonProps) {
  const [activo, setActivo] = useState(initialActivo)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleProducto(productoId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setActivo(result.data!.activo)
      toast.success(result.data!.activo ? 'Producto activado' : 'Producto desactivado')
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
