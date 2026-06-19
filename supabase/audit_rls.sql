-- ============================================================================
-- Auditoría y blindaje de RLS (Row Level Security) — multi-tenant
-- Ejecutar en Supabase → SQL Editor
-- ============================================================================
-- Contexto: el servidor de PropSync usa la service_role key, que SIEMPRE
-- ignora RLS. Por eso activar RLS en todas las tablas NO rompe la app
-- (el backend sigue funcionando) y SÍ protege contra accesos directos con
-- la anon/authenticated key. Es defensa en profundidad.
-- ============================================================================


-- ── PASO 1 — AUDITORÍA (solo lectura). Corre esto primero. ──────────────────
-- rls_enabled = false  → tabla SIN protección (hay que activarla)
-- policy_count = 0      → sin políticas (con RLS activo, anon/auth no ven nada;
--                         el server con service_role sí — eso es lo correcto aquí)
SELECT
  t.tablename,
  t.rowsecurity                         AS rls_enabled,
  COALESCE(p.cnt, 0)                     AS policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS cnt
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.rowsecurity ASC, t.tablename;


-- ── PASO 2 — BLINDAJE: activa RLS en toda tabla pública que no lo tenga ──────
-- Seguro de correr: el backend usa service_role (bypassa RLS) y sigue igual.
-- Después de correrlo, vuelve a correr el PASO 1: todas deben quedar en true.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    RAISE NOTICE 'RLS activado en %', r.tablename;
  END LOOP;
END $$;


-- ── PASO 3 (opcional) — Ver el detalle de políticas por tabla ───────────────
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
