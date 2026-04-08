-- Habilitar RLS
ALTER TABLE almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- almacenes: lectura para autenticados, escritura solo admin
DROP POLICY IF EXISTS "almacenes_select" ON almacenes;
DROP POLICY IF EXISTS "almacenes_insert" ON almacenes;
DROP POLICY IF EXISTS "almacenes_update" ON almacenes;

CREATE POLICY "almacenes_select" ON almacenes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "almacenes_insert" ON almacenes
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "almacenes_update" ON almacenes
  FOR UPDATE USING (get_user_role() = 'admin');

-- proveedores: lectura para autenticados, escritura solo admin
DROP POLICY IF EXISTS "proveedores_select" ON proveedores;
DROP POLICY IF EXISTS "proveedores_insert" ON proveedores;
DROP POLICY IF EXISTS "proveedores_update" ON proveedores;

CREATE POLICY "proveedores_select" ON proveedores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "proveedores_insert" ON proveedores
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "proveedores_update" ON proveedores
  FOR UPDATE USING (get_user_role() = 'admin');
