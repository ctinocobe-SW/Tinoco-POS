-- Agrega referencia opcional al almacén (bodega) destino de la lista
ALTER TABLE listas_almacen
  ADD COLUMN IF NOT EXISTS almacen_id uuid REFERENCES almacenes(id);
