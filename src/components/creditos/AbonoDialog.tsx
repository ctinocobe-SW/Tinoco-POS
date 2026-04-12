'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { registrarAbono } from '@/lib/actions/creditos'
import type { MetodoPagoCredito } from '@/types/database.types'

interface AbonoDialogProps {
  open: boolean
  onClose: () => void
  creditoId: string
  saldoActual: number
}

const METODOS: { value: MetodoPagoCredito; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'otro',          label: 'Otro' },
]

export function AbonoDialog({ open, onClose, creditoId, saldoActual }: AbonoDialogProps) {
  const [monto, setMonto]             = useState('')
  const [fecha, setFecha]             = useState(new Date().toISOString().split('T')[0])
  const [metodo, setMetodo]           = useState<MetodoPagoCredito>('efectivo')
  const [referencia, setReferencia]   = useState('')
  const [notas, setNotas]             = useState('')
  const [loading, setLoading]         = useState(false)

  const handleClose = () => {
    setMonto(''); setFecha(new Date().toISOString().split('T')[0])
    setMetodo('efectivo'); setReferencia(''); setNotas('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (montoNum > saldoActual) { toast.error(`El monto no puede superar el saldo ($${saldoActual.toFixed(2)})`); return }

    setLoading(true)
    const result = await registrarAbono(creditoId, {
      monto: montoNum,
      fecha,
      metodo_pago: metodo,
      referencia: referencia || undefined,
      notas: notas || undefined,
    })
    setLoading(false)

    if (result?.error) { toast.error(result.error); return }
    toast.success(result?.data?.liquidado ? 'Crédito liquidado completamente' : 'Abono registrado')
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Registrar abono">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="p-3 bg-brand-surface rounded-lg border border-border text-sm">
          Saldo pendiente: <span className="font-semibold text-red-600">${saldoActual.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ab-monto">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="ab-monto"
                type="number"
                step="0.01"
                min="0.01"
                max={saldoActual}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-6"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ab-fecha">Fecha *</Label>
            <Input
              id="ab-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Método de pago *</Label>
          <div className="grid grid-cols-4 gap-2">
            {METODOS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetodo(m.value)}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  metodo === m.value
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent font-medium'
                    : 'border-border text-muted-foreground hover:border-brand-accent/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {(metodo === 'transferencia' || metodo === 'cheque') && (
          <div className="space-y-1.5">
            <Label htmlFor="ab-ref">
              {metodo === 'transferencia' ? 'Folio de transferencia' : 'Número de cheque'}
            </Label>
            <Input
              id="ab-ref"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder={metodo === 'transferencia' ? 'Ej. 1234567890' : 'Ej. 00123'}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ab-notas">Notas</Label>
          <Input
            id="ab-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones opcionales..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar abono'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>

      </form>
    </Dialog>
  )
}
