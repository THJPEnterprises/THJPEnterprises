-- ═══════════════════════════════════════════════════════════════════════
-- THJP Enterprises — Stockist Portal database
-- Run ONCE in a brand-new Supabase project:
--   Supabase → SQL Editor → New query → paste this whole file → Run
-- Then run seed.sql for the starter product list.
--
-- Security model
--  • Every table has Row Level Security (RLS) switched on.
--  • Nothing can be read or written without a signed-in session that has
--    completed two-factor authentication (Supabase "aal2").
--  • Stockists only see data once an admin has approved their account.
--  • Prices are worked out on the SERVER when an order is placed
--    (place_order function) — a stockist cannot change the price they pay
--    by tampering with the page.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Helper: has this session completed two-factor authentication? ───
create or replace function public.has_mfa()
returns boolean language sql stable
set search_path = public, pg_temp
as $$ select coalesce((auth.jwt() ->> 'aal'), '') = 'aal2'; $$;

-- ─── TIERS ─────────────────────────────────────────────────────────────
create table public.tier_settings (
  tier int primary key check (tier between 1 and 9),
  label text not null,
  discount_pct numeric(5,2) not null check (discount_pct >= 0 and discount_pct < 100), -- stockist margin off RRP
  min_order_qty int not null default 1 check (min_order_qty >= 1),                     -- units per order, any mix
  free_shipping boolean not null default false,
  benefits text,
  updated_at timestamptz not null default now()
);

insert into public.tier_settings (tier, label, discount_pct, min_order_qty, free_shipping, benefits) values
 (1, 'Tier 1',   35, 10,  false, E'Entry-level wholesale pricing.\nMinimum order 10 units (any mix of products).\nShipping quoted per order.'),
 (2, 'Tier 2',   40, 25,  false, E'Higher-volume wholesale pricing.\nMinimum order 25 units (any mix of products).\nShipping quoted per order.'),
 (3, 'Gold',     45, 50,  true,  E'High-volume wholesale pricing.\nMinimum order 50 units (any mix of products).\nFree shipping on every order.'),
 (4, 'Platinum', 50, 100, true,  E'Our top wholesale tier, reviewed by our team.\nMinimum order 100 units.\nFree shipping and priority dispatch.\nEarly access to new brands and limited runs.');

-- ─── PROFILES (one per portal user) ───────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  business_name text,
  contact_name text,
  phone text,
  state text check (state is null or state in ('NSW','VIC','QLD','SA','WA','TAS','NT','ACT','NZ')),
  region text,
  role text not null default 'stockist' check (role in ('stockist','admin')),
  approved boolean not null default false,
  tier int not null default 1 references public.tier_settings(tier),
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever an auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin check (also requires 2FA). SECURITY DEFINER avoids RLS recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_mfa() and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_mfa() and exists (
    select 1 from public.profiles where id = auth.uid() and approved = true
  );
$$;

-- Stockists may not promote themselves: block changes to protected columns
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and auth.role() = 'authenticated' then
    new.role := old.role; new.approved := old.approved; new.tier := old.tier;
    new.email := old.email; new.state := old.state; new.region := old.region;
  end if;
  return new;
end; $$;

create trigger profiles_protect before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

alter table public.profiles enable row level security;
create policy "profiles: read own"      on public.profiles for select using (id = auth.uid() and public.has_mfa());
create policy "profiles: admin read"    on public.profiles for select using (public.is_admin());
create policy "profiles: update own"    on public.profiles for update using (id = auth.uid() and public.has_mfa());
create policy "profiles: admin update"  on public.profiles for update using (public.is_admin());

alter table public.tier_settings enable row level security;
create policy "tiers: signed-in read"   on public.tier_settings for select using (public.has_mfa());
create policy "tiers: admin insert"     on public.tier_settings for insert with check (public.is_admin());
create policy "tiers: admin update"     on public.tier_settings for update using (public.is_admin());

