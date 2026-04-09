'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, CheckCheck, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListaAlmacenDialog } from './ListaAlmacenDialog'
import { finalizarListaAlmacen } from '@/lib/actions/listasAlmacen'
import { formatDate } from '@/lib/utils/format'

interface Lista {
  id: string
  nombre: string
  notas: string | null
  estado: string
  created_at: string
  total_items: number
}

interface ListasAlmacenSectionProps {
  listas: Lista[]
}

export function ListasAlmacenSection({ listas: initialListas }: ListasAlmacenSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [listas, setListas] = useState(initialListas)
  const [isPending, startTransition] = useTransition()

  const handleFinalizar = (id: string) => {
    startTransition(async () => {
      const result = await finalizarListaAlmacen(id)
      if (result.error) { toast.error(result.error); return }
      setListas((prev) => prev.map((l) => l.id === id ? { ...l, estado: 'finalizada' } : l))
      toast.success('Lista finalizada')
    })
  }

  const borradores = listas.filter((l) => l.estado === 'borrador')
  const finalizadas = listas.filter((l) => l.estado === 'finalizada')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-heading font-semibold">Listas de almacén</h2>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={15} className="mr-1.5" />
          Nueva lista
        </Button>
      </div>

      {listas.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          No hay listas creadas. Crea una para organizar pedidos de reposición.
        </div>
      ) : (
        <div className="space-y-4">
          {borradores.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">En progreso</p>
              <div className="space-y-2">
                {borradores.map((l) => (
                  <div key={l.id} className="border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{l.nombre}</p>
                        <Badge variant="warning">Borrador</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {l.total_items} producto{l.total_items !== 1 ? 's' : ''} · {formatDate(l.created_at)}
                      </p>
                      {l.notas && <p className="text-xs text-muted-foreground italic">{l.notas}</p>}
                    </div>
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleFinalizar(l.id)}>
                      <CheckCheck size={13} className="mr-1" />
                      Finalizar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalizadas.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Finalizadas</p>
              <div className="space-y-2">
                {finalizadas.slice(0, 5).map((l) => (
                  <div key={l.id} className="border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4 opacity-70">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{l.nombre}</p>
                        <Badge variant="success">Finalizada</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {l.total_items} producto{l.total_items !== 1 ? 's' : ''} · {formatDate(l.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ListaAlmacenDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
