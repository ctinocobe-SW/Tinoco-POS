-- Atomic close-reception RPC
-- Fixes:
--   Critical 1: entire close runs inside one implicit PL/pgSQL transaction
--   Critical 2: inventario is upserted BEFORE inserting movimientos_inventario
--
-- The function is SECURITY DEFINER so it can update all tables atomically.
-- Authorization (admin-only) is enforced inside the function via get_user_role().

CREATE OR REPLACE FUNCTION cerrar_recepcion(
  p_recepcion_id            uuid,
  p_costos                  jsonb,     -- [{"item_id":"<uuid>","costo_unitario":0.00}, ...]
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

  -- Validate that every item has a cost entry in the JSON input
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

  -- Process each item
  FOR v_item IN
    SELECT * FROM recepcion_items WHERE recepcion_id = p_recepcion_id
  LOOP
    -- Resolve cost for this item
    SELECT (elem->>'costo_unitario')::numeric INTO v_costo
    FROM jsonb_array_elements(p_costos) elem
    WHERE (elem->>'item_id')::uuid = v_item.id
    LIMIT 1;

    IF v_costo IS NULL THEN
      RAISE EXCEPTION 'Costo nulo para item %', v_item.id;
    END IF;

    -- 1) Persist unit cost on the reception item
    UPDATE recepcion_items
    SET costo_unitario = v_costo
    WHERE id = v_item.id;

    -- Skip inventory ops when nothing was received
    CONTINUE WHEN v_item.cantidad_recibida <= 0;

    -- 2) CRITICAL 2 FIX: upsert inventario BEFORE inserting the movement record
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
      VALUES (
        gen_random_uuid(),
        v_item.producto_id,
        v_recepcion.almacen_id,
        v_item.cantidad_recibida,
        0
      );
    END IF;

    -- 3) Insert movement record now that stock is confirmed updated
    INSERT INTO movimientos_inventario (
      id, producto_id, almacen_id, tipo, cantidad,
      referencia_tipo, referencia_id, usuario_id, notas
    ) VALUES (
      gen_random_uuid(),
      v_item.producto_id,
      v_recepcion.almacen_id,
      'entrada',
      v_item.cantidad_recibida,
      'recepcion',
      p_recepcion_id,
      p_cerrado_por,
      NULL
    );

    -- 4) Optionally update the product's last known cost
    IF p_actualizar_costo_producto AND v_costo > 0 THEN
      UPDATE productos
      SET costo = v_costo, updated_at = now()
      WHERE id = v_item.producto_id;
    END IF;
  END LOOP;

  -- 5) Mark reception as closed (all-or-nothing with everything above)
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

-- Allow authenticated users to invoke the function
-- (role check inside the function enforces admin-only)
GRANT EXECUTE ON FUNCTION cerrar_recepcion(uuid, jsonb, boolean, uuid) TO authenticated;
