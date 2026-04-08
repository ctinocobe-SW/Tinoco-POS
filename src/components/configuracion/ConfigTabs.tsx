'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlmacenDialog } from './AlmacenDialog'
import { ProveedorDialog } from './ProveedorDialog'
import { toggleAlmacen, toggleProveedor } from '@/lib/actions/configuracion'
import type { AlmacenTipo } from '@/types/database.types'

interface Almacen {
  id: string
  nombre: string
  ubicacion: string | null
  tipo: AlmacenTipo
  activo: boolean
}

interface Proveedor {
  id: string
  nombre: string
  razon_social: string | null
  rfc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  activo: boolean
}

interface ConfigTabsProps {
  almacenes: Almacen[]
  proveedores: Proveedor[]
}

type Tab = 'almacenes' | 'proveedores'

function ToggleButton({ id, activo, onToggle }: { id: string; activo: boolean; onToggle: (id: string) => void }) {
  const [isPending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => onToggle(id))}
    >
      {isPending ? '...' : activo ? 'Desactivar' : 'Activar'}
    </Button>
  )
}

export function ConfigTabs({ almacenes: initialAlmacenes, proveedores: initialProveedores }: ConfigTabsProps) {
  const [tab, setTab] = useState<Tab>('almacenes')

  // Almacenes state
  const [almacenes, setAlmacenes] = useState(initialAlmacenes)
  const [almacenDialog, setAlmacenDialog] = useState(false)
  const [editAlmacen, setEditAlmacen] = useState<Almacen | null>(null)

  // Proveedores state
  const [proveedores, setProveedores] = useState(initialProveedores)
  const [proveedorDialog, setProveedorDialog] = useState(false)
  const [editProveedor, setEditProveedor] = useState<Proveedor | null>(null)

  const handleToggleAlmacen = async (id: string) => {
    const result = await toggleAlmacen(id)
    if (result.error) { toast.error(result.error); return }
    setAlmacenes((prev) => prev.map((a) => a.id === id ? { ...a, activo: result.data!.activo } : a))
    toast.success(result.data!.activo ? 'Almacén activado' : 'Almacén desactivado')
  }

  const handleToggleProveedor = async (id: string) => {
    const result = await toggleProveedor(id)
    if (result.error) { toast.error(result.error); return }
    setProveedores((prev) => prev.map((p) => p.id === id ? { ...p, activo: result.data!.activo } : p))
    toast.success(result.data!.activo ? 'Proveedor activado' : 'Proveedor desactivado')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'almacenes', label: `Almacenes (${almacenes.length})` },
    { key: 'proveedores', label: `Proveedores (${proveedores.length})` },
  ]

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Almacenes */}
      {tab === 'almacenes' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditAlmacen(null); setAlmacenDialog(true) }}>
              <Plus size={15} className="mr-1.5" />
              Nuevo almacén
            </Button>
          </div>

          {almacenes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-lg">
              No hay almacenes registrados
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                    <th className="px-4 py-2.5 text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-left">Ubicación</th>
                    <th className="px-4 py-2.5 text-center w-24">Estado</th>
                    <th className="px-4 py-2.5 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {almacenes.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                      <td className="px-4 py-3 font-medium">{a.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{a.tipo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.ubicacion ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={a.activo ? 'success' : 'default'}>
                          {a.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditAlmacen(a); setAlmacenDialog(true) }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <ToggleButton id={a.id} activo={a.activo} onToggle={handleToggleAlmacen} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Proveedores */}
      {tab === 'proveedores' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditProveedor(null); setProveedorDialog(true) }}>
              <Plus size={15} className="mr-1.5" />
              Nuevo proveedor
            </Button>
          </div>

          {proveedores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-lg">
              No hay proveedores registrados
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                    <th className="px-4 py-2.5 text-left">RFC</th>
                    <th className="px-4 py-2.5 text-left">Contacto</th>
                    <th className="px-4 py-2.5 text-left">Teléfono</th>
                    <th className="px-4 py-2.5 text-center w-24">Estado</th>
                    <th className="px-4 py-2.5 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.nombre}</p>
                        {p.razon_social && <p className="text-xs text-muted-foreground">{p.razon_social}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.rfc ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.contacto ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.telefono ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.activo ? 'success' : 'default'}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditProveedor(p); setProveedorDialog(true) }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <ToggleButton id={p.id} activo={p.activo} onToggle={handleToggleProveedor} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AlmacenDialog
        open={almacenDialog}
        onClose={() => { setAlmacenDialog(false); setEditAlmacen(null) }}
        almacen={editAlmacen}
      />
      <ProveedorDialog
        open={proveedorDialog}
        onClose={() => { setProveedorDialog(false); setEditProveedor(null) }}
        proveedor={editProveedor}
      />
    </>
  )
}
