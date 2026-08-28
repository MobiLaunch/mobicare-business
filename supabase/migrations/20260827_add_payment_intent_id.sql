-- Links a Mobicare order to the Stripe PaymentIntent that paid it.
-- NULL remains valid for legacy/manual orders.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_intent_id_unique
  ON public.orders (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
