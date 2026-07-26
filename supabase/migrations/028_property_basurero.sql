-- ============================================================
-- PropSync Migration 028 — 'basurero' publication state
-- Run this in Supabase → SQL Editor
-- ============================================================
-- Adds a 4th estado_publicacion value: 'basurero' (descartada). These are
-- discarded listings — hidden from the normal Propiedades tabs and only shown
-- behind the "Ver basurero" toggle, where they can be reviewed or restored.
-- Nothing is deleted at the DB level; this is a soft discard.

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_estado_publicacion_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_estado_publicacion_check
  CHECK (estado_publicacion IN ('activo', 'destacado', 'inactivo', 'basurero'));
