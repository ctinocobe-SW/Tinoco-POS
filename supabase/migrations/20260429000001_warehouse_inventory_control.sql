-- ============================================================
-- Control de inventario multi-bodega + borrador automático de surtido
-- ============================================================

-- 1) Asegurar unicidad por nombre y sembrar las 3 ubicaciones reales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'almacenes_nombre_key'
  ) THEN
    ALTER TABLE almacenes ADD CONSTRAINT almacenes_nombre_key UNIQUE (nombre);
  END IF;
END $$;

INSERT INTO almacenes (nombre, tipo) VALUES
  ('Central Vieja', 'bodega'),
  ('Almacén Reyes', 'bodega'),
  ('El Mercader',   'sucursal')
ON CONFLICT (nombre) DO NOTHING;

-- 2) Unidad principal del producto para mínimos / alertas / lectura
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS unidad_inventario_principal text NOT NULL DEFAULT 'pza';

ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS productos_unidad_inventario_principal_chk;

ALTER TABLE productos
  ADD CONSTRAINT productos_unidad_inventario_principal_chk
    CHECK (unidad_inventario_principal IN ('pza','kg','caja','bulto'));

-- 3) Override directo de WhatsApp del proveedor por producto (E.164)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS proveedor_whatsapp text;

-- 4) Preferencias del usuario para generar el borrador de surtido
CREATE TABLE IF NOT EXISTS preferencias_surtido (
  user_id                  uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  top_n                    int  NOT NULL DEFAULT 20 CHECK (top_n BETWEEN 1 AND 200),
  incluir_bajo_minimo      boolean NOT NULL DEFAULT true,
  almacen_destino_default  uuid REFERENCES almacenes(id),
  solo_controla_inventario boolean NOT NULL DEFAULT true,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE preferencias_surtido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preferencias_surtido_self_or_admin" ON preferencias_surtido
  FOR ALL
  USING (user_id = auth.uid() OR get_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');

-- 5) RPC: generar candidatos para el borrador de surtido
-- Estrategia: items bajo mínimo + completar con menor stock hasta top_n
CREATE OR REPLACE FUNCTION generar_borrador_surtido(
  p_destino uuid,
  p_top_n int DEFAULT 20,
  p_incluir_bajo_minimo boolean DEFAULT true,
  p_solo_controla_inventario boolean DEFAULT true
)
RETURNS TABLE (
  producto_id        uuid,
  sku                text,
  nombre             text,
  unidad             text,
  stock_destino      numeric,
  stock_minimo       numeric,
  stock_maximo       numeric,
  cantidad_sugerida  numeric,
  bajo_minimo        boolean
) AS $$
  WITH base AS (
    SELECT
      p.id   AS producto_id,
      p.sku,
      p.nombre,
      p.unidad_inventario_principal AS unidad,
      COALESCE(i.stock_actual, 0)  AS stock_destino,
      COALESCE(i.stock_minimo, 0)  AS stock_minimo,
      i.stock_maximo               AS stock_maximo
    FROM productos p
    LEFT JOIN inventario i
      ON i.producto_id = p.id AND i.almacen_id = p_destino
    WHERE p.activo = true
      AND (NOT p_solo_controla_inventario OR p.controla_inventario = true)
  ),
  scored AS (
    SELECT
      b.*,
      (b.stock_minimo > 0 AND b.stock_destino <= b.stock_minimo) AS bajo_minimo,
      CASE
        WHEN COALESCE(b.stock_maximo, 0) > 0
          THEN b.stock_destino / NULLIF(b.stock_maximo, 0)
        ELSE b.stock_destino
      END AS ratio
    FROM base b
  )
  SELECT
    s.producto_id,
    s.sku,
    s.nombre,
    s.unidad,
    s.stock_destino,
    s.stock_minimo,
    s.stock_maximo,
    GREATEST(COALESCE(s.stock_maximo, s.stock_minimo * 2, 5) - s.stock_destino, 1) AS cantidad_sugerida,
    s.bajo_minimo
  FROM scored s
  WHERE p_incluir_bajo_minimo OR NOT s.bajo_minimo
  ORDER BY s.bajo_minimo DESC, s.ratio ASC, s.stock_destino ASC
  LIMIT GREATEST(p_top_n, 1);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6) RPC: confirmar entrega de la lista de surtido
-- Atómico: para cada item con almacén origen → resta del origen, suma al destino,
-- registra movimientos y marca la lista como entregada.
CREATE OR REPLACE FUNCTION confirmar_entrega_lista_surtido(p_lista_id uuid)
RETURNS void AS $$
DECLARE
  v_lista       listas_surtido%ROWTYPE;
  v_destino     uuid;
  v_user        uuid := auth.uid();
  v_item        RECORD;
  v_origen      uuid;
