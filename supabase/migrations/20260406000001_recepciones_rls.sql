-- ============================================================
-- RLS Policies para Recepciones, Recepcion Items y Movimientos
-- ============================================================

-- recepciones: despachador ve las suyas, admin ve todas
CREATE POLICY "recepciones_select" ON recepciones
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR despachador_id = auth.uid()
  );

CREATE POLICY "recepciones_insert" ON recepciones
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'despachador')
    AND despachador_id = auth.uid()
  );

CREATE POLICY "recepciones_update" ON recepciones
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'despachador')
    AND despachador_id = auth.uid()
  );

-- recepcion_items: hereda acceso de la recepcion padre
CREATE POLICY "recepcion_items_select" ON recepcion_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recepciones r
      WHERE r.id = recepcion_id
        AND (r.despachador_id = auth.uid() OR get_user_role() = 'admin')
    )
  );

CREATE POLICY "recepcion_items_insert" ON recepcion_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recepciones r
      WHERE r.id = recepcion_id
        AND r.despachador_id = auth.uid()
    )
  );

-- movimientos_inventario: lectura para todos autenticados, escritura admin/despachador
CREATE POLICY "movimientos_select" ON movimientos_inventario
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "movimientos_insert" ON movimientos_inventario
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'despachador'));
