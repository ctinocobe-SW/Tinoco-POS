'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { searchClientes, getTicketsByCliente } from '@/lib/queries/clientes'
import { crearCredito } from '@/lib/actions/creditos'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { blurOnWheel } from '@/lib/utils/input-handlers'

interface NuevoCreditoDialogProps {
  open: boolean
  onClose: () => void
}

export function NuevoCreditoDialog({ open, onClose }: NuevoCreditoDialogProps) {
  // Cliente
  const [clienteQuery, setClienteQuery]     = useState('')
  const [clienteResults, setClienteResults] = useState<any[]>([])
  const [clienteSelected, setClienteSelected] = useState<any | null>(null)
  const [showClienteDrop, setShowClienteDrop] = useState(false)

  // Ticket opcional
  const [tickets, setTickets]               = useState<any[]>([])
  const [ticketId, setTicketId]             = useState('')

  // Campos del crédito
  const [monto, setMonto]                   = useState('')
  const [plazo, setPlazo]                   = useState('30')
  const [fechaOtorg, setFechaOtorg]         = useState(new Date().toISOString().split('T')[0])
  const [tasaMora, setTasaMora]             = useState('0')
  const [avalNombre, setAvalNombre]         = useState('')
  const [lugarExp, setLugarExp]             = useState('México')
  const [notas, setNotas]                   = useState('')

  const [loading, setLoading]               = useState(false)

  // Fecha de vencimiento calculada
  const fechaVenc = (() => {
    const d = new Date(fechaOtorg)
    d.setDate(d.getDate() + parseInt(plazo || '0'))
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
  })()

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setClienteQuery(''); setClienteResults([]); setClienteSelected(null)
      setTickets([]); setTicketId(''); setMonto(''); setPlazo('30')
      setFechaOtorg(new Date().toISOString().split('T')[0])
      setTasaMora('0'); setAvalNombre(''); setLugarExp('México'); setNotas('')
    }
  }, [open])

  // Búsqueda de clientes
  useEffect(() => {
    const t = setTimeout(async () => {
      if (clienteQuery.length >= 2 && !clienteSelected) {
        const r = await searchClientes(clienteQuery)
        setClienteResults(r); setShowClienteDrop(true)
      } else {
        setClienteResults([]); setShowClienteDrop(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [clienteQuery, clienteSelected])

  // Cargar tickets al seleccionar cliente
  useEffect(() => {
    if (clienteSelected) {
      getTicketsByCliente(clienteSelected.id).then(setTickets)
    }
  }, [clienteSelected])

  // Al seleccionar un ticket, autorellenar monto
  const handleSelectTicket = (id: string) => {
    setTicketId(id)
    const t = tickets.find((t: any) => t.id === id)
    if (t) setMonto(String(t.total))
  }

  const handleSelectCliente = (c: any) => {
    setClienteSelected(c); setClienteQuery(c.nombre)
    setShowClienteDrop(false); setClienteResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSelected) { toast.error('Selecciona un cliente'); return }
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    const plazoNum = parseInt(plazo)
    if (!plazoNum || plazoNum <= 0) { toast.error('El plazo debe ser mayor a 0 días'); return }

    setLoading(true)
    const result = await crearCredito({
      cliente_id: clienteSelected.id,
      ticket_id: ticketId || undefined,
      monto_original: montoNum,
      plazo_dias: plazoNum,
      fecha_otorgamiento: fechaOtorg,
      tasa_mora_pct: parseFloat(tasaMora) || 0,
      aval_nombre: avalNombre || undefined,
      lugar_expedicion: lugarExp || 'México',
      notas: notas || undefined,
    })
    setLoading(false)

    if (result.error) { toast.error(result.error); return }
    toast.success('Crédito otorgado correctamente')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Otorgar nuevo crédito" className="max-w-lg w-full">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={clienteQuery}
              onChange={(e) => { setClienteQuery(e.target.value); if (clienteSelected) setClienteSelected(null) }}
              placeholder="Buscar por nombre o RFC..."
              className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            {showClienteDrop && clienteResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {clienteResults.map((c: any) => (
                  <button key={c.id} type="button" onClick={() => handleSelectCliente(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface flex items-center gap-3">
                    <span className="font-medium">{c.nombre}</span>
                    {c.rfc && <span className="text-xs text-muted-foreground font-mono ml-auto">{c.rfc}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket vinculado */}
        {clienteSelected && (
          <div className="space-y-1.5">
            <Label htmlFor="nc-ticket">Vincular a ticket (opcional)</Label>
            <select
              id="nc-ticket"
              value={ticketId}
              onChange={(e) => handleSelectTicket(e.target.value)}
              className="w-full h-9 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">Sin ticket asociado</option>
              {tickets.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.folio} — {formatMXN(t.total)} — {formatDate(t.created_at)}
                </option>
              ))}
            </select>
            {tickets.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay tickets cerrados sin crédito para este cliente</p>
            )}
          </div>
        )}

        {/* Monto y plazo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc-monto">Monto del crédito *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input id="nc-monto" type="number" step="0.01" min="0.01" onWheel={blurOnWheel}
                value={monto} onChange={(e) => setMonto(e.target.value)}
                className="pl-6" placeholder="0.00" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-plazo">Plazo (días) *</Label>
            <Input id="nc-plazo" type="number" min="1" onWheel={blurOnWheel}
              value={plazo} onChange={(e) => setPlazo(e.target.value)} required />
          </div>
        </div>

        {/* Fecha otorgamiento y vencimiento calculado */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc-fecha">Fecha de otorgamiento</Label>
            <Input id="nc-fecha" type="date"
              value={fechaOtorg} onChange={(e) => setFechaOtorg(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vence el</Label>
            <div className="h-9 px-3 flex items-center border border-border rounded-md bg-brand-surface text-sm text-muted-foreground">
              {fechaVenc || '—'}
            </div>
          </div>
        </div>

        {/* Tasa mora y lugar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc-mora">Tasa mora diaria (%)</Label>
            <Input id="nc-mora" type="number" step="0.01" min="0" onWheel={blurOnWheel}
              value={tasaMora} onChange={(e) => setTasaMora(e.target.value)}
              placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-lugar">Lugar de expedición</Label>
            <Input id="nc-lugar" value={lugarExp}
              onChange={(e) => setLugarExp(e.target.value)} placeholder="México" />
          </div>
        </div>

        {/* Aval */}
        <div className="space-y-1.5">
          <Label htmlFor="nc-aval">Nombre del aval / fiador (opcional)</Label>
          <Input id="nc-aval" value={avalNombre}
            onChange={(e) => setAvalNombre(e.target.value)}
            placeholder="Nombre completo del aval..." />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="nc-notas">Notas / condiciones</Label>
          <Input id="nc-notas" value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Condiciones especiales de pago..." />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={loading || !clienteSelected}>
            {loading ? 'Creando...' : 'Otorgar crédito'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>

      </form>
    </Dialog>
  )
}
