-- ============================================================
-- Ajustes de inventario: ventas y verificación de surtido por checador
-- ============================================================

-- 1) Campo de verificación por checador en lista_surtido_items
ALTER TABLE lista_surtido_items
  ADD COLUMN IF NOT EXISTS checado_checador      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checado_checador_at   timestamptz,
  ADD COLUMN IF NOT EXISTS checado_checador_por  uuid REFERENCES profiles(id);

-- 2) Fix RLS: checador puede leer listas_surtido y sus items
--    (las políticas anteriores solo cubrían admin/despachador para write)
DO $$
BEGIN
  -- Eliminar política genérica si existe y crear una que incluya checador para SELECT
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listas_surtido' AND policyname='listas_surtido_select') THEN
    DROP POLICY "listas_surtido_select" ON listas_surtido;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lista_surtido_items' AND policyname='lista_surtido_items_select') THEN
    DROP POLICY "lista_surtido_items_select" ON lista_surtido_items;
  END IF;
END $$;

-- Todos los usuarios autenticados pueden ver listas de surtido
CREATE POLICY "listas_surtido_select_auth" ON listas_surtido
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lista_surtido_items_select_auth" ON lista_surtido_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Checador puede actualizar items (para marcar checado_checador)
CREATE POLICY "lista_surtido_items_checador_update" ON lista_surtido_items
  FOR UPDATE USING (get_user_role() IN ('admin', 'despachador', 'checador'));

-- 3) Corregir RPC: no permitir entrega desde estado 'borrador'
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
  -- Solo permitir en estados donde ya salió la mercancía
  IF v_lista.estado NOT IN ('confirmada', 'en_transito') THEN
    RAISE EXCEPTION 'La lista debe estar confirmada o en_transito para marcarla entregada (estado=%)', v_lista.estado;
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

    -- Salida del origen (bodega)
    INSERT INTO inventario (producto_id, almacen_id, stock_actual)
    VALUES (v_item.producto_id, v_origen, 0)
    ON CONFLICT (producto_id, almacen_id) DO NOTHING;

    UPDATE inventario
       SET stock_actual = stock_actual - v_item.cantidad,
           updated_at   = now()
     WHERE producto_id = v_item.producto_id AND almacen_id = v_origen;

    INSERT INTO movimientos_inventario (producto_id, almacen_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES (v_item.producto_id, v_origen, 'traspaso', v_item.cantidad, 'lista_surtido', p_lista_id, v_user,
            'Salida verificada por checador — lista de surtido');

    -- Entrada al destino (El Mercader)
    INSERT INTO inventario (producto_id, almacen_id, stock_actual)
    VALUES (v_item.producto_id, v_destino, 0)
    ON CONFLICT (producto_id, almacen_id) DO NOTHING;

    UPDATE inventario
       SET stock_actual = stock_actual + v_item.cantidad,
           updated_at   = now()
     WHERE producto_id = v_item.producto_id AND almacen_id = v_destino;

    INSERT INTO movimientos_inventario (producto_id, almacen_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES (v_item.producto_id, v_destino, 'traspaso', v_item.cantidad, 'lista_surtido', p_lista_id, v_user,
            'Entrada verificada por checador — lista de surtido');

    UPDATE lista_surtido_items
       SET entregado = true, entregado_at = now()
     WHERE id = v_item.id;
  END LOOP;

  UPDATE listas_surtido
     SET estado = 'entregada', updated_at = now()
   WHERE id = p_lista_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Función para descontar inventario al despachar un ticket (ventas desde El Mercader)
CREATE OR REPLACE FUNCTION descontar_inventario_ticket(p_ticket_id uuid)
RETURNS void AS $$
DECLARE
  v_ticket      RECORD;
  v_user        uuid := auth.uid();
  v_item        RECORD;
BEGIN
  SELECT t.id, t.almacen_id INTO v_ticket
  FROM tickets t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  IF v_ticket.almacen_id IS NULL THEN
    RETURN; -- Sin almacén configurado, no hay nada que descontar
  END IF;

  FOR v_item IN
    SELECT ti.producto_id, ti.cantidad
    FROM ticket_items ti
    JOIN productos p ON p.id = ti.producto_id
    WHERE ti.ticket_id = p_ticket_id
      AND p.controla_inventario = true
  LOOP
    -- Asegurar que existe registro en inventario
    INSERT INTO inventario (producto_id, almacen_id, stock_actual)
    VALUES (v_item.producto_id, v_ticket.almacen_id, 0)
    ON CONFLICT (producto_id, almacen_id) DO NOTHING;

    -- Descontar
    UPDATE inventario
       SET stock_actual = stock_actual - v_item.cantidad,
           updated_at   = now()
     WHERE producto_id = v_item.producto_id
       AND almacen_id  = v_ticket.almacen_id;

    -- Auditoría
    INSERT INTO movimientos_inventario (
      producto_id, almacen_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas
    ) VALUES (
      v_item.producto_id, v_ticket.almacen_id, 'salida', v_item.cantidad,
      'ticket', p_ticket_id, v_user, 'Venta despachada'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
