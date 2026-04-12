-- ============================================================
-- WHATSAPP BUSINESS API
-- Activar cuando se configure un BSP (Twilio / 360dialog / Meta Cloud API)
-- ============================================================

-- Cola de mensajes entrantes de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Datos del mensaje
  from_number      text NOT NULL,             -- número en formato E.164 (+521234567890)
  display_name     text,                      -- nombre del contacto según WhatsApp
  body             text,                      -- texto del mensaje
  tipo             text NOT NULL DEFAULT 'text'
                     CHECK (tipo IN ('text', 'image', 'audio', 'document', 'location', 'interactive')),
  media_url        text,                      -- URL del archivo adjunto si aplica
  wa_message_id    text UNIQUE,               -- ID único del mensaje en la API de WhatsApp
  wa_timestamp     timestamptz,               -- timestamp según WhatsApp
  -- Payload crudo para no perder datos
  payload_raw      jsonb,
  -- Procesamiento interno
  estado           text NOT NULL DEFAULT 'nuevo'
                     CHECK (estado IN ('nuevo', 'procesando', 'ticket_creado', 'ignorado', 'error')),
  ticket_id        uuid REFERENCES tickets(id),     -- si se creó un ticket a partir del mensaje
  cliente_id       uuid REFERENCES clientes(id),    -- cliente vinculado por número de whatsapp
  notas_procesado  text,                            -- observaciones del procesamiento manual/auto
  procesado_por    uuid REFERENCES profiles(id),
  procesado_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS: solo admin ve los mensajes
ALTER TABLE whatsapp_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_mensajes_admin" ON whatsapp_mensajes
  FOR ALL USING (get_user_role() = 'admin');

-- Índices
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_estado    ON whatsapp_mensajes (estado);
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_from      ON whatsapp_mensajes (from_number);
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_created   ON whatsapp_mensajes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_cliente   ON whatsapp_mensajes (cliente_id) WHERE cliente_id IS NOT NULL;
