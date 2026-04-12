'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { crearUsuario, actualizarUsuario } from '@/lib/actions/usuarios'
import type { UsuarioRol } from '@/lib/actions/usuarios'

export interface UsuarioRow {
  id: string
  nombre: string
  email: string
  rol: UsuarioRol
  activo: boolean
}

const ROLES: { value: UsuarioRol; label: string; desc: string }[] = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total al sistema' },
  { value: 'despachador', label: 'Despachador', desc: 'Crea tickets y recepciones' },
  { value: 'checador', label: 'Checador', desc: 'Verifica tickets y surtido' },
  { value: 'cajero', label: 'Cajero', desc: 'Operaciones de caja' },
]

interface Props {
  open: boolean
  onClose: () => void
  usuario: UsuarioRow | null
}

export function UsuarioDialog({ open, onClose, usuario }: Props) {
  const isEdit = !!usuario
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<UsuarioRol>('despachador')

  // Derivar username del email guardado (quitar el dominio @pos-tinoco.local)
  function emailToUsername(email: string) {
    return email.replace('@pos-tinoco.local', '')
  }

  useEffect(() => {
    if (open) {
      setNombre(usuario?.nombre ?? '')
      setUsername(usuario?.email ? emailToUsername(usuario.email) : '')
      setPassword('')
      setRol(usuario?.rol ?? 'despachador')
      setShowPass(false)
    }
  }, [open, usuario])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = isEdit
        ? await actualizarUsuario(usuario.id, { nombre, rol, password: password || undefined })
        : await crearUsuario({ nombre, username, password, rol })

      if (result.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="space-y-1.5">
          <Label htmlFor="u-nombre">Nombre completo *</Label>
          <Input
            id="u-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del usuario"
            required
          />
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="u-username">Nombre de usuario *</Label>
            <Input
              id="u-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="juan.perez"
              required
            />
            <p className="text-xs text-muted-foreground">
              Se usará para iniciar sesión
            </p>
          </div>
        )}
        {isEdit && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Usuario</Label>
            <p className="text-sm font-mono bg-brand-surface border border-border rounded-md px-3 py-2 text-muted-foreground">
              {emailToUsername(usuario?.email ?? '')}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="u-password">
            {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
          </Label>
          <div className="relative">
            <Input
              id="u-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
              required={!isEdit}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Rol *</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRol(r.value)}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  rol === r.value
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                    : 'border-border hover:border-brand-accent/50 text-foreground'
                }`}
              >
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
