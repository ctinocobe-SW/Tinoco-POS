import type { UnidadVenta } from '@/lib/validations/schemas'

export interface UnidadOpcion {
  unidad: UnidadVenta
  precio: number
  tipo: 'menudeo' | 'mayoreo'
  label: string
  key: string // unidad-tipo, unique per option
  cantidad_default?: number // auto-fill con piezas_por_caja o piezas_por_bulto al elegir mayoreo
}

const UNIDAD_LABEL: Record<UnidadVenta, string> = {
  pza: 'pza',
  kg: 'kg',
  caja: 'caja',
  bulto: 'bulto',
}

export function construirOpciones(p: {
  precio_base: number | string | null
  precio_mayoreo: number | string | null
  unidad_precio_base: string | null
  unidad_precio_mayoreo: string | null
  piezas_por_caja?: number | null
  piezas_por_bulto?: number | null
  vende_caja?: boolean | null
  vende_bulto?: boolean | null
}): UnidadOpcion[] {
  const opciones: UnidadOpcion[] = []

  const base = Number(p.precio_base) || 0
  if (base > 0 && p.unidad_precio_base) {
    const unidad = p.unidad_precio_base as UnidadVenta
    opciones.push({
      unidad,
      precio: base,
      tipo: 'menudeo',
      label: `${UNIDAD_LABEL[unidad]} · menudeo`,
      key: `${unidad}-menudeo`,
    })
  }

  const mayoreo = Number(p.precio_mayoreo) || 0
  if (mayoreo > 0 && p.unidad_precio_mayoreo) {
    const unidad = p.unidad_precio_mayoreo as UnidadVenta
    // Descartar solo si unidad, precio Y tipo ya están incluidos (caso degenerado)
    const yaIncluida = opciones.some(
      (o) => o.unidad === unidad && o.precio === mayoreo && o.tipo === 'menudeo'
    )
    if (!yaIncluida) {
      const pCaja = p.vende_caja && Number(p.piezas_por_caja) > 0 ? Number(p.piezas_por_caja) : 0
      const pBulto = p.vende_bulto && Number(p.piezas_por_bulto) > 0 ? Number(p.piezas_por_bulto) : 0
      const cantidad_default: number | undefined = pCaja || pBulto || undefined
      opciones.push({
        unidad,
        precio: mayoreo,
        tipo: 'mayoreo',
        label: `${UNIDAD_LABEL[unidad]} · mayoreo`,
        key: `${unidad}-mayoreo`,
        cantidad_default,
      })
    }
  }

  return opciones
}
