'use client'

import { useState } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListaDetalle, type ListaData } from './ListaDetalle'
import { ListaAlmacenDialog } from './ListaAlmacenDialog'

interface Props {
  listas: ListaData[]
  rol: 'admin' | 'despachador' | 'checador'
}

export function ListasAlmacenSection({ listas: initialListas, rol }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [listas] = useState(initialListas)

  const canCreate = rol === 'admin' || rol === 'despachador'
  const borradores = listas.filter((l) => l.estado === 'borrador')
  const finalizadas = listas.filter((l) => l.estado === 'finalizada')

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-3">
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus size={13} className="mr-1.5" />
            Nueva checklist
          </Button>
        </div>
      )}

      {borradores.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            En progreso
          </p>
          <div className="space-y-2">
            {borradores.map((l) => (
              <ListaDetalle key={l.id} lista={l} rol={rol} defaultExpanded={borradores.length === 1} />
            ))}
          </div>
        </div>
      )}

      {finalizadas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Finalizadas
          </p>
          <div className="space-y-2">
            {finalizadas.map((l) => (
              <ListaDetalle key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}

      {listas.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">Sin checklists manuales</p>
        </div>
      )}

      {canCreate && (
        <ListaAlmacenDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  )
}
