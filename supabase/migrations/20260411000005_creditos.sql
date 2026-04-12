-- ─── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE credito_estado AS ENUM ('vigente', 'vencido', 'liquidado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE metodo_pago_credito AS ENUM ('efectivo', 'transferencia', 'cheque', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tabla: creditos ──────────────────────────────────────────────────────────
CREATE TABLE creditos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid NOT NULL REFERENCES clientes(id),
  ticket_id          uuid REFERENCES tickets(id),
  monto_original     numeric(12,2) NOT NULL CHECK (monto_original > 0),
  saldo              numeric(12,2) NOT NULL CHECK (saldo >= 0),
  fecha_otorgamiento date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento  date NOT NULL,
  plazo_dias         int  NOT NULL CHECK (plazo_dias > 0),
  tasa_mora_pct      numeric(5,4) NOT NULL DEFAULT 0,
  estado             credito_estado NOT NULL DEFAULT 'vigente',
  aval_nombre        text,
  lugar_expedicion   text NOT NULL DEFAULT 'México',
  notas              text,
  otorgado_por       uuid REFERENCES profiles(id),
  created_at         timestamptz DEFAULT now()
);

-- ─── Tabla: abonos_credito ────────────────────────────────────────────────────
CREATE TABLE abonos_credito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id     uuid NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  monto          numeric(12,2) NOT NULL CHECK (monto > 0),
  fecha          date NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago    metodo_pago_credito NOT NULL DEFAULT 'efectivo',
  referencia     text,
  notas          text,
  registrado_por uuid REFERENCES profiles(id),
  created_at     timestamptz DEFAULT now()
);

-- ─── Columnas nuevas en tickets ────────────────────────────────────────────────
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS es_credito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credito_id uuid REFERENCES creditos(id);

-- limite_credito y credito_habilitado ya existen en clientes — sin cambios

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_credito ENABLE ROW LEVEL SECURITY;

-- Solo admin gestiona créditos
CREATE POLICY "creditos_select" ON creditos
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "creditos_insert" ON creditos
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "creditos_update" ON creditos
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "abonos_select" ON abonos_credito
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "abonos_insert" ON abonos_credito
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_creditos_cliente  ON creditos(cliente_id);
CREATE INDEX idx_creditos_estado   ON creditos(estado);
CREATE INDEX idx_creditos_venc     ON creditos(fecha_vencimiento) WHERE estado IN ('vigente', 'vencido');
CREATE INDEX idx_abonos_credito_id ON abonos_credito(credito_id);
