-- ============================================================
-- 1. Agregar estado 'cancelado' al enum ticket_estado
-- ============================================================
ALTER TYPE ticket_estado ADD VALUE IF NOT EXISTS 'cancelado';

-- ============================================================
-- 2. Habilitar Realtime en la tabla tickets
--    Permite que las suscripciones postgres_changes reciban
--    eventos INSERT / UPDATE / DELETE en tiempo real.
-- ============================================================
ALTER TABLE tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
