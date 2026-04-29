'use client'

import { useState } from 'react'
import { Plus, ClipboardList, Sparkles, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListaDetalle, type ListaData } from './ListaDetalle'
import { ListaAlmacenDialog } from './ListaAlmacenDialog'
import { BorradorSurtidoDialog } from './BorradorSurtidoDialog'
import { PreferenciasSurtidoDialog } from './PreferenciasSurtidoDialog'

interface Props {
  listas: ListaData[]
  rol: 'admin' | 'despachador' | 'checador'
}

export function ListasAlmacenSection({ listas: initialListas, rol }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [borradorOpen, setBorradorOpen] = useState(false)
  const [prefOpen, setPrefOpen] = useState(false)
  const [listas] = useState(initialListas)

  const canCreate = rol === 'admin' || rol === 'despachador'
  const borradores = listas.filter((l) => l.estado === 'borrador')
  const finalizadas = listas.filter((l) => l.estado === 'finalizada')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-heading font-semibold">Surtido</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {borradores.length} en progreso · {finalizadas.length} finalizada{finalizadas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPrefOpen(true)}
              className="text-muted-foreground hover:text-foreground border border-border rounded-md p-2 transition-colors"
              title="Preferencias de surtido"
            >
              <Settings size={14} />
            </button>
            <Button variant="outline" onClick={() => setBorradorOpen(true)}>
              <Sparkles size={14} className="mr-1.5" />
              Borrador automático
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={15} className="mr-1.5" />
              Nueva lista
            </Button>
          </div>
        )}
      </div>

      {/* Listas en progreso */}
      {borradores.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            En progreso
          </p>
          <div className="space-y-2">
            {borradores.map((l) => (
              <ListaDetalle key={l.id} lista={l} rol={rol} defaultExpanded={borradores.length === 1} />
            ))}
          </div>
        </div>
      )}

      {/* Listas finalizadas */}
      {finalizadas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Finalizadas
          </p>
          <div className="space-y-2">
            {finalizadas.map((l) => (
              <ListaDetalle key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {listas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No hay listas de almacén</p>
          {canCreate && (
            <p className="text-xs mt-1">Crea una para organizar el surtido de productos</p>
          )}
        </div>
      )}

      {canCreate && (
        <>
          <ListaAlmacenDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
          <BorradorSurtidoDialog open={borradorOpen} onClose={() => setBorradorOpen(false)} />
          <PreferenciasSurtidoDialog open={prefOpen} onClose={() => setPrefOpen(false)} />
        </>
      )}
    </div>
  )
}
