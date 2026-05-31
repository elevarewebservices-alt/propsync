-- Migration 001 — Replace estado with estado_publicacion + disponibilidad
-- Run in Supabase → SQL Editor

ALTER TABLE properties
  DROP COLUMN IF EXISTS estado;

DROP TYPE IF EXISTS property_estado;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS estado_publicacion TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado_publicacion IN ('activo', 'destacado', 'inactivo')),
  ADD COLUMN IF NOT EXISTS disponibilidad TEXT NOT NULL DEFAULT 'disponible'
    CHECK (disponibilidad IN ('disponible', 'vendido', 'alquilado'));

DROP INDEX IF EXISTS idx_properties_estado;

CREATE INDEX IF NOT EXISTS idx_properties_estado_pub
  ON properties(company_id, estado_publicacion);

CREATE INDEX IF NOT EXISTS idx_properties_disponibilidad
  ON properties(company_id, disponibilidad);
