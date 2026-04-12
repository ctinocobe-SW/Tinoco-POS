'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlmacenDialog } from './AlmacenDialog'
import { ProveedorDialog } from './ProveedorDialog'
import { UsuarioDialog } from './UsuarioDialog'
import type { UsuarioRow } from './UsuarioDialog'
import { toggleAlmacen, toggleProveedor } from '@/lib/actions/configuracion'
import { toggleUsuarioActivo } from '@/lib/actions/usuarios'
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
  usuarios: UsuarioRow[]
}

type Tab = 'almacenes' | 'proveedores' | 'usuarios'

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  despachador: 'Despachador',
  checador: 'Checador',
  cajero: 'Cajero',
}

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

export function ConfigTabs({ almacenes: initialAlmacenes, proveedores: initialProveedores, usuarios: initialUsuarios }: ConfigTabsProps) {
  const [tab, setTab] = useState<Tab>('almacenes')

  // Almacenes state
  const [almacenes, setAlmacenes] = useState(initialAlmacenes)
  const [almacenDialog, setAlmacenDialog] = useState(false)
  const [editAlmacen, setEditAlmacen] = useState<Almacen | null>(null)

  // Proveedores state
  const [proveedores, setProveedores] = useState(initialProveedores)
  const [proveedorDialog, setProveedorDialog] = useState(false)
  const [editProveedor, setEditProveedor] = useState<Proveedor | null>(null)

  // Usuarios state
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [usuarioDialog, setUsuarioDialog] = useState(false)
  const [editUsuario, setEditUsuario] = useState<UsuarioRow | null>(null)

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

  const handleToggleUsuario = async (id: string, activo: boolean) => {
    const result = await toggleUsuarioActivo(id, activo)
    if (result.error) { toast.error(result.error); return }
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo } : u))
    toast.success(activo ? 'Usuario activado' : 'Usuario desactivado')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'almacenes', label: `Almacenes (${almacenes.length})` },
    { key: 'proveedores', label: `Proveedores (${proveedores.length})` },
    { key: 'usuarios', label: `Usuarios (${usuarios.length})` },
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

      {/* Usuarios */}
      {tab === 'usuarios' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditUsuario(null); setUsuarioDialog(true) }}>
              <Plus size={15} className="mr-1.5" />
              Nuevo usuario
            </Button>
          </div>

          {usuarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-lg">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                    <th className="px-4 py-2.5 text-left">Usuario</th>
                    <th className="px-4 py-2.5 text-left w-36">Rol</th>
                    <th className="px-4 py-2.5 text-center w-24">Estado</th>
                    <th className="px-4 py-2.5 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                      <td className="px-4 py-3 font-medium">{u.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {u.email.replace('@pos-tinoco.local', '')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${
                          u.rol === 'admin' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' :
                          u.rol === 'despachador' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          u.rol === 'checador' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ROL_LABELS[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.activo ? 'success' : 'default'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditUsuario(u); setUsuarioDialog(true) }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <ToggleButton
                            id={u.id}
                            activo={u.activo}
                            onToggle={(id) => handleToggleUsuario(id, !u.activo)}
                          />
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
      <UsuarioDialog
        open={usuarioDialog}
        onClose={() => { setUsuarioDialog(false); setEditUsuario(null); }}
        usuario={editUsuario}
      />
    </>
  )
}
