-- ==============================================================================
-- TIRE-10: Strict Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Helper functions for JWT claims
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

-- 2. Enable RLS on all tables
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Public Catalog Read Access (tires, vehicle_fitments, stores, bays, hours)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read for tires"
ON public.tires FOR SELECT
USING (true);

CREATE POLICY "Super admin manage tires"
ON public.tires FOR ALL
USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Public read for vehicle fitments"
ON public.vehicle_fitments FOR SELECT
USING (true);

CREATE POLICY "Super admin manage vehicle fitments"
ON public.vehicle_fitments FOR ALL
USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Public read for stores"
ON public.stores FOR SELECT
USING (is_active = true OR public.get_user_role() = 'super_admin');

CREATE POLICY "Manager and admin manage stores"
ON public.stores FOR ALL
USING (
  public.get_user_role() = 'super_admin' OR 
  (public.get_user_role() = 'store_manager' AND public.get_user_store_id() = id)
);

CREATE POLICY "Public read for service bays"
ON public.service_bays FOR SELECT
USING (is_active = true OR public.get_user_role() IN ('shop_worker', 'store_manager', 'super_admin'));

CREATE POLICY "Public read for store hours"
ON public.store_hours FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- User Profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id OR public.get_user_role() = 'super_admin');

CREATE POLICY "Users update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- Customer Vehicles (Garage)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own vehicles"
ON public.customer_vehicles FOR ALL
USING (auth.uid() = user_id OR public.get_user_role() = 'super_admin')
WITH CHECK (auth.uid() = user_id OR public.get_user_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- Appointments & Appointment Services
-- ------------------------------------------------------------------------------
CREATE POLICY "Customer read own appointments"
ON public.appointments FOR SELECT
USING (
  auth.uid() = user_id OR
  (public.get_user_role() IN ('shop_worker', 'store_manager') AND public.get_user_store_id() = store_id) OR
  public.get_user_role() = 'super_admin'
);

CREATE POLICY "Customer create appointment"
ON public.appointments FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  public.get_user_role() = 'super_admin'
);

CREATE POLICY "Staff update appointments"
ON public.appointments FOR UPDATE
USING (
  (public.get_user_role() IN ('shop_worker', 'store_manager') AND public.get_user_store_id() = store_id) OR
  public.get_user_role() = 'super_admin'
);

CREATE POLICY "Read appointment services"
ON public.appointment_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a 
    WHERE a.id = appointment_id AND (
      a.user_id = auth.uid() OR
      (public.get_user_role() IN ('shop_worker', 'store_manager') AND public.get_user_store_id() = a.store_id) OR
      public.get_user_role() = 'super_admin'
    )
  )
);

-- ------------------------------------------------------------------------------
-- Orders & Order Items
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = user_id OR
  (public.get_user_role() IN ('store_manager', 'shop_worker') AND public.get_user_store_id() = store_id) OR
  public.get_user_role() = 'super_admin'
);

CREATE POLICY "Users create own order"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.get_user_role() = 'super_admin');

CREATE POLICY "Users read own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (
      o.user_id = auth.uid() OR
      (public.get_user_role() IN ('store_manager', 'shop_worker') AND public.get_user_store_id() = o.store_id) OR
      public.get_user_role() = 'super_admin'
    )
  )
);

