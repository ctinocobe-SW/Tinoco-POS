-- Agregar campos de verificación a lista_almacen_items
ALTER TABLE lista_almacen_items
  ADD COLUMN IF NOT EXISTS checado      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checado_at   timestamptz,
  ADD COLUMN IF NOT EXISTS checado_por  uuid REFERENCES profiles(id);

-- RLS: checador y admin pueden actualizar items
DROP POLICY IF EXISTS "lista_almacen_items_update" ON lista_almacen_items;
CREATE POLICY "lista_almacen_items_update" ON lista_almacen_items
  FOR UPDATE USING (get_user_role() IN ('admin', 'checador'));

-- RLS: checador puede ver listas
DROP POLICY IF EXISTS "listas_almacen_select" ON listas_almacen;
CREATE POLICY "listas_almacen_select" ON listas_almacen
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lista_almacen_items_select" ON lista_almacen_items;
CREATE POLICY "lista_almacen_items_select" ON lista_almacen_items
  FOR SELECT USING (auth.uid() IS NOT NULL);
