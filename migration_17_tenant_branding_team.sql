-- ============================================================
-- Migration 17: Tenant Public Branding + Team Invitations
-- ============================================================
-- Adds public branding color columns to tenants for forms/sessions,
-- and creates a team_invitations table for multi-user workflows.
-- ============================================================

-- 1. Public branding columns on tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS public_header_bg_color       TEXT DEFAULT '#27498b',
  ADD COLUMN IF NOT EXISTS public_header_bg_secondary   TEXT DEFAULT '#3f67d8';

-- 2. Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token         TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID        REFERENCES auth.users(id),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant_id ON team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token     ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email     ON team_invitations(email);

-- 3. RLS on team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Only service_role / authenticated owners can query their invites
CREATE POLICY "tenant_owner_can_manage_invitations"
  ON team_invitations
  FOR ALL
  USING (
    tenant_id = (
      SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid
    )
  );

-- 4. RPC helper: get team members with emails (SECURITY DEFINER reads auth.users)
CREATE OR REPLACE FUNCTION get_tenant_team_members(p_tenant_id UUID)
RETURNS TABLE(
  user_id    UUID,
  email      TEXT,
  full_name  TEXT,
  role       TEXT,
  joined_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tu.user_id,
    u.email::TEXT,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::TEXT AS full_name,
    tu.role::TEXT,
    tu.created_at AS joined_at
  FROM tenant_users tu
  JOIN auth.users u ON u.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id
  ORDER BY tu.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_team_members(UUID) TO authenticated;

-- 5. NOTE: Create bucket 'tenant-logos' in Supabase Storage dashboard
--    Settings: Public bucket (so logo URLs are publicly accessible)
--    Allowed MIME types: image/png, image/jpeg, image/webp, image/svg+xml
--    Max file size: 2 MB
