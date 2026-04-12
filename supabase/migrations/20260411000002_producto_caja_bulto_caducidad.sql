ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS piezas_por_caja  numeric(10,3),
  ADD COLUMN IF NOT EXISTS piezas_por_bulto numeric(10,3),
  ADD COLUMN IF NOT EXISTS fecha_caducidad  date;
