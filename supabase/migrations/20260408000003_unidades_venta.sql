ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS vende_pza     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vende_kg      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vende_caja    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vende_bulto   boolean NOT NULL DEFAULT false;
