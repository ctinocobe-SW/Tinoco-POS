-- Flag por producto para activar/desactivar el control de inventario.
-- Default false: rollout gradual, el admin enciende el control en los productos
-- que quiera empezar a rastrear.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS controla_inventario boolean NOT NULL DEFAULT false;
