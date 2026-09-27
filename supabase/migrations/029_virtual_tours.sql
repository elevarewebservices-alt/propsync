-- Atomic scene graph: one versioned document per tour. Only the server may
-- access records; public responses are explicit projections of published tours.
CREATE TABLE IF NOT EXISTS public.virtual_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80 AND slug <> 'demo'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished')),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS virtual_tours_company_idx ON public.virtual_tours(company_id, created_at DESC);
ALTER TABLE public.virtual_tours ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.virtual_tours FROM anon, authenticated;
GRANT ALL ON public.virtual_tours TO service_role;
-- No public bucket and no client storage policy: uploads/downloads pass through
-- authenticated Next.js endpoints; publication is checked for every image read.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('virtual-tours', 'virtual-tours', false, 4194304, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 4194304, allowed_mime_types = ARRAY['image/webp'];
