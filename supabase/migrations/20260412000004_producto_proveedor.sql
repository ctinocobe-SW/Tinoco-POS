-- Relación muchos-a-muchos entre productos y proveedores
CREATE TABLE IF NOT EXISTS producto_proveedor (
  producto_id  uuid NOT NULL REFERENCES productos(id)   ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (producto_id, proveedor_id)
);

CREATE INDEX IF NOT EXISTS idx_pp_proveedor ON producto_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pp_producto  ON producto_proveedor(producto_id);
