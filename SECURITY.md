# Security and deployment notes

## Security boundaries

- Stripe Checkout sessions are created only by `/api/create-checkout-session.js`.
- Product names, prices, active state, and stock are loaded from Supabase with the server-only service-role key. Browser-supplied prices, totals, names, tax, and shipping are ignored.
- `checkout.session.completed` is verified with the Stripe webhook signature. The webhook reconciles the trusted checkout metadata and charged amount before writing an order.
- Order line items are persisted with an idempotent unique index. A webhook failure returns `500` so Stripe retries instead of accepting an incomplete order.
- Checkout validates current stock but does not decrement it until an atomic inventory reservation function is deployed; stock is intentionally left unchanged rather than risking duplicate decrements on webhook retries.
- The success page uses a short-lived HMAC-signed lookup token. Only its SHA-256 hash and expiry are stored with the order. It never uses a Stripe session ID as a bearer credential and returns only confirmation fields.
- `/api/create-booking.js` validates and rate-limits public booking submissions before inserting with the server-only service-role key. The bookings table has no anonymous insert policy, so direct Supabase REST writes cannot bypass the API. The database trigger remains defense in depth.
- Shared rate limiting uses Upstash Redis. Development can use a bounded per-instance fallback; production mutation endpoints fail closed when Upstash is unavailable. Configure Upstash before enabling production checkout, order status, or booking traffic.
- Order notifications are not sent from the browser before payment confirmation.

## Admin authorization

Supabase Auth proves identity; it does not grant admin access. Run the schema shown in Admin → Settings, create the user in Supabase Authentication, then provision the user's UUID from a trusted SQL editor:

```sql
insert into public.staff_users (user_id, role)
values ('USER_UUID', 'admin');
```

The `public.is_admin()` security-definer function checks that allowlist and the enabled admin role. The `staff_users` table has no browser grants or self-service policy. Products, categories, orders, order items, bookings, and site settings use that function in their admin RLS policies. Keep public Supabase sign-up disabled unless it is an intentional product requirement.

`RequireAdmin` and the browser session state are UX guards only. RLS and server-side service credentials are the authorization boundary.

Local password access is development-only and requires an explicit `VITE_LOCAL_ADMIN_PW`. Production builds fail closed when Supabase is unavailable. Never put a production password in a `VITE_` variable.

## Environment variables

| Variable | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser build | Public values; protected by RLS |
| `VITE_EMAILJS_*` | Browser build | Public EmailJS values only |
| `VITE_LOCAL_ADMIN_PW` | Development only | Never configure for production |
| `STRIPE_SECRET_KEY` | Serverless only | Full Stripe account access |
| `STRIPE_WEBHOOK_SECRET` | Serverless only | Verifies Stripe requests |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Serverless | Used by the booking endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless only | Bypasses RLS; treat as a root credential |
| `PUBLIC_SITE_URL` | Serverless only | Required; HTTPS in production |
| `ORDER_LOOKUP_TOKEN_SECRET` | Serverless only | Long random signing secret |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Serverless only | Shared rate limiting |

Never commit `.env` files, Stripe keys, webhook secrets, Supabase service-role keys, or signing keys. Rotate any credential that has been committed or exposed.

## Deployment checklist

1. Run the schema from Admin → Settings in the Supabase SQL editor.
2. Create the initial Supabase Auth user and insert its UUID into `staff_users`.
3. Disable public sign-up unless required.
4. Configure all serverless-only variables in the host environment.
5. Configure the Stripe webhook for `checkout.session.completed` at `/api/stripe-webhook`.
6. Configure Upstash Redis for shared production rate limits.
7. Verify response headers, API cache behavior, and SPA rewrites after deployment.
8. Run `npm audit`, `npm run build`, and source/dist secret scans before release.
9. Test tampered product prices, inactive/out-of-stock products, expired lookup tokens, replayed webhooks, non-staff users, and repeated booking/checkout attempts in staging.

## Secret rotation note

The previous Plasmic project token was removed from `plasmic.json`. Rotate that token in the Plasmic provider before using any Plasmic CLI workflow, then provide the replacement through the provider/CI secret configuration rather than committing it.
