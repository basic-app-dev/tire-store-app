-- ==============================================================================
-- TIRE-8: PostGIS Store Locator Spatial RPC Function
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.find_stores_within_radius(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 40233.6, -- Default 25 miles in meters
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(150),
  code VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(20),
  phone_number VARCHAR(30),
  email VARCHAR(150),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  is_active BOOLEAN
) AS $$
DECLARE
  v_point extensions.geography;
BEGIN
  -- Construct geography point from longitude, latitude
  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;

  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.code,
    s.address,
    s.city,
    s.state,
    s.postal_code,
    s.phone_number,
    s.email,
    s.latitude,
    s.longitude,
    extensions.ST_Distance(s.location, v_point) AS distance_meters,
    (extensions.ST_Distance(s.location, v_point) / 1609.344) AS distance_miles,
    s.is_active
  FROM public.stores s
  WHERE s.is_active = true
    AND extensions.ST_DWithin(s.location, v_point, p_radius_meters)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execution to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.find_stores_within_radius TO anon, authenticated, service_role;

