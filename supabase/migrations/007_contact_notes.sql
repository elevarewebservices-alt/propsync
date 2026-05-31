-- Migration 007 — Immutable contact notes log
-- Mirrors property_notes (002): append-only, no UPDATE/DELETE policies.
-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS contact_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_nombre  TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

-- Agents can read their own company's notes
CREATE POLICY "agents see own company contact notes"
  ON contact_notes FOR SELECT
  USING (company_id = current_company_id());

-- Agents can add notes
CREATE POLICY "agents insert own company contact notes"
  ON contact_notes FOR INSERT
  WITH CHECK (company_id = current_company_id());

-- No UPDATE policy
-- No DELETE policy  ← notes are permanent

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact
  ON contact_notes(contact_id, created_at);

CREATE INDEX IF NOT EXISTS idx_contact_notes_company
  ON contact_notes(company_id);
