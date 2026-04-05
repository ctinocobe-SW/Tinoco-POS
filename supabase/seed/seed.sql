-- ============================================================
-- POS TINOCO — Seed de Desarrollo
-- Ejecutar SOLO en entornos locales / staging
-- ============================================================

-- Almacenes de ejemplo
INSERT INTO almacenes (id, nombre, ubicacion, tipo) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bodega Principal', 'Irapuato, Gto.', 'bodega'),
  ('22222222-2222-2222-2222-222222222222', 'Sucursal Norte', 'León, Gto.', 'sucursal'),
  ('33333333-3333-3333-3333-333333333333', 'Sucursal Sur', 'Salamanca, Gto.', 'sucursal');

-- Vehículos de ejemplo
INSERT INTO vehiculos (nombre, placa, capacidad_kg, capacidad_m3) VALUES
  ('Camioneta 1', 'GTO-000-A', 1000, 5.0),
  ('Camioneta 2', 'GTO-000-B', 1500, 7.5),
  ('Camión Pequeño', 'GTO-000-C', 3500, 20.0);

-- Proveedor de ejemplo
INSERT INTO proveedores (nombre, razon_social, rfc, telefono, email) VALUES
  ('Distribuidor ABC', 'Distribuciones ABC S.A. de C.V.', 'DAB960101ABC', '461-100-0000', 'ventas@abc.com');

-- Cliente de ejemplo
INSERT INTO clientes (nombre, razon_social, rfc, regimen_fiscal, codigo_postal, uso_cfdi, whatsapp, credito_habilitado) VALUES
  ('Tienda La Fe', 'Tienda La Fe S.A. de C.V.', 'TFE010101FE1', '601', '36000', 'G03', '4611000001', true),
  ('Super Ahorro', 'Super Ahorro S.R.L.', 'SAH020202AH2', '626', '37000', 'G03', '4771000002', false);
