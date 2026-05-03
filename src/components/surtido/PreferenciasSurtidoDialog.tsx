'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getAlmacenes } from '@/lib/queries/almacenes'
import {
  getPreferenciasSurtido,
  upsertPreferenciasSurtido,
} from '@/lib/actions/preferenciasSurtido'
import { blurOnWheel } from '@/lib/utils/input-handlers'

interface Props {
  open: boolean
  onClose: () => void
}

export function PreferenciasSurtidoDialog({ open, onClose }: Props) {
  const [topN, setTopN] = useState(20)
  const [incluirBajoMin, setIncluirBajoMin] = useState(true)
  const [destinoDefault, setDestinoDefault] = useState('')
  const [soloControla, setSoloControla] = useState(true)
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([getAlmacenes(), getPreferenciasSurtido()]).then(([all, pref]) => {
      setSucursales(all.filter((a) => a.tipo === 'sucursal'))
      const d = (pref as any).data
      if (d) {
        setTopN(d.top_n ?? 20)
        setIncluirBajoMin(!!d.incluir_bajo_minimo)
        setDestinoDefault(d.almacen_destino_default ?? '')
        setSoloControla(!!d.solo_controla_inventario)
      }
    })
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    const res = await upsertPreferenciasSurtido({
      top_n: topN,
      incluir_bajo_minimo: incluirBajoMin,
      almacen_destino_default: destinoDefault || undefined,
      solo_controla_inventario: soloControla,
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Preferencias guardadas')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Preferencias de surtido" className="max-w-md w-full">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings size={14} />
          Estas preferencias se usarán al generar borradores automáticos.
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pref-topn">Top N productos a sugerir</Label>
          <input
            id="pref-topn"
            type="number"
            min={1}
            max={200}
            value={topN}
            onWheel={blurOnWheel}
            onChange={(e) => setTopN(parseInt(e.target.value) || 20)}
            className="w-full h-9 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pref-destino">Sucursal destino por defecto</Label>
          <Select id="pref-destino" value={destinoDefault} onChange={(e) => setDestinoDefault(e.target.value)}>
            <option value="">— Sin valor por defecto —</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={incluirBajoMin}
            onChange={(e) => setIncluirBajoMin(e.target.checked)}
            className="w-4 h-4 accent-brand-accent"
          />
          <span className="text-sm">Incluir productos bajo mínimo</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={soloControla}
            onChange={(e) => setSoloControla(e.target.checked)}
            className="w-4 h-4 accent-brand-accent"
          />
          <span className="text-sm">Solo productos con control de inventario activo</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
