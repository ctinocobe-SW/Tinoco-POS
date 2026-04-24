-- Declarar a qué unidad corresponde cada precio del producto.
-- precio_base queda limitado a menudeo (pza|kg); precio_mayoreo admite además caja|bulto.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS unidad_precio_base    text,
  ADD COLUMN IF NOT EXISTS unidad_precio_mayoreo text;

-- Backfill con un default razonable según los flags vende_* existentes.
UPDATE productos SET unidad_precio_base = CASE
    WHEN vende_pza THEN 'pza'
    WHEN vende_kg  THEN 'kg'
    ELSE NULL
  END
WHERE unidad_precio_base IS NULL;

UPDATE productos SET unidad_precio_mayoreo = CASE
    WHEN vende_bulto THEN 'bulto'
    WHEN vende_caja  THEN 'caja'
    WHEN vende_kg    THEN 'kg'
    WHEN vende_pza   THEN 'pza'
    ELSE NULL
  END
WHERE unidad_precio_mayoreo IS NULL;

ALTER TABLE productos
  ADD CONSTRAINT productos_unidad_precio_base_chk
    CHECK (unidad_precio_base    IS NULL OR unidad_precio_base    IN ('pza','kg')),
  ADD CONSTRAINT productos_unidad_precio_mayoreo_chk
    CHECK (unidad_precio_mayoreo IS NULL OR unidad_precio_mayoreo IN ('pza','kg','caja','bulto'));

-- Unidad concreta vendida en la línea del ticket.
ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS unidad text;

ALTER TABLE ticket_items
  ADD CONSTRAINT ticket_items_unidad_chk
    CHECK (unidad IS NULL OR unidad IN ('pza','kg','caja','bulto'));
