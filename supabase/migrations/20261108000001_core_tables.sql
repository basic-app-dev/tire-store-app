-- ==============================================================================
-- TIRE-7: Core DDL Tables & Indexes Migration
-- ==============================================================================

-- 1. Ensure PostGIS is available
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Tires Catalog Table
CREATE TABLE IF NOT EXISTS public.tires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  season VARCHAR(50) NOT NULL, -- 'all_season', 'summer', 'winter', etc.
  category VARCHAR(50) NOT NULL, -- 'passenger', 'performance', 'touring', etc.
  width INT NOT NULL, -- 225
  aspect_ratio INT NOT NULL, -- 45
  rim_diameter INT NOT NULL, -- 17
  load_index INT NOT NULL, -- 91
  speed_rating VARCHAR(5) NOT NULL, -- 'W'
  price_cents INT NOT NULL, -- in cents
  image_url TEXT,
  run_flat BOOLEAN NOT NULL DEFAULT false,
  warranty_miles INT,
  treadwear_rating INT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tires_dimensions ON public.tires(width, aspect_ratio, rim_diameter);
CREATE INDEX IF NOT EXISTS idx_tires_brand_season ON public.tires(brand, season);

-- 3. Vehicle Fitments Matrix Table
CREATE TABLE IF NOT EXISTS public.vehicle_fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100) NOT NULL,
  
  -- Front tire specs
  front_width INT NOT NULL,
  front_aspect_ratio INT NOT NULL,
  front_rim_diameter INT NOT NULL,
  front_load_index INT,
  front_speed_rating VARCHAR(5),

  -- Rear tire specs (staggered fitments)
  is_staggered BOOLEAN NOT NULL DEFAULT false,
  rear_width INT,
  rear_aspect_ratio INT,
  rear_rim_diameter INT,
  rear_load_index INT,
  rear_speed_rating VARCHAR(5),

  bolt_pattern VARCHAR(20),
  oem_wheel_diameter INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_vehicle_fitment UNIQUE (year, make, model, trim)
);

CREATE INDEX IF NOT EXISTS idx_fitment_lookup ON public.vehicle_fitments(year, make, model, trim);

-- 4. Stores Location Table with PostGIS Geography Point
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location extensions.geography(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to automatically populate location from latitude & longitude
CREATE OR REPLACE FUNCTION public.set_store_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_store_location ON public.stores;
CREATE TRIGGER trg_set_store_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.set_store_location();

-- PostGIS GiST index for ultra-fast spatial search
CREATE INDEX IF NOT EXISTS idx_stores_location_gist ON public.stores USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_stores_postal_code ON public.stores(postal_code);

-- 5. Service Bays per Store Table
CREATE TABLE IF NOT EXISTS public.service_bays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bay_number INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  is_alignment_capable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_store_bay_number UNIQUE (store_id, bay_number)
);

CREATE INDEX IF NOT EXISTS idx_service_bays_store ON public.service_bays(store_id);

-- 6. Store Operating Hours Table
CREATE TABLE IF NOT EXISTS public.store_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_store_day UNIQUE (store_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_store_hours_store ON public.store_hours(store_id);

-- 7. User Profiles Table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(30),
  role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'shop_worker', 'store_manager', 'super_admin')),
  assigned_store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store ON public.user_profiles(assigned_store_id);

-- 8. Customer Saved Vehicles Table (Garage)
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fitment_id UUID REFERENCES public.vehicle_fitments(id),
  nickname VARCHAR(100),
  year INT NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),
  license_plate VARCHAR(20),
  vin VARCHAR(17),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_user ON public.customer_vehicles(user_id);

-- 9. Service Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  bay_id UUID REFERENCES public.service_bays(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vehicle_id UUID REFERENCES public.customer_vehicles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending_payment', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show')),
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  scheduled_end_time TIMESTAMPTZ NOT NULL,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_technician_id UUID REFERENCES auth.users(id),
  customer_notes TEXT,
  technician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_store_time ON public.appointments(store_id, scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_bay_time ON public.appointments(bay_id, scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON public.appointments(user_id);

-- 10. Appointment Services Table
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  price_cents INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_apt ON public.appointment_services(appointment_id);

-- 11. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  store_id UUID REFERENCES public.stores(id),
  appointment_id UUID REFERENCES public.appointments(id),
  fulfillment_type VARCHAR(50) NOT NULL CHECK (fulfillment_type IN ('store_installation', 'direct_shipment', 'in_store_pickup')),
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  subtotal_cents INT NOT NULL,
  tax_cents INT NOT NULL,
  installation_fee_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL,
  stripe_payment_intent_id VARCHAR(150) UNIQUE,
  stripe_customer_id VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON public.orders(stripe_payment_intent_id);

-- 12. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tire_id UUID NOT NULL REFERENCES public.tires(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_cents INT NOT NULL,
  total_price_cents INT NOT NULL,
  tire_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

