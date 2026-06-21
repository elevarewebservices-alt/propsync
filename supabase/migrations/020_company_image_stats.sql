-- ============================================================================
-- Estadística de imágenes por empresa — para el panel de Elevare
-- Cuenta cuántas imágenes (gallery_urls) tiene cada empresa, calculado EN LA
-- BASE (no jala las URLs a la app), así escala a cientos de miles de props.
-- ============================================================================
CREATE OR REPLACE FUNCTION company_image_stats()
RETURNS TABLE (company_id uuid, image_count bigint, property_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    company_id,
    COALESCE(SUM(
      CASE WHEN jsonb_typeof(gallery_urls) = 'array'
           THEN jsonb_array_length(gallery_urls)
           ELSE 0 END
    ), 0) AS image_count,
    COUNT(*) AS property_count
  FROM properties
  GROUP BY company_id;
$$;

-- Solo el backend (service_role) puede ejecutarla.
REVOKE EXECUTE ON FUNCTION company_image_stats() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION company_image_stats() TO service_role;
