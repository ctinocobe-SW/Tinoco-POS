-- Cobro pendiente: flag para tickets cuyo pago aún no ha sido entregado
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS cobro_pendiente boolean NOT NULL DEFAULT false;

-- Índice para consultas rápidas de tickets pendientes de cobro
CREATE INDEX IF NOT EXISTS idx_tickets_cobro_pendiente
  ON tickets (cobro_pendiente) WHERE cobro_pendiente = true;
