import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { ToggleClienteButton } from '@/components/clientes/ToggleClienteButton'
import { formatMXN, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Cliente — POS TINOCO' }

interface PageProps {
  params: { id: string }
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, razon_social, rfc, regimen_fiscal, codigo_postal, uso_cfdi, telefono, email, whatsapp, credito_habilitado, limite_credito, activo, created_at, updated_at')
    .eq('id', params.id)
    .single()

  if (!cliente) notFound()

  const c = cliente as any

  // Contar tickets del cliente
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', params.id)

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-semibold">{c.nombre}</h1>
            <Badge variant={c.activo ? 'success' : 'warning'}>
              {c.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            {c.credito_habilitado && (
              <Badge variant="info">Crédito</Badge>
            )}
          </div>
          {c.razon_social && (
            <p className="text-sm text-muted-foreground mt-0.5">{c.razon_social}</p>
          )}
        </div>
        <ToggleClienteButton clienteId={c.id} activo={c.activo} />
      </div>

      {/* Info rápida */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">RFC</p>
          <p className="text-lg font-mono font-medium mt-1">{c.rfc ?? '—'}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Tickets totales</p>
          <p className="text-xl font-semibold mt-1">{totalTickets ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Límite de crédito</p>
          <p className="text-xl font-semibold mt-1">
            {c.credito_habilitado ? formatMXN(Number(c.limite_credito)) : '—'}
          </p>
        </div>
      </div>

      {/* Formulario de edición */}
      <h2 className="text-lg font-medium mb-4">Editar cliente</h2>
      <ClienteForm
        clienteId={c.id}
        defaultValues={{
          nombre: c.nombre,
          razon_social: c.razon_social ?? '',
          rfc: c.rfc ?? '',
          regimen_fiscal: c.regimen_fiscal ?? '626',
          codigo_postal: c.codigo_postal ?? '',
          uso_cfdi: c.uso_cfdi ?? 'G03',
          telefono: c.telefono ?? '',
          email: c.email ?? '',
          whatsapp: c.whatsapp ?? '',
          credito_habilitado: c.credito_habilitado,
          limite_credito: Number(c.limite_credito),
        }}
      />

      <p className="text-xs text-muted-foreground mt-6">
        Creado el {formatDate(c.created_at)} · Última actualización {formatDate(c.updated_at)}
      </p>
    </div>
  )
}
