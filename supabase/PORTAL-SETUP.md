# THJP Stockist Portal — setup guide

The portal lives at **thjpenterprises.com/portal/** and is hosted by GitHub Pages like the rest of the site.
Logins, pricing, orders and files are stored in THJP's own **Supabase** project (free plan).
It is completely separate from the Vinnie's Oil reseller portal.

Until step 2 is done the portal shows "Coming soon". To preview it with sample data, open
`portal/login.html?demo=1` (nothing is saved or sent in preview mode).

---

## 1. Create the Supabase project (about 5 minutes)
1. Go to **supabase.com** → sign up (use info@thjpenterprises.com) → **New project**.
2. Name: `thjp-portal` · Region: **Sydney (ap-southeast-2)** · choose a strong database password and keep it safe.
3. When it's ready: **Project Settings → API**. Copy the **Project URL** and the **publishable / anon key**.

## 2. Connect the website
Paste both values into `js/portal-config.js`:
```js
SUPABASE_URL: 'https://xxxx.supabase.co',
SUPABASE_ANON_KEY: 'sb_publishable_…',
```
The publishable key is designed to be public. Never put the **service role / secret** key in the website.

## 3. Create the database
**SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. Then do the same with `supabase/seed.sql`.
Check every RRP in seed.sql (or later in Admin → Products). UPO 270ml, the T-shirt and cap have no RRP yet and are hidden from ordering until set.

## 4. Sign-in settings
- **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (accounts are created by THJP only).
- **Authentication → URL Configuration**: Site URL `https://thjpenterprises.com/portal/login.html`; add Redirect URL `https://thjpenterprises.com/portal/login.html`.
- **Authentication → Multi-Factor**: make sure **TOTP (authenticator app)** is enabled.
- **Authentication → Policies / Passwords**: minimum length 10; turn on leaked-password protection if offered.

## 5. Make yourself the first admin
1. **Authentication → Users → Add user** → your email + a password → tick "Auto confirm".
2. SQL Editor:
   ```sql
   update public.profiles set role = 'admin', approved = true, business_name = 'THJP Enterprises'
   where email = 'info@thjpenterprises.com';
   ```
3. Sign in at thjpenterprises.com/portal/login.html and set up two-factor with your phone.

## 6. Email (orders, confirmations, welcome emails) — Resend
1. **resend.com** → sign up → **Domains → Add domain** `thjpenterprises.com` → add the DNS records it shows at your domain registrar (wherever thjpenterprises.com's DNS is managed). Wait for "Verified".
2. **API Keys → Create** (sending access). Copy it.
3. Supabase **Authentication → Emails → SMTP Settings** → enable custom SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `portal@thjpenterprises.com`, name `THJP Enterprises`. (Password-reset emails then come from your domain.)

## 7. Deploy the server functions (one time)
These create accounts, reset two-factor and send order emails. They need the Supabase CLI on a computer:
```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_EMAIL=info@thjpenterprises.com \
  EMAIL_FROM="THJP Enterprises <portal@thjpenterprises.com>" PORTAL_URL=https://thjpenterprises.com/portal/
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-mfa
supabase functions deploy notify
```
(SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided to functions automatically.)

## 8. Day-to-day (all in the portal's Admin page)
- **Stockists**: + New account (sets a temporary password; they set up 2FA on first sign-in). Approve, set tier/state/region, Reset 2FA for lost phones.
- **Products & pricing**: add brands and products, set RRP (inc. GST). Tier prices are calculated automatically. Untick Active to hide a product. For apparel, list sizes like `S,M,L,XL`.
- **Tiers**: margin %, minimum units per order, free shipping, benefits text.
- **Orders**: set status, shipping and tracking. Ticking "Email the stockist" sends them an update.
- **Resources**: upload PDFs/images (private to approved stockists) or link to a file. Category "Product images" fills the photo gallery.

## How it's protected
- Row Level Security on every table; nothing is readable without a signed-in, two-factor-verified session.
- Stockists only see their own orders; internal order notes are in an admin-only table.
- Prices are calculated in the database when an order is placed — a stockist can't change their price.
- Stockists can't change their own tier, approval or role.
- Automatic sign-out after 30 minutes of inactivity.
- `.github/workflows/supabase-keepalive.yml` pings the database twice a week so the free project isn't paused.
