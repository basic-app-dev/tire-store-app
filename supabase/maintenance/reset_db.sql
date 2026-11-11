BEGIN;

DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.appointment_services;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public.customer_vehicles;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.store_hours;
DROP TABLE IF EXISTS public.service_bays;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.vehicle_fitments;
DROP TABLE IF EXISTS public.tires;

COMMIT;
