-- ================================================================
-- Hallazgos de auditoría #3 y #4
--
-- #3 — Nombrar FK constraints explícitamente para que los joins de
--       PostgREST (profiles!<constraint>) sean estables aunque cambie
--       la convención de nombres de Supabase.
--
-- #4 — Restringir la política UPDATE de Storage para que un checador
--       solo pueda sobrescribir la factura de una recepción que él
--       mismo creó y que aún no esté cerrada/cancelada.
-- ================================================================

-- ── Recepciones FKs ─────────────────────────────────────────
ALTER TABLE recepciones
  RENAME CONSTRAINT recepciones_checador_id_fkey
    TO recepciones_checador_fk;

ALTER TABLE recepciones
  RENAME CONSTRAINT recepciones_despachador_responsable_id_fkey
    TO recepciones_responsable_fk;

ALTER TABLE recepciones
  RENAME CONSTRAINT recepciones_cerrado_por_fkey
    TO recepciones_cierre_fk;

-- ── Tickets FKs ──────────────────────────────────────────────
ALTER TABLE tickets
  RENAME CONSTRAINT tickets_despachador_id_fkey
    TO tickets_despachador_fk;

ALTER TABLE tickets
  RENAME CONSTRAINT tickets_checador_id_fkey
    TO tickets_checador_fk;

-- ── Créditos FKs ─────────────────────────────────────────────
ALTER TABLE creditos
  RENAME CONSTRAINT creditos_otorgado_por_fkey
    TO creditos_otorgado_por_fk;

ALTER TABLE abonos_credito
  RENAME CONSTRAINT abonos_credito_registrado_por_fkey
    TO abonos_credito_registrado_por_fk;

-- ── Storage: restringir UPDATE a propietario de la recepción ─
-- El path en el bucket sigue la estructura:
--   {año}/{mes}/{recepcion_id}/{timestamp}.{ext}
-- split_part(name, '/', 3) extrae el recepcion_id.
DROP POLICY IF EXISTS facturas_prov_update ON storage.objects;

CREATE POLICY facturas_prov_update ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'facturas-proveedores'
    AND (
      get_user_role() = 'admin'
      OR (
        get_user_role() = 'checador'
        AND EXISTS (
          SELECT 1 FROM recepciones r
          WHERE r.id::text = split_part(name, '/', 3)
            AND r.checador_id = auth.uid()
            AND r.estado NOT IN ('cerrada', 'cancelada')
        )
      )
    )
  );
