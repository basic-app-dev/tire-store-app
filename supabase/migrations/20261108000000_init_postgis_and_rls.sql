-- 1. Initialize PostGIS spatial extensions
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Grant usage on extensions schema to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2. Helper functions for RBAC claims
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', 'customer');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID AS $$
  SELECT NULLIF(auth.jwt() ->> 'store_id', '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_store_id() TO authenticated, anon;


