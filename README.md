# Aipudio Business

Aipudio Business Platform — static frontend connected to Supabase.

## Structure

- `index.html` — landing/home
- `login.html` — Google authentication
- `dashboard.html` — dashboard
- `business.html` — business + products management
- `landing.html` — landing page management
- `css/` — styles
- `js/` — Supabase/auth/application logic
- `assets/` — static assets

## Before deployment

1. Open `js/config.js`.
2. Put the Supabase anon/publishable key in `SUPABASE_ANON_KEY`.
3. In Supabase Authentication > URL Configuration, add the Vercel production URL to Site URL / Redirect URLs.
4. Confirm the existing RLS policies allow the authenticated user to access only their own rows.

The browser must use the anon/publishable key only. Never put a `service_role` key in frontend code.
