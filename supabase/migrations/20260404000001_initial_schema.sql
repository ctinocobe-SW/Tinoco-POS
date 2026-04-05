-- ============================================================
-- POS TINOCO — Migración Inicial
-- Fase 0: Schema base según PRD v1.0
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'despachador', 'checador');
CREATE TYPE ticket_estado AS ENUM (
  'borrador',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'devuelto',
  'en_verificacion',
  'verificado',
  'con_incidencias',
  'despachado',
  'facturado',
  'cerrado'
);
CREATE TYPE movimiento_tipo AS ENUM ('entrada', 'salida', 'traspaso', 'merma', 'ajuste');
CREATE TYPE discrepancia_tipo AS ENUM ('faltante', 'sobrante', 'incorrecto', 'danado');
CREATE TYPE almacen_tipo AS ENUM ('bodega', 'sucursal');
CREATE TYPE lista_surtido_estado AS ENUM ('borrador', 'confirmada', 'en_transito', 'entregada', 'cancelada');

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  rol           user_role NOT NULL DEFAULT 'despachador',
  almacen_id    UUID,  -- FK se agrega después
  activo        BOOLEAN NOT NULL DEFAULT true,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: almacenes
-- ============================================================

CREATE TABLE almacenes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          TEXT NOT NULL,
  ubicacion       TEXT,
  tipo            almacen_tipo NOT NULL DEFAULT 'sucursal',
  responsable_id  UUID REFERENCES profiles(id),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK diferida: profiles.almacen_id → almacenes
ALTER TABLE profiles ADD CONSTRAINT profiles_almacen_id_fkey
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id);

-- ============================================================
-- TABLA: proveedores
-- ============================================================

CREATE TABLE proveedores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  razon_social  TEXT,
  rfc           TEXT,
  contacto      TEXT,
  telefono      TEXT,
  email         TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: clientes
-- ============================================================

CREATE TABLE clientes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre              TEXT NOT NULL,
  razon_social        TEXT,
  rfc                 TEXT,
  regimen_fiscal      TEXT,
  codigo_postal       TEXT,
  uso_cfdi            TEXT DEFAULT 'G03',
  telefono            TEXT,
  email               TEXT,
  whatsapp            TEXT,
  credito_habilitado  BOOLEAN NOT NULL DEFAULT false,
  limite_credito      NUMERIC(12,2) DEFAULT 0,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: productos
-- ============================================================

CREATE TABLE productos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                 TEXT NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  categoria           TEXT,
  unidad_medida       TEXT NOT NULL DEFAULT 'PZA',
  peso_kg             NUMERIC(10,4) DEFAULT 0,
  volumen_m3          NUMERIC(10,6) DEFAULT 0,
  precio_base         NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo               NUMERIC(12,2) DEFAULT 0,
  tasa_iva            NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  tasa_ieps           NUMERIC(5,4) NOT NULL DEFAULT 0,
  requiere_caducidad  BOOLEAN NOT NULL DEFAULT false,
  codigo_barras       TEXT,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventario (por producto × almacén)
-- ============================================================

CREATE TABLE inventario (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id      UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  almacen_id       UUID NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
  stock_actual     NUMERIC(12,4) NOT NULL DEFAULT 0,
  stock_minimo     NUMERIC(12,4) NOT NULL DEFAULT 0,
  stock_maximo     NUMERIC(12,4),
  ubicacion_fisica TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, almacen_id)
);

-- ============================================================
-- TABLA: movimientos_inventario
-- ============================================================

