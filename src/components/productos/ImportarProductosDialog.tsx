'use client'

import { useState, useRef } from 'react'
import { read, utils } from 'xlsx'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { importarProductos } from '@/lib/actions/productos'
import { CATEGORIAS_PRODUCTO } from '@/lib/validations/schemas'

// Columnas esperadas → campo del schema.
// Se normaliza: toLower + trim + espacios→guión_bajo antes de buscar aquí.
const COLUMN_MAP: Record<string, string> = {
  // Nombre / descripción
  nombre: 'nombre',
  descripcion: 'descripcion',
  descripción: 'descripcion',
  // Categoría
  categoria: 'categoria',
  categoría: 'categoria',
  // Código de barras
  codigo_barras: 'codigo_barras',
  código_barras: 'codigo_barras',
  codigo: 'codigo_barras',
  código: 'codigo_barras',
  barras: 'codigo_barras',
  ean: 'codigo_barras',
  upc: 'codigo_barras',
  // Precio menudeo (precio_base)
  precio_base: 'precio_base',
  precio_menudeo: 'precio_base',
  menudeo: 'precio_base',
  precio: 'precio_base',
  precio_venta: 'precio_base',
  precio_publico: 'precio_base',
  precio_público: 'precio_base',
  p_menudeo: 'precio_base',
  p._menudeo: 'precio_base',
  precio_cliente: 'precio_base',
  retail: 'precio_base',
  venta: 'precio_base',
  // Precio mayoreo (precio_mayoreo)
  precio_mayoreo: 'precio_mayoreo',
  mayoreo: 'precio_mayoreo',
  p_mayoreo: 'precio_mayoreo',
  p._mayoreo: 'precio_mayoreo',
  precio_dist: 'precio_mayoreo',
  precio_distribuidor: 'precio_mayoreo',
  distribuidor: 'precio_mayoreo',
  wholesale: 'precio_mayoreo',
  precio_costo_venta: 'precio_mayoreo',
  // Costo
  costo: 'costo',
  precio_costo: 'costo',
  costo_unitario: 'costo',
  // Impuestos
  tasa_iva: 'tasa_iva',
  iva: 'tasa_iva',
  tasa_ieps: 'tasa_ieps',
  ieps: 'tasa_ieps',
  // Peso
  peso_kg: 'peso_kg',
  peso: 'peso_kg',
  // Unidades de venta
  vende_pza: 'vende_pza',
  vende_pieza: 'vende_pza',
  pieza: 'vende_pza',
  pza: 'vende_pza',
  vende_kg: 'vende_kg',
  kg: 'vende_kg',
  vende_caja: 'vende_caja',
  caja: 'vende_caja',
  vende_bulto: 'vende_bulto',
  bulto: 'vende_bulto',
  requiere_caducidad: 'requiere_caducidad',
  caducidad: 'requiere_caducidad',
}

const BOOLEAN_FIELDS = new Set(['vende_pza', 'vende_kg', 'vende_caja', 'vende_bulto', 'requiere_caducidad'])
const NUMBER_FIELDS = new Set(['precio_base', 'precio_mayoreo', 'costo', 'tasa_iva', 'tasa_ieps', 'peso_kg'])

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val !== 0
  const s = String(val ?? '').toLowerCase().trim()
  return s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true' || s === 'x'
}

function parseRows(raw: Record<string, unknown>[]): Record<string, unknown>[] {
  return raw.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [col, val] of Object.entries(row)) {
      const field = COLUMN_MAP[col.toLowerCase().trim().replace(/\s+/g, '_')]
      if (!field) continue
      if (BOOLEAN_FIELDS.has(field)) {
        out[field] = parseBool(val)
      } else if (NUMBER_FIELDS.has(field)) {
        const n = Number(val)
        out[field] = isNaN(n) ? 0 : n
      } else {
        out[field] = val === null || val === undefined ? '' : String(val).trim()
      }
    }
    // Normalizar categoria
    if (out.categoria) {
      const cat = String(out.categoria).trim()
      const match = CATEGORIAS_PRODUCTO.find(c => c.toLowerCase() === cat.toLowerCase())
      out.categoria = match ?? 'Otros'
    }
    return out
  }).filter(r => r.nombre && String(r.nombre).trim() !== '')
}

