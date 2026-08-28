-- Tie each Mobicare order to exactly one Stripe PaymentIntent.
-- The partial unique index allows legacy/manual orders with no Stripe payment
-- while preventing duplicate orders for the same paid PaymentIntent.

alter table if exists public.orders
  add column if not exists payment_intent_id text;

create unique index if not exists orders_payment_intent_id_key
  on public.orders (payment_intent_id)
  where payment_intent_id is not null;
