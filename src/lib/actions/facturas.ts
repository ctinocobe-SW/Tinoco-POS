'use server'

/**
 * ============================================================
 * FACTURACIÓN CFDI 4.0
 * ============================================================
 *
 * Estado: STUB — listo para conectar cuando se contrate un PAC.
 *
 * Para activar:
 * 1. Contratar un PAC: Facturama (https://facturama.mx) o SW Sapiens (https://sw.com.mx)
 * 2. Obtener credenciales de API (usuario + password)
 * 3. Subir el CSD (.cer + .key + contraseña) al PAC
 * 4. Actualizar `configuracion_fiscal` con pac_nombre, pac_usuario, pac_password_enc, activo=true
 * 5. Implementar el cuerpo de `timbrarTicket` según la SDK del PAC elegido
 *
 * Campos clave ya modelados en la DB:
 *   tickets.facturado, tickets.cfdi_uuid, tickets.cfdi_folio
 *   facturas.folio_fiscal, facturas.xml_url, facturas.pdf_url, facturas.pac_respuesta
 *   clientes.rfc, clientes.regimen_fiscal, clientes.uso_cfdi, clientes.codigo_postal
 *   configuracion_fiscal (una fila con los datos del emisor y credenciales PAC)
 * ============================================================
 */

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'

// TODO: instalar SDK del PAC elegido, p.ej.:
//   npm install facturama   (para Facturama)
//   npm install sw-sdk      (para SW Sapiens)

export async function timbrarTicket(ticketId: string): Promise<{ data?: { facturaId: string }; error?: string }> {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden emitir facturas' }
  }

  // Verificar configuración fiscal activa
  const { data: config } = await supabase
    .from('configuracion_fiscal')
    .select('activo, pac_nombre, pac_usuario, pac_password_enc, rfc, razon_social, regimen_fiscal, codigo_postal, lugar_expedicion, serie, folio_actual')
    .single()

  if (!config || !(config as any).activo) {
    return { error: 'El servicio de facturación no está configurado. Contacta al administrador del sistema.' }
  }

  // Obtener datos del ticket y cliente
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, folio, total, subtotal, iva, ieps, descuento, facturado, clientes(nombre, razon_social, rfc, regimen_fiscal, uso_cfdi, codigo_postal)')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }
  if ((ticket as any).facturado) return { error: 'Este ticket ya fue facturado' }

  const cliente = (ticket as any).clientes
  if (!cliente?.rfc) return { error: 'El cliente no tiene RFC registrado. Actualiza su perfil antes de facturar.' }

  // ── TODO: Integrar con PAC ──────────────────────────────────
  //
  // Ejemplo con Facturama (descomentar cuando esté listo):
  //
  // const facturama = new Facturama({ user: config.pac_usuario, password: decrypt(config.pac_password_enc) })
  // const cfdiPayload = buildCFDI({ ticket, cliente, config })
  // const response = await facturama.issueCfdi(cfdiPayload)
  //
  // if (response.error) {
  //   await supabase.from('facturas').insert({ ticket_id: ticketId, estado: 'error', error_mensaje: response.error, ...campos })
  //   return { error: response.error }
  // }
  //
  // await supabase.from('facturas').insert({
  //   ticket_id: ticketId,
  //   cliente_id: cliente.id,
  //   folio_fiscal: response.Complement.TaxStamp.Uuid,
  //   xml_url: response.XmlUrl,
  //   pdf_url: response.PdfUrl,
  //   estado: 'timbrada',
  //   pac_respuesta: response,
  //   ...campos
  // })
  //
  // await supabase.from('tickets').update({ facturado: true, cfdi_uuid: response.uuid }).eq('id', ticketId)
  // ──────────────────────────────────────────────────────────────

  // Mientras no esté activo, insertar registro pendiente para pruebas de flujo
  const { data: factura, error: insertError } = await supabase
    .from('facturas')
    .insert({
      ticket_id: ticketId,
      cliente_id: (ticket as any).clientes?.id ?? null,
      rfc_receptor: cliente.rfc,
      razon_social_receptor: cliente.razon_social ?? cliente.nombre,
      uso_cfdi: cliente.uso_cfdi ?? 'G03',
      regimen_fiscal_receptor: cliente.regimen_fiscal ?? '616',
      codigo_postal_receptor: cliente.codigo_postal,
      subtotal: Number((ticket as any).subtotal),
      descuento: Number((ticket as any).descuento),
      iva: Number((ticket as any).iva),
      ieps: Number((ticket as any).ieps),
      total: Number((ticket as any).total),
      estado: 'pendiente',
      emitida_por: profile.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')

  return { data: { facturaId: (factura as any).id } }
}

export async function cancelarFactura(facturaId: string, motivo: string): Promise<{ error?: string }> {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden cancelar facturas' }
  }

  // TODO: llamar al PAC para cancelar el CFDI antes de actualizar la DB
  // const response = await pac.cancelCfdi(folio_fiscal, motivo)

  const { error } = await supabase
    .from('facturas')
    .update({ estado: 'cancelada', cancelada_at: new Date().toISOString(), motivo_cancelacion: motivo })
    .eq('id', facturaId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tickets')
  return {}
}
