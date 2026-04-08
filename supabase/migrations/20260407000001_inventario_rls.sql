-- Habilitar RLS en tablas de inventario (si no está habilitado)
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- inventario
DROP POLICY IF EXISTS "inventario_select" ON inventario;
DROP POLICY IF EXISTS "inventario_insert" ON inventario;
DROP POLICY IF EXISTS "inventario_update" ON inventario;

CREATE POLICY "inventario_select" ON inventario
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventario_insert" ON inventario
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'despachador'));

CREATE POLICY "inventario_update" ON inventario
  FOR UPDATE USING (get_user_role() IN ('admin', 'despachador'));

-- movimientos_inventario
DROP POLICY IF EXISTS "movimientos_inventario_select" ON movimientos_inventario;
DROP POLICY IF EXISTS "movimientos_inventario_insert" ON movimientos_inventario;

CREATE POLICY "movimientos_inventario_select" ON movimientos_inventario
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "movimientos_inventario_insert" ON movimientos_inventario
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'despachador'));