BEGIN
  SELECT * INTO v_lista FROM listas_surtido WHERE id = p_lista_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista no encontrada';
  END IF;
  IF v_lista.estado NOT IN ('confirmada', 'en_transito', 'borrador') THEN
    RAISE EXCEPTION 'La lista no está en estado entregable (estado=%)', v_lista.estado;
  END IF;

  v_destino := v_lista.almacen_destino_id;

  FOR v_item IN
    SELECT id, producto_id, cantidad, almacen_origen_item_id
    FROM lista_surtido_items
    WHERE lista_id = p_lista_id
  LOOP
    v_origen := COALESCE(v_item.almacen_origen_item_id, v_lista.almacen_origen_id);
    IF v_origen IS NULL THEN
      RAISE EXCEPTION 'El item % no tiene almacén origen asignado', v_item.id;
    END IF;

    -- Salida del origen
    INSERT INTO inventario (producto_id, almacen_id, stock_actual)
    VALUES (v_item.producto_id, v_origen, 0)
    ON CONFLICT (producto_id, almacen_id) DO NOTHING;

    UPDATE inventario
       SET stock_actual = stock_actual - v_item.cantidad,
           updated_at   = now()
     WHERE producto_id = v_item.producto_id AND almacen_id = v_origen;

    INSERT INTO movimientos_inventario (producto_id, almacen_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES (v_item.producto_id, v_origen, 'traspaso', v_item.cantidad, 'lista_surtido', p_lista_id, v_user, 'Salida por entrega de lista de surtido');

    -- Entrada al destino
    INSERT INTO inventario (producto_id, almacen_id, stock_actual)
    VALUES (v_item.producto_id, v_destino, 0)
    ON CONFLICT (producto_id, almacen_id) DO NOTHING;

    UPDATE inventario
       SET stock_actual = stock_actual + v_item.cantidad,
           updated_at   = now()
     WHERE producto_id = v_item.producto_id AND almacen_id = v_destino;

    INSERT INTO movimientos_inventario (producto_id, almacen_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES (v_item.producto_id, v_destino, 'traspaso', v_item.cantidad, 'lista_surtido', p_lista_id, v_user, 'Entrada por entrega de lista de surtido');

    UPDATE lista_surtido_items
       SET entregado = true, entregado_at = now()
     WHERE id = v_item.id;
  END LOOP;

  UPDATE listas_surtido
     SET estado = 'entregada', updated_at = now()
   WHERE id = p_lista_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Permitir override de almacén origen por item (cuando el despachador escoge bodega distinta por producto)
ALTER TABLE lista_surtido_items
  ADD COLUMN IF NOT EXISTS almacen_origen_item_id uuid REFERENCES almacenes(id);

-- 8) Vista: productos en bodegas por debajo del mínimo (alertas a proveedor)
CREATE OR REPLACE VIEW productos_bajo_minimo_bodegas AS
SELECT
  i.id                AS inventario_id,
  i.almacen_id,
  a.nombre            AS almacen_nombre,
  i.producto_id,
  p.sku,
  p.nombre            AS producto_nombre,
  p.unidad_inventario_principal AS unidad,
  i.stock_actual,
  i.stock_minimo,
  p.proveedor_whatsapp,
  pp.proveedor_id,
  prov.nombre         AS proveedor_nombre,
  prov.telefono       AS proveedor_telefono
FROM inventario i
JOIN almacenes a ON a.id = i.almacen_id AND a.tipo = 'bodega' AND a.activo
JOIN productos p ON p.id = i.producto_id AND p.activo
LEFT JOIN producto_proveedor pp ON pp.producto_id = p.id
LEFT JOIN proveedores prov ON prov.id = pp.proveedor_id
WHERE p.controla_inventario = true
  AND i.stock_minimo > 0
  AND i.stock_actual <= i.stock_minimo;

-- 9) RLS adicional: listas_surtido + lista_surtido_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lista_surtido_items') THEN
    EXECUTE 'ALTER TABLE lista_surtido_items ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY "lista_surtido_items_select" ON lista_surtido_items FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
    EXECUTE $p$CREATE POLICY "lista_surtido_items_write"  ON lista_surtido_items FOR ALL USING (get_user_role() IN ('admin','despachador'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listas_surtido') THEN
    EXECUTE $p$CREATE POLICY "listas_surtido_select" ON listas_surtido FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
    EXECUTE $p$CREATE POLICY "listas_surtido_write"  ON listas_surtido FOR ALL USING (get_user_role() IN ('admin','despachador'))$p$;
  END IF;
END $$;

-- 10) Tabla de salida WhatsApp para auditar avisos a proveedores
CREATE TABLE IF NOT EXISTS whatsapp_outbound (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number    text NOT NULL,
  body         text NOT NULL,
  motivo       text NOT NULL DEFAULT 'reorden',
  producto_id  uuid REFERENCES productos(id),
  almacen_id   uuid REFERENCES almacenes(id),
  proveedor_id uuid REFERENCES proveedores(id),
  enviado_por  uuid REFERENCES profiles(id),
  estado       text NOT NULL DEFAULT 'enviado'
                 CHECK (estado IN ('enviado','fallido','simulado')),
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_outbound ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_outbound_admin_read" ON whatsapp_outbound
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "whatsapp_outbound_admin_write" ON whatsapp_outbound
  FOR INSERT WITH CHECK (get_user_role() = 'admin');
