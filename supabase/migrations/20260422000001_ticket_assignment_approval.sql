-- Permitir a admins insertar tickets asignados a cualquier despachador activo.
-- Antes la política requería despachador_id = auth.uid() para todos.
DROP POLICY IF EXISTS "tickets_insert_despachador" ON tickets;

CREATE POLICY "tickets_insert_despachador" ON tickets
  FOR INSERT WITH CHECK (
    (
      get_user_role() = 'admin'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = despachador_id
          AND p.rol = 'despachador'
          AND p.activo = true
      )
    )
    OR (
      get_user_role() = 'despachador'
      AND despachador_id = auth.uid()
    )
  );

-- RPC: devuelve el despachador con menor carga de trabajo.
-- Carga = suma de ticket_items.cantidad en tickets activos (no terminales).
CREATE OR REPLACE FUNCTION get_despachador_menos_cargado()
RETURNS TABLE (id UUID, nombre TEXT, carga NUMERIC) AS $$
  WITH activos AS (
    SELECT p.id, p.nombre
    FROM profiles p
    WHERE p.rol = 'despachador' AND p.activo = true
  ),
  cargas AS (
    SELECT
      a.id,
      a.nombre,
      COALESCE(SUM(ti.cantidad), 0)::NUMERIC AS carga_cantidad,
      COUNT(DISTINCT t.id) AS tickets_activos
    FROM activos a
    LEFT JOIN tickets t
      ON t.despachador_id = a.id
     AND t.estado IN (
       'pendiente_aprobacion', 'aprobado', 'en_verificacion',
       'verificado', 'con_incidencias'
     )
    LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
    GROUP BY a.id, a.nombre
  )
  SELECT id, nombre, carga_cantidad
  FROM cargas
  ORDER BY carga_cantidad ASC, tickets_activos ASC, nombre ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION get_despachador_menos_cargado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_despachador_menos_cargado() TO authenticated;
