'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface ClienteCardProps {
  cliente: {
    id: string
    nombre: string
    rfc: string | null
    telefono: string | null
    credito_habilitado: boolean
    activo: boolean
  }
}

export function ClienteCard({ cliente }: ClienteCardProps) {
  return (
    <Link
      href={`/admin/clientes/${cliente.id}`}
      className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:bg-brand-surface transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{cliente.nombre}</p>
          {cliente.rfc && (
            <p className="text-xs text-muted-foreground font-mono">{cliente.rfc}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {cliente.telefono && (
          <span className="text-xs text-muted-foreground">{cliente.telefono}</span>
        )}
        {cliente.credito_habilitado && (
          <Badge variant="info">Crédito</Badge>
        )}
        <Badge variant={cliente.activo ? 'success' : 'warning'}>
          {cliente.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  )
}
