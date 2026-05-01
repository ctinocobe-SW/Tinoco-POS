-- ============================================================
-- RECEPCIONES — INTEGRACIÓN CON INVENTARIO
-- Estados: borrador → recibida / con_discrepancias → cerrada / cancelada
-- Inventario se aplica al cerrar (admin)
-- Checador es quien recibe; despachador queda como responsable de acomodar
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE recepcion_estado AS ENUM (
    'borrador',
    'recibida',
    'con_discrepancias',
    'cerrada',
    'cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discrepancia_tipo AS ENUM (
    'faltante',
    'sobrante',
    'danado',
    'devolucion'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabla recepciones: nuevas columnas ──────────────────────
ALTER TABLE recepciones
  ADD COLUMN IF NOT EXISTS estado recepcion_estado NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS checador_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS despachador_responsable_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS folio_factura text,
  ADD COLUMN IF NOT EXISTS monto_factura numeric(12,2),
  ADD COLUMN IF NOT EXISTS fecha_factura date,
  ADD COLUMN IF NOT EXISTS factura_url text,
  ADD COLUMN IF NOT EXISTS recibido_at timestamptz,
  ADD COLUMN IF NOT EXISTS cerrado_por uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cerrado_at timestamptz;

-- Migrar datos existentes:
--   confirmado=true  → estado='cerrada' + cerrado_at + cerrado_por
--   confirmado=false → estado='borrador'
--   despachador_id (creador histórico) → checador_id
UPDATE recepciones
   SET estado     = CASE WHEN confirmado = true THEN 'cerrada'::recepcion_estado
                         ELSE 'borrador'::recepcion_estado END,
       cerrado_at = CASE WHEN confirmado = true THEN confirmado_at ELSE NULL END,
       cerrado_por = CASE WHEN confirmado = true THEN despachador_id ELSE NULL END,
       checador_id = COALESCE(checador_id, despachador_id)
 WHERE checador_id IS NULL OR estado IS NULL;

-- checador_id ahora es obligatorio (siempre hay un creador de la recepción)
ALTER TABLE recepciones
  ALTER COLUMN checador_id SET NOT NULL;

-- Las columnas viejas quedan deprecadas; las dejamos por trazabilidad pero ya no se usan
-- (no las dropeamos para no perder histórico ni romper FKs/políticas viejas)
COMMENT ON COLUMN recepciones.confirmado     IS 'DEPRECADO: usar columna estado';
COMMENT ON COLUMN recepciones.confirmado_at  IS 'DEPRECADO: usar columna cerrado_at';
COMMENT ON COLUMN recepciones.despachador_id IS 'DEPRECADO: usar checador_id (creador) y despachador_responsable_id (acomodador)';

-- ── Tabla recepcion_items: nuevas columnas ──────────────────
ALTER TABLE recepcion_items
  ADD COLUMN IF NOT EXISTS discrepancia_tipo discrepancia_tipo,
  ADD COLUMN IF NOT EXISTS costo_unitario numeric(12,2),
  ADD COLUMN IF NOT EXISTS zona_id uuid REFERENCES zonas(id);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recepciones_estado            ON recepciones (estado);
CREATE INDEX IF NOT EXISTS idx_recepciones_checador          ON recepciones (checador_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_responsable       ON recepciones (despachador_responsable_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_fecha_factura     ON recepciones (fecha_factura);
CREATE INDEX IF NOT EXISTS idx_recepciones_proveedor_fecha   ON recepciones (proveedor_id, fecha_factura);
CREATE INDEX IF NOT EXISTS idx_recepcion_items_discrepancia  ON recepcion_items (discrepancia_tipo)
  WHERE discrepancia_tipo IS NOT NULL;

-- ── RLS: reemplazar políticas viejas ────────────────────────
-- Limpiamos políticas previas para tener control fresco
DROP POLICY IF EXISTS recepciones_select       ON recepciones;
DROP POLICY IF EXISTS recepciones_insert       ON recepciones;
DROP POLICY IF EXISTS recepciones_update       ON recepciones;
DROP POLICY IF EXISTS recepciones_delete       ON recepciones;
DROP POLICY IF EXISTS recepcion_items_select   ON recepcion_items;
DROP POLICY IF EXISTS recepcion_items_insert   ON recepcion_items;
DROP POLICY IF EXISTS recepcion_items_update   ON recepcion_items;
DROP POLICY IF EXISTS recepcion_items_delete   ON recepcion_items;

-- Recepciones: SELECT
-- · admin ve todo
-- · checador ve las suyas y las de su rol en general (cola compartida)
-- · despachador solo ve aquellas donde es responsable
CREATE POLICY recepciones_select ON recepciones
  FOR SELECT USING (
    get_user_role() IN ('admin', 'checador')
    OR (get_user_role() = 'despachador' AND despachador_responsable_id = auth.uid())
  );

-- Recepciones: INSERT
-- · checador o admin pueden crear
-- · checador_id debe ser el propio usuario
CREATE POLICY recepciones_insert ON recepciones
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'checador')
    AND checador_id = auth.uid()
  );

-- Recepciones: UPDATE
-- · admin puede actualizar siempre
-- · checador puede modificar mientras la recepción no esté cerrada/cancelada
CREATE POLICY recepciones_update ON recepciones
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'checador' AND estado NOT IN ('cerrada', 'cancelada'))
  );

