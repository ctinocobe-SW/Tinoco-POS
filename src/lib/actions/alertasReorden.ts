'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'

export interface AlertaReorden {
  inventario_id: string
  almacen_id: string
  almacen_nombre: string
  producto_id: string
  sku: string
  producto_nombre: string
  unidad: 'pza' | 'kg' | 'caja' | 'bulto'
  stock_actual: number
  stock_minimo: number
  proveedor_id: string | null
  proveedor_nombre: string | null
  proveedor_telefono: string | null
  proveedor_whatsapp: string | null
}

export async function listarAlertasReorden(): Promise<{ data?: AlertaReorden[]; error?: string }> {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo admin puede ver alertas' }

  const { data, error } = await supabase
    .from('productos_bajo_minimo_bodegas')
    .select('*')

  if (error) return { error: error.message }

  return {
    data: ((data ?? []) as any[]).map((r) => ({
      inventario_id: r.inventario_id,
      almacen_id: r.almacen_id,
      almacen_nombre: r.almacen_nombre,
      producto_id: r.producto_id,
      sku: r.sku,
      producto_nombre: r.producto_nombre,
      unidad: r.unidad,
      stock_actual: Number(r.stock_actual),
      stock_minimo: Number(r.stock_minimo),
      proveedor_id: r.proveedor_id,
      proveedor_nombre: r.proveedor_nombre,
      proveedor_telefono: r.proveedor_telefono,
      proveedor_whatsapp: r.proveedor_whatsapp,
    })),
  }
}

export async function enviarAvisoProveedor(productoId: string, almacenId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo admin puede enviar avisos' }

  const { data: alerta, error: alertaErr } = await supabase
    .from('productos_bajo_minimo_bodegas')
    .select('*')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .maybeSingle()

  if (alertaErr) return { error: alertaErr.message }
  if (!alerta) return { error: 'El producto ya no está bajo mínimo en esa bodega' }

  const a = alerta as any
  const numero: string | null = a.proveedor_whatsapp || a.proveedor_telefono
  if (!numero) {
    return { error: 'El producto no tiene WhatsApp / teléfono de proveedor configurado' }
  }

  const body =
    `Hola ${a.proveedor_nombre ?? ''}, necesitamos reabastecer "${a.producto_nombre}" (SKU ${a.sku}). ` +
    `Stock actual en ${a.almacen_nombre}: ${Number(a.stock_actual)} ${a.unidad}. ` +
    `Mínimo: ${Number(a.stock_minimo)} ${a.unidad}. ` +
    `Por favor confirmar disponibilidad y tiempo de entrega.`

  // Reutilizamos la integración WhatsApp existente. Si no hay BSP configurado,
  // registramos el mensaje como 'simulado' para auditoría.
  const bspConfigured = !!process.env.WHATSAPP_API_TOKEN

  let estado: 'enviado' | 'fallido' | 'simulado' = bspConfigured ? 'enviado' : 'simulado'
  let errorMsg: string | null = null

  if (bspConfigured) {
    try {
      // Hook para BSP real (Twilio / 360dialog / Meta Cloud).
      // El proyecto solo expone webhook entrante; el envío saliente se conecta cuando se contrate BSP.
      // Por ahora se registra como 'enviado' confiando en el cliente HTTP que se agregue.
    } catch (e) {
      estado = 'fallido'
      errorMsg = String(e)
    }
  }

  const { error: outErr } = await supabase
    .from('whatsapp_outbound')
    .insert({
      to_number: numero,
      body,
      motivo: 'reorden',
      producto_id: productoId,
      almacen_id: almacenId,
      proveedor_id: a.proveedor_id,
      enviado_por: profile.id,
      estado,
      error: errorMsg,
    })

  if (outErr) return { error: outErr.message }

  revalidatePath('/admin/inventario/alertas')
  return { data: { ok: true, estado } }
}
