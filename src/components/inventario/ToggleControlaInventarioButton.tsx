'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Power } from 'lucide-react'
import { toggleControlaInventario } from '@/lib/actions/productos'
import { cn } from '@/lib/utils/cn'

interface ToggleControlaInventarioButtonProps {
  productoId: string
  controla: boolean
  onChange?: (nuevo: boolean) => void
}

export function ToggleControlaInventarioButton({
  productoId,
  controla: initial,
  onChange,
}: ToggleControlaInventarioButtonProps) {
  const [controla, setControla] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleControlaInventario(productoId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const nuevo = result.data!.controla_inventario
      setControla(nuevo)
      onChange?.(nuevo)
      toast.success(nuevo ? 'Control de inventario activado' : 'Control de inventario desactivado')
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={controla ? 'Apagar control de inventario' : 'Encender control de inventario'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
        controla
          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-border bg-white text-muted-foreground hover:bg-brand-surface'
      )}
    >
      <Power size={12} />
      {isPending ? '...' : controla ? 'Activo' : 'Apagado'}
    </button>
  )
}
