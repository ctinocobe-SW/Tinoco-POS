CREATE TABLE listas_almacen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  notas text,
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'finalizada')),
  creado_por uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE lista_almacen_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id uuid REFERENCES listas_almacen(id) ON DELETE CASCADE NOT NULL,
  producto_id uuid REFERENCES productos(id) NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1,
  notas text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listas_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_almacen_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listas_almacen_select" ON listas_almacen FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "listas_almacen_insert" ON listas_almacen FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'despachador'));
CREATE POLICY "listas_almacen_update" ON listas_almacen FOR UPDATE USING (get_user_role() IN ('admin', 'despachador'));

CREATE POLICY "lista_almacen_items_select" ON lista_almacen_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lista_almacen_items_insert" ON lista_almacen_items FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'despachador'));
CREATE POLICY "lista_almacen_items_delete" ON lista_almacen_items FOR DELETE USING (get_user_role() IN ('admin', 'despachador'));
