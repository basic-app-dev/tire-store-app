-- ==============================================================================
-- TIRE-9: Atomic Checkout & Service Bay Reservation RPC Function
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.complete_atomic_checkout(
  p_user_id UUID,
  p_items JSONB,
  p_fulfillment_type TEXT,
  p_subtotal_cents INT,
  p_tax_cents INT,
  p_installation_fee_cents INT,
  p_total_cents INT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_customer_id TEXT,
  p_store_id UUID DEFAULT NULL,
  p_bay_id UUID DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_scheduled_start TIMESTAMPTZ DEFAULT NULL,
  p_scheduled_end TIMESTAMPTZ DEFAULT NULL,
  p_services TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_appointment_id UUID := NULL;
  v_item JSONB;
  v_service TEXT;
  v_bay_exists BOOLEAN;
BEGIN
  -- If store installation, reserve the bay and verify availability
  IF p_fulfillment_type = 'store_installation' THEN
    IF p_store_id IS NULL OR p_scheduled_start IS NULL OR p_scheduled_end IS NULL THEN
      RAISE EXCEPTION 'Store ID and appointment schedule required for store installation';
    END IF;

    -- Lock the bay row to serialize concurrent booking attempts on the same bay
    IF p_bay_id IS NOT NULL THEN
      SELECT true INTO v_bay_exists
      FROM public.service_bays
      WHERE id = p_bay_id AND store_id = p_store_id AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Service bay % is invalid or inactive for store %', p_bay_id, p_store_id;
      END IF;

      -- Check for bay slot time conflict using range intersection (&&)
      IF EXISTS (
        SELECT 1 FROM public.appointments
        WHERE bay_id = p_bay_id
          AND status NOT IN ('cancelled', 'no_show')
          AND tstzrange(scheduled_start_time, scheduled_end_time) && tstzrange(p_scheduled_start, p_scheduled_end)
      ) THEN
        RAISE EXCEPTION 'Selected service bay slot is no longer available';
      END IF;
    END IF;

    -- Insert confirmed appointment record
    INSERT INTO public.appointments (
      store_id,
      bay_id,
      user_id,
      vehicle_id,
      status,
      scheduled_start_time,
      scheduled_end_time
    ) VALUES (
      p_store_id,
      p_bay_id,
      p_user_id,
      p_vehicle_id,
      'confirmed',
      p_scheduled_start,
      p_scheduled_end
    ) RETURNING id INTO v_appointment_id;

    -- Insert requested appointment services
    IF p_services IS NOT NULL THEN
      FOREACH v_service IN ARRAY p_services
      LOOP
        INSERT INTO public.appointment_services (appointment_id, service_type)
        VALUES (v_appointment_id, v_service);
      END LOOP;
    END IF;
  END IF;

  -- Create order record
  INSERT INTO public.orders (
    user_id,
    store_id,
    appointment_id,
    fulfillment_type,
    status,
    subtotal_cents,
    tax_cents,
    installation_fee_cents,
    total_cents,
    stripe_payment_intent_id,
    stripe_customer_id
  ) VALUES (
    p_user_id,
    p_store_id,
    v_appointment_id,
    p_fulfillment_type,
    'succeeded',
    p_subtotal_cents,
    p_tax_cents,
    p_installation_fee_cents,
    p_total_cents,
    p_stripe_payment_intent_id,
    p_stripe_customer_id
  ) RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      tire_id,
      quantity,
      unit_price_cents,
      total_price_cents
    ) VALUES (
      v_order_id,
      (v_item->>'tire_id')::UUID,
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price_cents')::INT,
      (v_item->>'total_price_cents')::INT
    );
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.complete_atomic_checkout TO anon, authenticated, service_role;

