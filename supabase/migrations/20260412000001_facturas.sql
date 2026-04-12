-- ============================================================
-- FACTURACIÓN CFDI
-- Activar cuando se contrate un PAC (Facturama / SW Sapiens / Finkok)
-- ============================================================

-- Configuración fiscal del negocio (una sola fila)
CREATE TABLE IF NOT EXISTS configuracion_fiscal (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc                  text NOT NULL,                          -- RFC del emisor (TINOCO)
  razon_social         text NOT NULL,
  regimen_fiscal       text NOT NULL DEFAULT '612',            -- 612 = Personas Físicas con Act. Emp.
  codigo_postal        text NOT NULL,
  lugar_expedicion     text NOT NULL DEFAULT 'México, D.F.',
  -- Datos PAC (se llenan cuando se active el servicio)
  pac_nombre           text,                                   -- 'facturama' | 'sw_sapiens' | 'finkok'
  pac_usuario          text,
  pac_password_enc     text,                                   -- contraseña cifrada, nunca en claro
  pac_ambiente         text NOT NULL DEFAULT 'sandbox',        -- 'sandbox' | 'produccion'
  -- Serie y folio consecutivo
  serie                text NOT NULL DEFAULT 'A',
  folio_actual         integer NOT NULL DEFAULT 1,
  -- Logos y datos adicionales
  logo_url             text,
  domicilio            text,
  telefono             text,
  email_envio          text,                                   -- email desde donde se envían facturas
  -- Control
  activo               boolean NOT NULL DEFAULT false,         -- false hasta que se active el PAC
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Tabla de facturas emitidas (CFDI 4.0)
CREATE TABLE IF NOT EXISTS facturas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id            uuid REFERENCES tickets(id),
  cliente_id           uuid NOT NULL REFERENCES clientes(id),
  -- Datos CFDI
  folio_fiscal         text UNIQUE,                            -- UUID del timbre (SAT)
  serie                text NOT NULL DEFAULT 'A',
  folio                integer,
  fecha_emision        timestamptz,
  fecha_timbrado       timestamptz,
  -- Receptor
  rfc_receptor         text NOT NULL,
  razon_social_receptor text NOT NULL,
  uso_cfdi             text NOT NULL DEFAULT 'G03',            -- G03 = Gastos en general
  regimen_fiscal_receptor text NOT NULL DEFAULT '616',
  codigo_postal_receptor text,
  -- Importes (espejo del ticket para trazabilidad)
  subtotal             numeric(12,2) NOT NULL DEFAULT 0,
  descuento            numeric(12,2) NOT NULL DEFAULT 0,
  iva                  numeric(12,2) NOT NULL DEFAULT 0,
  ieps                 numeric(12,2) NOT NULL DEFAULT 0,
  total                numeric(12,2) NOT NULL DEFAULT 0,
  -- Estado del proceso de timbrado
  estado               text NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'timbrada', 'cancelada', 'error')),
  error_mensaje        text,                                   -- mensaje del PAC si falló
  -- Archivos generados por el PAC
  xml_url              text,                                   -- URL en Supabase Storage
  pdf_url              text,
  cadena_original      text,
  sello_cfd            text,
  sello_sat            text,
  -- Respuesta cruda del PAC (JSON) para auditoría
  pac_respuesta        jsonb,
  -- Cancelación
  cancelada_at         timestamptz,
  motivo_cancelacion   text,
  -- Control
  emitida_por          uuid REFERENCES profiles(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE configuracion_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_config_admin_only" ON configuracion_fiscal
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "facturas_select" ON facturas
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "facturas_insert" ON facturas
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "facturas_update" ON facturas
  FOR UPDATE USING (get_user_role() = 'admin');

-- Índices
CREATE INDEX IF NOT EXISTS idx_facturas_ticket    ON facturas (ticket_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente   ON facturas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado    ON facturas (estado);
CREATE INDEX IF NOT EXISTS idx_facturas_folio_fiscal ON facturas (folio_fiscal) WHERE folio_fiscal IS NOT NULL;

-- Asegurar que tickets.facturado y cfdi_uuid existan (por si la migración inicial no se aplicó)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS facturado       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cfdi_uuid       text,
  ADD COLUMN IF NOT EXISTS cfdi_folio      text,
  ADD COLUMN IF NOT EXISTS whatsapp_enviado boolean NOT NULL DEFAULT false;

-- Fila inicial de configuración fiscal (se actualiza cuando se activa el servicio)
INSERT INTO configuracion_fiscal (rfc, razon_social, regimen_fiscal, codigo_postal, lugar_expedicion, activo)
VALUES ('XAXX010101000', 'TINOCO', '612', '00000', 'México', false)
ON CONFLICT DO NOTHING;
