-- Tamper-proof monthly credit guard for the AI assistant.
--
-- The limit cannot be altered from the client:
--   • The counter only moves through these two SECURITY DEFINER functions.
--   • EXECUTE is revoked from anon/authenticated — only the service_role
--     (used by the server-side admin client) can call them.
--   • assistant_usage already has no INSERT/UPDATE/DELETE RLS policy, so a
--     logged-in user cannot write the table directly either.
--   • The increment is atomic (single INSERT ... ON CONFLICT ... RETURNING),
--     so concurrent requests cannot race past the limit or lose updates.

-- Atomically consume one credit for (company, month) and return the NEW count.
-- A brand-new month starts at 1 on first call (no row needed beforehand).
CREATE OR REPLACE FUNCTION consume_assistant_credit(
  p_company_id UUID,
  p_month      CHAR(7)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO assistant_usage (company_id, month, request_count)
  VALUES (p_company_id, p_month, 1)
  ON CONFLICT (company_id, month)
  DO UPDATE SET request_count = assistant_usage.request_count + 1
  RETURNING request_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Give back one credit when the request fails before delivering value
-- (e.g. the model call errored) or when it was rejected for being over limit.
-- Never drops below zero.
CREATE OR REPLACE FUNCTION refund_assistant_credit(
  p_company_id UUID,
  p_month      CHAR(7)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assistant_usage
  SET request_count = GREATEST(request_count - 1, 0)
  WHERE company_id = p_company_id AND month = p_month;
END;
$$;

-- Lock down: only the server (service_role) may move the counter.
REVOKE EXECUTE ON FUNCTION consume_assistant_credit(UUID, CHAR(7)) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refund_assistant_credit(UUID, CHAR(7))  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION consume_assistant_credit(UUID, CHAR(7)) TO service_role;
GRANT  EXECUTE ON FUNCTION refund_assistant_credit(UUID, CHAR(7))  TO service_role;
