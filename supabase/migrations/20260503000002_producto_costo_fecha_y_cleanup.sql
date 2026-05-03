-- ================================================================
-- Hallazgos de auditoría #5 y #6
--
-- #5 — productos.costo se sobreescribía sin verificar si la recepción
--       que se está cerrando es más reciente que el último costo capturado.
--       Se agrega costo_actualizado_at y el RPC solo actualiza si la fecha
--       de la recepción no es anterior al último cambio de costo.
--
-- #6 — No hay impacto DB directo; el borrado del bucket se maneja en el
--       server action. Este bloque es solo documentación de la migración.
-- ================================================================

-- ── #5: columna para rastrear cuándo se actualizó el costo ───
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS costo_actualizado_at timestamptz;

-- Inicializar con updated_at donde haya costo capturado
UPDATE productos
   SET costo_actualizado_at = updated_at
 WHERE costo IS NOT NULL AND costo_actualizado_at IS NULL;

-- ── #5: reemplazar cerrar_recepcion con guardia de fecha ─────
CREATE OR REPLACE FUNCTION cerrar_recepcion(
  p_recepcion_id            uuid,
  p_costos                  jsonb,
  p_actualizar_costo_producto boolean,
  p_cerrado_por             uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol          text;
  v_recepcion    recepciones%ROWTYPE;
  v_item         recepcion_items%ROWTYPE;
  v_costo        numeric;
  v_inv_id       uuid;
  v_stock_actual numeric;
BEGIN
  -- Authorization: only admins may call this function
  SELECT rol INTO v_rol FROM profiles WHERE id = p_cerrado_por;
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo el administrador puede cerrar recepciones';
  END IF;

  -- Lock the row to prevent concurrent closes
  SELECT * INTO v_recepcion
  FROM recepciones
  WHERE id = p_recepcion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recepción no encontrada';
  END IF;

  IF v_recepcion.estado NOT IN ('recibida', 'con_discrepancias') THEN
    RAISE EXCEPTION 'Solo se pueden cerrar recepciones recibidas por el checador';
  END IF;

  -- Validate that every item has a cost entry
  IF EXISTS (
    SELECT 1
    FROM recepcion_items ri
    WHERE ri.recepcion_id = p_recepcion_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_costos) elem
        WHERE (elem->>'item_id')::uuid = ri.id
      )
  ) THEN
    RAISE EXCEPTION 'Faltan costos para uno o más productos';
  END IF;

  FOR v_item IN
    SELECT * FROM recepcion_items WHERE recepcion_id = p_recepcion_id
  LOOP
    SELECT (elem->>'costo_unitario')::numeric INTO v_costo
    FROM jsonb_array_elements(p_costos) elem
    WHERE (elem->>'item_id')::uuid = v_item.id
    LIMIT 1;

    IF v_costo IS NULL THEN
      RAISE EXCEPTION 'Costo nulo para item %', v_item.id;
    END IF;

    UPDATE recepcion_items
    SET costo_unitario = v_costo
    WHERE id = v_item.id;

    CONTINUE WHEN v_item.cantidad_recibida <= 0;

    -- Upsert inventario BEFORE inserting the movement record
    SELECT id, stock_actual INTO v_inv_id, v_stock_actual
    FROM inventario
    WHERE producto_id = v_item.producto_id
      AND almacen_id  = v_recepcion.almacen_id;

    IF FOUND THEN
      UPDATE inventario
      SET stock_actual = v_stock_actual + v_item.cantidad_recibida
      WHERE id = v_inv_id;
    ELSE
      INSERT INTO inventario (id, producto_id, almacen_id, stock_actual, stock_minimo)
      VALUES (gen_random_uuid(), v_item.producto_id, v_recepcion.almacen_id, v_item.cantidad_recibida, 0);
    END IF;

    INSERT INTO movimientos_inventario (
      id, producto_id, almacen_id, tipo, cantidad,
      referencia_tipo, referencia_id, usuario_id, notas
    ) VALUES (
      gen_random_uuid(), v_item.producto_id, v_recepcion.almacen_id,
      'entrada', v_item.cantidad_recibida, 'recepcion', p_recepcion_id, p_cerrado_por, NULL
    );

    -- #5 FIX: solo actualizar costo si esta recepción es igual o más reciente
    -- que el último cambio de costo del producto.
    IF p_actualizar_costo_producto AND v_costo > 0 THEN
      UPDATE productos
      SET
        costo               = v_costo,
        costo_actualizado_at = now(),
        updated_at          = now()
      WHERE id = v_item.producto_id
        AND (
          costo_actualizado_at IS NULL
          OR v_recepcion.fecha >= costo_actualizado_at::date
        );
    END IF;
  END LOOP;

  UPDATE recepciones
  SET
    estado        = 'cerrada',
    cerrado_at    = now(),
    cerrado_por   = p_cerrado_por,
    confirmado    = true,
    confirmado_at = now()
  WHERE id = p_recepcion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cerrar_recepcion(uuid, jsonb, boolean, uuid) TO authenticated;