-- ─── PRODUCTS (all brands) ────────────────────────────────────────────
create table public.products (
  id bigint generated always as identity primary key,
  brand text not null,
  sku text not null unique,
  product_name text not null,
  size text,
  description text,
  rrp_aud numeric(10,2) check (rrp_aud is null or rrp_aud >= 0),  -- GST-inclusive RRP; tier price = RRP × (1 − margin)
  has_sizes boolean not null default false,                        -- apparel: order per size
  available_sizes text,                                            -- e.g. 'S,M,L,XL,XXL'
  active boolean not null default true,
  sort_order int not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "products: approved read" on public.products for select using (public.is_approved() or public.is_admin());
create policy "products: admin insert"  on public.products for insert with check (public.is_admin());
create policy "products: admin update"  on public.products for update using (public.is_admin());
create policy "products: admin delete"  on public.products for delete using (public.is_admin());

-- ─── ORDERS ───────────────────────────────────────────────────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique default ('THJP-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  stockist_id uuid not null references public.profiles(id) on delete restrict,
  po_number text not null,
  status text not null default 'submitted' check (status in ('submitted','confirmed','processing','shipped','cancelled')),
  tier int,
  total_qty int not null default 0,
  total_inc_gst_aud numeric(10,2) not null default 0,  -- products, GST-inclusive
  gst_aud numeric(10,2) not null default 0,             -- GST component (1/11 of total)
  shipping_aud numeric(10,2),                           -- null = to be confirmed
  tracking text,
  notes text,                                           -- stockist's notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  brand text,
  sku text not null,
  product_name text not null,
  size text,
  unit_price_aud numeric(10,2) not null,
  qty int not null check (qty > 0),
  line_total_aud numeric(10,2) not null
);

alter table public.orders enable row level security;
create policy "orders: own read"     on public.orders for select using (stockist_id = auth.uid() and public.has_mfa());
create policy "orders: admin read"   on public.orders for select using (public.is_admin());
create policy "orders: admin update" on public.orders for update using (public.is_admin());
-- No insert policy on purpose: orders can only be created through place_order().

alter table public.order_items enable row level security;
create policy "order_items: visible with order" on public.order_items for select using (
  public.has_mfa() and exists (
    select 1 from public.orders o where o.id = order_items.order_id
      and (o.stockist_id = auth.uid() or public.is_admin())
  )
);

-- Internal notes live in their own admin-only table so stockists can never read them
create table public.order_admin_notes (
  order_id bigint primary key references public.orders(id) on delete cascade,
  admin_notes text,
  updated_at timestamptz not null default now()
);
alter table public.order_admin_notes enable row level security;
create policy "order notes: admin all" on public.order_admin_notes for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$ begin new.updated_at := now(); return new; end; $$;
create trigger orders_touch   before update on public.orders   for each row execute procedure public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute procedure public.touch_updated_at();

-- ─── place_order: the ONLY way to create an order ─────────────────────
-- items = [{"sku":"VO-UPO-270","qty":6}, {"sku":"VO-TEE","size":"L","qty":2}]
create or replace function public.place_order(p_po_number text, p_notes text, p_items jsonb)
returns public.orders
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
  v_tier public.tier_settings;
  v_order public.orders;
  v_item jsonb;
  v_prod public.products;
  v_qty int;
  v_size text;
  v_unit numeric(10,2);
  v_total numeric(12,2) := 0;
  v_count int := 0;
begin
  if not public.has_mfa() then raise exception 'Two-factor authentication required'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or not v_profile.approved then raise exception 'Account not approved'; end if;
  if coalesce(trim(p_po_number), '') = '' then raise exception 'A PO number is required'; end if;
  select * into v_tier from public.tier_settings where tier = v_profile.tier;

  -- validate quantities first
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := coalesce((v_item->>'qty')::int, 0);
    if v_qty < 0 or v_qty > 100000 then raise exception 'Invalid quantity'; end if;
    v_count := v_count + v_qty;
  end loop;
  if v_count = 0 then raise exception 'Add at least one product'; end if;
  if v_count < v_tier.min_order_qty then
    raise exception 'Minimum order for % is % units (this order has %)', v_tier.label, v_tier.min_order_qty, v_count;
  end if;

  insert into public.orders (stockist_id, po_number, notes, tier)
  values (auth.uid(), left(trim(p_po_number), 60), nullif(left(trim(coalesce(p_notes,'')), 2000), ''), v_profile.tier)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'qty')::int, 0);
    continue when v_qty = 0;
    select * into v_prod from public.products where sku = v_item->>'sku' and active = true;
    if v_prod.id is null or v_prod.rrp_aud is null then
      raise exception 'Product % is not available to order', v_item->>'sku';
    end if;
    v_size := nullif(trim(coalesce(v_item->>'size', '')), '');
    if v_prod.has_sizes and (v_size is null or not (v_size = any (string_to_array(replace(coalesce(v_prod.available_sizes,''),' ',''), ',')))) then
      raise exception 'Choose a valid size for %', v_prod.product_name;
    end if;
    if not v_prod.has_sizes then v_size := null; end if;
    v_unit := round(v_prod.rrp_aud * (1 - v_tier.discount_pct / 100), 2);
    insert into public.order_items (order_id, brand, sku, product_name, size, unit_price_aud, qty, line_total_aud)
    values (v_order.id, v_prod.brand, v_prod.sku, v_prod.product_name || coalesce(' · ' || v_prod.size, ''), v_size, v_unit, v_qty, v_unit * v_qty);
    v_total := v_total + v_unit * v_qty;
  end loop;

  update public.orders
     set total_qty = v_count,
         total_inc_gst_aud = v_total,
         gst_aud = round(v_total / 11, 2),
         shipping_aud = case when v_tier.free_shipping then 0 else null end
   where id = v_order.id
  returning * into v_order;

  return v_order;