-- Recepciones: DELETE — solo admin y solo borradores
CREATE POLICY recepciones_delete ON recepciones
  FOR DELETE USING (
    get_user_role() = 'admin' AND estado = 'borrador'
  );

-- recepcion_items heredan acceso vía recepción padre
CREATE POLICY recepcion_items_select ON recepcion_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recepciones r
       WHERE r.id = recepcion_items.recepcion_id
         AND (
           get_user_role() IN ('admin', 'checador')
           OR (get_user_role() = 'despachador' AND r.despachador_responsable_id = auth.uid())
         )
    )
  );

CREATE POLICY recepcion_items_insert ON recepcion_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recepciones r
       WHERE r.id = recepcion_items.recepcion_id
         AND r.estado NOT IN ('cerrada', 'cancelada')
         AND (
           get_user_role() = 'admin'
           OR (get_user_role() = 'checador' AND r.checador_id = auth.uid())
         )
    )
  );

CREATE POLICY recepcion_items_update ON recepcion_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recepciones r
       WHERE r.id = recepcion_items.recepcion_id
         AND (
           get_user_role() = 'admin'
           OR (get_user_role() = 'checador'
               AND r.estado NOT IN ('cerrada', 'cancelada')
               AND r.checador_id = auth.uid())
         )
    )
  );

CREATE POLICY recepcion_items_delete ON recepcion_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recepciones r
       WHERE r.id = recepcion_items.recepcion_id
         AND r.estado NOT IN ('cerrada', 'cancelada')
         AND (
           get_user_role() = 'admin'
           OR (get_user_role() = 'checador' AND r.checador_id = auth.uid())
         )
    )
  );

-- ── Storage: bucket de facturas de proveedor ────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturas-proveedores', 'facturas-proveedores', false)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas previas (idempotencia)
DROP POLICY IF EXISTS facturas_prov_insert ON storage.objects;
DROP POLICY IF EXISTS facturas_prov_select ON storage.objects;
DROP POLICY IF EXISTS facturas_prov_update ON storage.objects;
DROP POLICY IF EXISTS facturas_prov_delete ON storage.objects;

-- INSERT: checador o admin
CREATE POLICY facturas_prov_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'facturas-proveedores'
    AND get_user_role() IN ('admin', 'checador')
  );

-- SELECT: admin o checador
CREATE POLICY facturas_prov_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'facturas-proveedores'
    AND get_user_role() IN ('admin', 'checador')
  );

-- UPDATE: admin (en caso de re-subir factura corregida) o checador en sus propias recepciones abiertas
CREATE POLICY facturas_prov_update ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'facturas-proveedores'
    AND get_user_role() IN ('admin', 'checador')
  );

-- DELETE: solo admin
CREATE POLICY facturas_prov_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'facturas-proveedores'
    AND get_user_role() = 'admin'
  );
