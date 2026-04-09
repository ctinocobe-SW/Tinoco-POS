ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_mayoreo numeric NOT NULL DEFAULT 0;
