-- ============================================================
-- PropSync Migration 027 — Cierres pipeline (closing process)
-- Run this in Supabase → SQL Editor
-- ============================================================
-- Adds a 4th default pipeline tracking the post-sale closing/paperwork
-- process, separate from the lead-qualification funnel ("Posibles
-- clientes"). A contact moves here once a deal is won.

INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Cierres', 'cierres', '#22c55e', 3 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;

INSERT INTO crm_stages (company_id, nombre, slug, color, position, is_terminal, pipeline_id)
SELECT
  c.id,
  s.nombre,
  s.slug,
  s.color,
  s.pos,
  s.terminal,
  p.id
FROM companies c
JOIN pipelines p ON p.company_id = c.id AND p.slug = 'cierres'
CROSS JOIN (VALUES
  ('Cierre Iniciado',   'cierre_iniciado',  '#3b82f6', 0, false),
  ('Documentación',     'documentacion',    '#f59e0b', 1, false),
  ('Firma de Escritura','firma_escritura',  '#8b5cf6', 2, false),
  ('Entregado',         'entregado',        '#22c55e', 3, true)
) AS s(nombre, slug, color, pos, terminal)
ON CONFLICT (company_id, slug) DO NOTHING;