const TEMPLATE_URL = `data:text/csv;charset=utf-8,nombre,descripcion,categoria,codigo_barras,precio_menudeo,precio_mayoreo,costo,tasa_iva,tasa_ieps,peso_kg,vende_pza,vende_kg,vende_caja,vende_bulto,requiere_caducidad
Ejemplo Producto,Descripción opcional,Abarrotes,7501000000001,25.50,20.00,12.00,0.16,0,0.500,si,no,no,no,no
Croqueta Grande,Alimento perro adulto,Croquetas,7502000000002,185.00,160.00,90.00,0.16,0,2.000,si,no,no,si,no`

interface Props {
  open: boolean
  onClose: () => void
}

type Resultado = { creados: number; errores: { fila: number; mensaje: string }[] }

export function ImportarProductosDialog({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setRows([])
    setFileName('')
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const processFile = (file: File) => {
    if (!file) return
    setFileName(file.name)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const parsed = parseRows(raw)
        setRows(parsed)
      } catch {
        toast.error('No se pudo leer el archivo. Verifica que sea CSV o Excel válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setSubmitting(true)
    try {
      const result = await importarProductos(rows)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setResultado(result.data!)
      if (result.data!.creados > 0) {
        toast.success(`${result.data!.creados} producto${result.data!.creados !== 1 ? 's' : ''} importado${result.data!.creados !== 1 ? 's' : ''}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={handleClose} title="Importar productos">
      <div className="space-y-4">

        {/* Plantilla */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Descarga la plantilla para ver el formato esperado</span>
          <a
            href={TEMPLATE_URL}
            download="plantilla_productos.csv"
            className="text-brand-accent underline hover:no-underline text-xs font-medium"
          >
            Descargar plantilla CSV
          </a>
        </div>

        {/* Drop zone */}
        {!resultado && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-brand-accent bg-brand-accent/5' : 'border-border hover:border-brand-accent/50'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet size={20} className="text-brand-accent" />
                <span className="text-sm font-medium">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={24} />
                <p className="text-sm">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                <p className="text-xs">.csv, .xlsx, .xls</p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !resultado && (
          <div>
            <p className="text-sm font-medium mb-2">
              {rows.length} producto{rows.length !== 1 ? 's' : ''} detectado{rows.length !== 1 ? 's' : ''}
            </p>
            <div className="border border-border rounded-lg overflow-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">Categoría</th>
                    <th className="px-3 py-2 text-right font-medium">P. Menudeo</th>
                    <th className="px-3 py-2 text-right font-medium">P. Mayoreo</th>
                    <th className="px-3 py-2 text-left font-medium">Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 max-w-[160px] truncate">{String(row.nombre ?? '')}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.categoria ?? 'Otros')}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(row.precio_base ?? 0) > 0 ? `$${Number(row.precio_base).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(row.precio_mayoreo ?? 0) > 0 ? `$${Number(row.precio_mayoreo).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {[
                          row.vende_pza && 'pza',
                          row.vende_kg && 'kg',
                          row.vende_caja && 'caja',
                          row.vende_bulto && 'bulto',
                        ].filter(Boolean).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 8 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                        … y {rows.length - 8} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-green-600" />
              <span><strong>{resultado.creados}</strong> producto{resultado.creados !== 1 ? 's' : ''} importado{resultado.creados !== 1 ? 's' : ''} correctamente</span>
            </div>
            {resultado.errores.length > 0 && (
              <div className="border border-amber-200 rounded-lg p-3 space-y-1 max-h-36 overflow-auto">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1">
                  <AlertCircle size={13} />
                  {resultado.errores.length} fila{resultado.errores.length !== 1 ? 's' : ''} con error
                </div>
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-amber-800">
                    Fila {e.fila}: {e.mensaje}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {resultado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!resultado && rows.length > 0 && (
            <Button type="button" onClick={handleImport} disabled={submitting}>
              {submitting ? 'Importando...' : `Importar ${rows.length} producto${rows.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
