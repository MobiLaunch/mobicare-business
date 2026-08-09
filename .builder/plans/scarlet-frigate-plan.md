# Backend Security Hardening Plan

## Goal

Harden the Mobicare application against payment tampering, unauthorized admin access, order-PII exposure, API abuse, deployment misconfiguration, and secret leakage. Preserve the current storefront, admin workflows, Stripe Checkout flow, and public booking behavior unless a security boundary requires a contract change.

## Confirmed decisions

- Admin authorization: use a dedicated Supabase staff/admin allowlist table keyed to `auth.users`, with room for explicit roles later.
- Local access: permit local credentials only in development; production builds fail closed when Supabase is unavailable.
- Order confirmation: replace direct Stripe session-ID bearer lookup with a short-lived, server-generated signed lookup token and return only minimum confirmation data.
- Rate limiting: use shared Upstash Redis / Vercel-compatible rate limiting for checkout and relevant public endpoints.

## Priority 0 — Payment and authorization boundaries

1. **Make checkout pricing server-authoritative**
   - Update `api/create-checkout-session.js` to require trusted backend configuration and fetch every requested product by ID from Supabase using `SUPABASE_SERVICE_ROLE_KEY`.
   - Ignore client-supplied names, prices, totals, tax, and shipping values for charge calculation.
   - Validate product existence, active status, quantity bounds, and available stock; reject unavailable or malformed carts.
   - Recompute subtotal, shipping, tax, and total from server-side values and build Stripe line items from those values only.
   - Store trusted item data in Stripe metadata for webhook reconciliation.
   - Require `PUBLIC_SITE_URL` in production and reject requests if it is absent or invalid; never derive redirects from the request Host header.

2. **Replace “any authenticated user is admin”**
   - Update the schema SQL in `src/admin/Settings.jsx` to create a staff/admin table with an enabled role record for each allowed Supabase user.
   - Replace `public.is_admin()` with a `security definer` function that checks the authenticated user against the staff table and required role/status.
   - Update RLS policies for products, categories, orders, order items, bookings, and site settings to use the allowlist function.
   - Ensure staff-table policies cannot be self-escalated by anon or ordinary authenticated users.
   - Document the required staff-user provisioning flow and disable public Supabase sign-up unless explicitly needed.
   - Keep `RequireAdmin` and client session checks as UX guards only; do not treat them as authorization.

3. **Remove production local-password exposure**
   - Update `src/lib/store.js`, `src/admin/AdminLogin.jsx`, and the build/runtime configuration so local authentication is available only in development with an explicit configured password.
   - Remove the hardcoded `mobicare-setup` fallback and avoid shipping a usable production password in `VITE_*` output.
   - Make production admin login fail closed with a clear configuration message when Supabase is unavailable.
   - Update `.env.example` and `SECURITY.md` to reflect the new boundary.

## Priority 1 — Customer privacy and API abuse controls

4. **Harden order confirmation lookup**
   - Update `api/create-checkout-session.js`, `api/order-status.js`, `api/stripe-webhook.js`, and the success-page client flow.
   - Generate a cryptographically random, short-lived lookup token server-side, store only a hash/expiry association with the order, and pass the token through the success flow without exposing the Stripe session ID as the authorization credential.
   - Make `/api/order-status` validate token expiry and single-purpose scope, return only confirmation fields needed by the success page, and send `Cache-Control: no-store, private`.
   - Do not log tokens, full customer data, or sensitive payment metadata.
   - Preserve the webhook race/idempotency behavior while ensuring paid orders and line items are recorded atomically or retried safely.

5. **Use shared rate limiting and abuse-resistant validation**
   - Add a small server-side rate-limit utility backed by Upstash Redis/Vercel integration.
   - Apply limits to checkout-session creation, order-status token attempts, and public booking submission where appropriate.
   - Use normalized IP plus endpoint/action identifiers and, where available, email/cart/session fingerprints; treat proxy headers defensively.
   - Keep strict request size, quantity, string-length, email, and JSON-shape validation at API boundaries.
   - Return generic errors externally while logging structured, non-sensitive diagnostics server-side.

6. **Harden webhook processing**
   - Preserve raw-body Stripe signature verification in `api/stripe-webhook.js`.
   - Reconcile webhook line items against trusted checkout/order data rather than trusting mutable metadata prices.
   - Use a unique event/session idempotency record or equivalent conflict-safe insert/upsert.
   - Treat line-item persistence failure as a failed webhook transaction so Stripe retries instead of leaving incomplete paid orders.
   - Add safe stock decrement logic only if it can be made atomic and idempotent; otherwise explicitly leave stock unchanged and document the limitation.

## Priority 2 — Deployment, headers, and secret hygiene

7. **Move security headers to HTTP responses**
   - Update `vercel.json` with response headers for the app and API routes: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and appropriate cross-origin policies.
   - Put `frame-ancestors 'none'` in the response CSP, not only the HTML meta tag.
   - Tighten CSP by removing `unsafe-eval` and reducing `unsafe-inline` where compatible with BeerCSS/EmailJS; explicitly list only required origins.
   - Add `Cache-Control: no-store` for checkout, webhook, and order-status responses where applicable.
   - Keep SPA rewrites from accidentally masking API failures or exposing unintended files.

8. **Rotate and remove committed secrets**
   - Treat the Plasmic token in `plasmic.json` as compromised: rotate it through the provider, then remove it from committed source or replace it with a secret-backed configuration mechanism.
   - Search the repository and production bundle for Stripe secrets, webhook secrets, Supabase service-role keys, local fallback passwords, and the old Plasmic token.
   - Confirm only `VITE_` public values are exposed to browser code and all service-role/payment secrets exist only in serverless environment configuration.

9. **Improve supply-chain reproducibility**
   - Add and commit the project’s package-manager lockfile.
   - Run dependency audit/scanning in CI, especially for Stripe, Supabase, serverless helpers, and UI/build dependencies.
   - Review dependency ranges and update intentionally rather than relying on uncontrolled transitive drift.
   - Verify production builds do not emit source maps or include secret-like values.

## Critical files

- `api/create-checkout-session.js`
- `api/order-status.js`
- `api/stripe-webhook.js`
- `src/admin/Settings.jsx` (schema/RLS instructions)
- `src/lib/store.js`
- `src/admin/AdminLogin.jsx`
- `src/lib/supabase.js`
- `src/components/RequireAdmin.jsx`
- `src/pages/OrderSuccess.jsx`
- `src/pages/Cart.jsx`
- `src/components/BookingWizard.jsx`
- `vercel.json`
- `index.html`
- `plasmic.json`
- `package.json`, lockfile, `.env.example`, `SECURITY.md`

## Validation and security tests

- Tamper checkout item prices, names, totals, quantities, inactive IDs, and stock; confirm the server rejects or reprices every case.
- Verify an authenticated non-staff Supabase user cannot read or mutate any admin table through REST or the app.
- Verify staff provisioning, disabled staff records, logout/session expiry, and public sign-up behavior.
- Confirm production with missing Supabase configuration cannot enter local admin mode.
- Confirm order lookup tokens expire, cannot be reused outside their purpose, do not expose Stripe session IDs as authorization, and return no unnecessary PII.
- Replay webhook deliveries and simulate partial database failures; verify no duplicate or incomplete orders.
- Exercise rate limits across repeated requests and concurrent instances using the shared limiter.
- Inspect deployed response headers and test iframe embedding/clickjacking behavior.
- Scan source and `dist` output for secrets and verify no production source maps are published.
- Run build, lint/type checks if available, API tests, and a manual checkout/admin smoke test in a staging environment before production rollout.