end; $$;

revoke all on function public.place_order(text, text, jsonb) from public, anon;
grant execute on function public.place_order(text, text, jsonb) to authenticated;

-- ─── DEALER RESOURCES ─────────────────────────────────────────────────
create table public.resources (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  brand text,                                  -- optional, for grouping
  category text not null default 'general' check (category in ('sds','spec-sheet','price-list','marketing','training','product-images','general')),
  file_path text not null,                     -- path in the 'dealer-resources' bucket, or a full https:// link
  updated_at timestamptz not null default now()
);

alter table public.resources enable row level security;
create policy "resources: approved read" on public.resources for select using (public.is_approved() or public.is_admin());
create policy "resources: admin insert"  on public.resources for insert with check (public.is_admin());
create policy "resources: admin update"  on public.resources for update using (public.is_admin());
create policy "resources: admin delete"  on public.resources for delete using (public.is_admin());

insert into storage.buckets (id, name, public) values ('dealer-resources', 'dealer-resources', false)
on conflict (id) do nothing;

create policy "dealer-resources: approved read" on storage.objects for select
  using (bucket_id = 'dealer-resources' and (public.is_approved() or public.is_admin()));
create policy "dealer-resources: admin insert" on storage.objects for insert
  with check (bucket_id = 'dealer-resources' and public.is_admin());
create policy "dealer-resources: admin update" on storage.objects for update
  using (bucket_id = 'dealer-resources' and public.is_admin());
create policy "dealer-resources: admin delete" on storage.objects for delete
  using (bucket_id = 'dealer-resources' and public.is_admin());

-- ─── MAKE YOURSELF THE FIRST ADMIN ────────────────────────────────────
-- 1. Supabase → Authentication → Users → Add user (your email + a password)
-- 2. Then run (with your email):
--    update public.profiles set role = 'admin', approved = true, business_name = 'THJP Enterprises'
--    where email = 'info@thjpenterprises.com';
