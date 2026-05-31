-- Migration 002 — Immutable property notes log
-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS property_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_nombre  TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;

-- Agents can read their own company's notes
CREATE POLICY "agents see own company notes"
  ON property_notes FOR SELECT
  USING (company_id = current_company_id());

-- Agents can add notes
CREATE POLICY "agents insert own company notes"
  ON property_notes FOR INSERT
  WITH CHECK (company_id = current_company_id());

-- No UPDATE policy
-- No DELETE policy  ← notes are permanent

CREATE INDEX IF NOT EXISTS idx_property_notes_property
  ON property_notes(property_id, created_at);

CREATE INDEX IF NOT EXISTS idx_property_notes_company
  ON property_notes(company_id);