CREATE TABLE movimientos_inventario (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id      UUID NOT NULL REFERENCES productos(id),
  almacen_id       UUID NOT NULL REFERENCES almacenes(id),
  tipo             movimiento_tipo NOT NULL,
  cantidad         NUMERIC(12,4) NOT NULL,
  referencia_tipo  TEXT,   -- 'ticket', 'recepcion', 'traspaso', 'ajuste'
  referencia_id    UUID,
  usuario_id       UUID REFERENCES profiles(id),
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: tickets
-- ============================================================

CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio           TEXT NOT NULL UNIQUE,
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  despachador_id  UUID NOT NULL REFERENCES profiles(id),
  checador_id     UUID REFERENCES profiles(id),
  almacen_id      UUID REFERENCES almacenes(id),
  estado          ticket_estado NOT NULL DEFAULT 'borrador',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva             NUMERIC(12,2) NOT NULL DEFAULT 0,
  ieps            NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas           TEXT,
  motivo_rechazo  TEXT,
  aprobado_por    UUID REFERENCES profiles(id),
  aprobado_at     TIMESTAMPTZ,
  verificado_at   TIMESTAMPTZ,
  despachado_at   TIMESTAMPTZ,
  facturado       BOOLEAN NOT NULL DEFAULT false,
  cfdi_uuid       TEXT,
  cfdi_folio      TEXT,
  whatsapp_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Secuencia para folios
CREATE SEQUENCE ticket_folio_seq START 1000;

-- Función + trigger para folio automático
CREATE OR REPLACE FUNCTION generar_folio_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := 'T-' || LPAD(nextval('ticket_folio_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folio_ticket
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generar_folio_ticket();

-- ============================================================
-- TABLA: ticket_items
-- ============================================================

CREATE TABLE ticket_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id           UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  producto_id         UUID NOT NULL REFERENCES productos(id),
  cantidad            NUMERIC(12,4) NOT NULL,
  precio_unitario     NUMERIC(12,2) NOT NULL,
  descuento           NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal            NUMERIC(12,2) NOT NULL,
  verificado          BOOLEAN NOT NULL DEFAULT false,
  discrepancia_tipo   discrepancia_tipo,
  discrepancia_nota   TEXT,
  foto_url            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: recepciones
-- ============================================================

CREATE TABLE recepciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proveedor_id    UUID REFERENCES proveedores(id),
  despachador_id  UUID NOT NULL REFERENCES profiles(id),
  almacen_id      UUID NOT NULL REFERENCES almacenes(id),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  notas           TEXT,
  confirmado      BOOLEAN NOT NULL DEFAULT false,
  confirmado_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: recepcion_items
-- ============================================================

CREATE TABLE recepcion_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recepcion_id        UUID NOT NULL REFERENCES recepciones(id) ON DELETE CASCADE,
  producto_id         UUID NOT NULL REFERENCES productos(id),
  cantidad_esperada   NUMERIC(12,4),
  cantidad_recibida   NUMERIC(12,4) NOT NULL DEFAULT 0,
  fecha_caducidad     DATE,
  discrepancia        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: vehiculos
-- ============================================================

CREATE TABLE vehiculos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          TEXT NOT NULL,
  placa           TEXT,
  capacidad_kg    NUMERIC(10,2) NOT NULL,
  capacidad_m3    NUMERIC(10,4),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: listas_surtido
-- ============================================================

CREATE TABLE listas_surtido (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  almacen_destino_id  UUID NOT NULL REFERENCES almacenes(id),
  almacen_origen_id   UUID REFERENCES almacenes(id),
  creado_por          UUID NOT NULL REFERENCES profiles(id),
  estado              lista_surtido_estado NOT NULL DEFAULT 'borrador',
  peso_total_kg       NUMERIC(10,2) NOT NULL DEFAULT 0,
  vehiculo_id         UUID REFERENCES vehiculos(id),
  numero_viajes       INTEGER DEFAULT 1,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: lista_surtido_items
-- ============================================================

CREATE TABLE lista_surtido_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id         UUID NOT NULL REFERENCES listas_surtido(id) ON DELETE CASCADE,
  producto_id      UUID NOT NULL REFERENCES productos(id),
  cantidad         NUMERIC(12,4) NOT NULL,
  peso_parcial_kg  NUMERIC(10,4) NOT NULL DEFAULT 0,
  viaje_numero     INTEGER NOT NULL DEFAULT 1,
  entregado        BOOLEAN NOT NULL DEFAULT false,
  entregado_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   UUID REFERENCES profiles(id),
  accion       TEXT NOT NULL,
  entidad      TEXT NOT NULL,
  entidad_id   UUID,
  datos_antes  JSONB,
  datos_despues JSONB,
  ip           INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_cliente ON tickets(cliente_id);
CREATE INDEX idx_tickets_despachador ON tickets(despachador_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_ticket_items_ticket ON ticket_items(ticket_id);
CREATE INDEX idx_inventario_producto ON inventario(producto_id);
CREATE INDEX idx_inventario_almacen ON inventario(almacen_id);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_almacen ON movimientos_inventario(almacen_id);
CREATE INDEX idx_movimientos_created_at ON movimientos_inventario(created_at DESC);
CREATE INDEX idx_recepcion_items_caducidad ON recepcion_items(fecha_caducidad) WHERE fecha_caducidad IS NOT NULL;
CREATE INDEX idx_productos_sku ON productos(sku);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX idx_clientes_rfc ON clientes(rfc) WHERE rfc IS NOT NULL;
CREATE INDEX idx_audit_logs_entidad ON audit_logs(entidad, entidad_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_surtido ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: cada usuario ve su propio perfil; admins ven todos
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Tickets: despachador ve sus tickets; checador ve aprobados+; admin ve todos
CREATE POLICY "tickets_select" ON tickets
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR despachador_id = auth.uid()
    OR (get_user_role() = 'checador' AND estado IN ('aprobado', 'en_verificacion', 'verificado', 'con_incidencias'))
  );

CREATE POLICY "tickets_insert_despachador" ON tickets
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'despachador')
    AND despachador_id = auth.uid()
  );

CREATE POLICY "tickets_update" ON tickets
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'despachador' AND despachador_id = auth.uid() AND estado IN ('borrador', 'devuelto'))
    OR (get_user_role() = 'checador' AND estado IN ('aprobado', 'en_verificacion'))
  );

-- Inventario: lectura para todos autenticados; escritura solo admin/despachador
CREATE POLICY "inventario_select" ON inventario
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventario_write" ON inventario
  FOR ALL USING (get_user_role() IN ('admin', 'despachador'));

-- Audit logs: solo admins
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventario_updated_at BEFORE UPDATE ON inventario FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listas_surtido_updated_at BEFORE UPDATE ON listas_surtido FOR EACH ROW EXECUTE FUNCTION update_updated_at();
