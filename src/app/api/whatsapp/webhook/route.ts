/**
 * ============================================================
 * WEBHOOK WHATSAPP BUSINESS API
 * ============================================================
 *
 * Estado: STUB — listo para conectar cuando se configure el BSP.
 *
 * Para activar:
 * 1. Crear una app en Meta for Developers (developers.facebook.com)
 * 2. Activar WhatsApp Business API (Cloud API es gratuita hasta 1,000 conv/mes)
 * 3. Elegir BSP si se quiere soporte adicional: Twilio, 360dialog, etc.
 * 4. Configurar en Meta el Webhook URL: https://tu-dominio.vercel.app/api/whatsapp/webhook
 * 5. Agregar en Vercel las variables de entorno:
 *      WHATSAPP_VERIFY_TOKEN  (token inventado por ti para la verificación)
 *      WHATSAPP_API_TOKEN     (Bearer token de la Cloud API de Meta)
 *      WHATSAPP_PHONE_ID      (ID del número de teléfono de WhatsApp Business)
 * 6. Implementar parseMensaje() y activar la lógica de guardado en supabase
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — verificación del webhook (Meta llama esto una sola vez al configurar)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (!verifyToken) {
    // Servicio no configurado — devolver 404 limpio
    return new NextResponse('WhatsApp webhook not configured', { status: 404 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp] Webhook verificado correctamente')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST — mensajes entrantes de WhatsApp
export async function POST(req: NextRequest) {
  // Validar que el servicio esté habilitado
  if (!process.env.WHATSAPP_API_TOKEN) {
    return NextResponse.json({ status: 'not_configured' }, { status: 200 })
    // Devolvemos 200 siempre para que Meta no reintente indefinidamente
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // TODO: validar firma X-Hub-Signature-256 de Meta para seguridad
  // const signature = req.headers.get('x-hub-signature-256')
  // if (!validateSignature(body, signature, process.env.WHATSAPP_APP_SECRET)) { return 403 }

  try {
    const mensajes = parseMensajes(body)

    if (mensajes.length === 0) {
      // Puede ser un evento de estado (delivered, read) — ignorar por ahora
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const supabase = await createClient()

    for (const msg of mensajes) {
      // Buscar cliente vinculado por número de whatsapp
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', msg.from_number)
        .single()

      await supabase.from('whatsapp_mensajes').insert({
        from_number:   msg.from_number,
        display_name:  msg.display_name,
        body:          msg.body,
        tipo:          msg.tipo,
        media_url:     msg.media_url ?? null,
        wa_message_id: msg.wa_message_id,
        wa_timestamp:  msg.wa_timestamp,
        payload_raw:   msg.payload_raw as Record<string, unknown>,
        estado:        'nuevo',
        cliente_id:    cliente?.id ?? null,
      })
    }

    // TODO: Notificar en tiempo real al admin (supabase realtime ya lo cubre por la tabla)
    // TODO: Auto-crear ticket si el mensaje coincide con un patrón de pedido conocido

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('[WhatsApp] Error procesando webhook:', err)
    // Devolver 200 para que Meta no reintente — loguear internamente
    return NextResponse.json({ status: 'error_logged' }, { status: 200 })
  }
}

// ── Helpers ────────────────────────────────────────────────

interface MensajeParsed {
  from_number:   string
  display_name:  string | null
  body:          string | null
  tipo:          'text' | 'image' | 'audio' | 'document' | 'location' | 'interactive'
  media_url:     string | null
  wa_message_id: string
  wa_timestamp:  string | null
  payload_raw:   unknown
}

/**
 * Extrae los mensajes del payload de Cloud API de Meta.
 * Estructura: body.entry[].changes[].value.messages[]
 */
function parseMensajes(payload: Record<string, unknown>): MensajeParsed[] {
  const results: MensajeParsed[] = []

  const entries = (payload.entry as any[]) ?? []
  for (const entry of entries) {
    const changes = (entry.changes as any[]) ?? []
    for (const change of changes) {
      const value    = change.value ?? {}
      const messages = (value.messages as any[]) ?? []
      const contacts = (value.contacts as any[]) ?? []

      for (const msg of messages) {
        const contact = contacts.find((c: any) => c.wa_id === msg.from)

        const tipo: MensajeParsed['tipo'] =
          ['text', 'image', 'audio', 'document', 'location', 'interactive'].includes(msg.type)
            ? msg.type
            : 'text'

        results.push({
          from_number:   `+${msg.from}`,
          display_name:  contact?.profile?.name ?? null,
          body:          msg.text?.body ?? msg.caption ?? null,
          tipo,
          media_url:     msg.image?.id ?? msg.audio?.id ?? msg.document?.id ?? null,
          wa_message_id: msg.id,
          wa_timestamp:  msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : null,
          payload_raw:   msg,
        })
      }
    }
  }

  return results
}
