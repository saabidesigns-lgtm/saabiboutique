-- Saabi Designes — Supabase schema
--
-- HOW TO USE
-- 1. Open your Supabase project → SQL Editor → New query.
-- 2. Paste this entire file and click "Run".
-- 3. Sign up once through the app (Login screen → Create Account) using the
--    email you want to be the admin.
-- 4. Come back here and run, replacing the email:
--      update public.profiles set is_admin = true, role = 'super_admin' where email = 'you@example.com';
--    That account can now sign in from the Admin Login screen, and use the
--    "Admins" tab there to grant/change/revoke roles for anyone else who
--    signs up — no more manual SQL needed after this first account.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text default '',
  phone       text default '',
  is_admin    boolean not null default false,
  role        text not null default 'staff' check (role in ('super_admin', 'manager', 'staff')),
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table public.subcategories (
  id          bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  name        text not null,
  unique (category_id, name)
);

create table public.products (
  id             bigint generated always as identity primary key,
  name           text not null,
  category       text not null,
  sub_category   text default '',
  price          numeric not null,
  old_price      numeric,
  badge          text default '',
  emoji          text default '🥻',
  color          text default '#fdf3e3',
  visible        boolean not null default true,
  images         text[] not null default '{}',
  sizes          text[] not null default '{}',
  free_shipping  boolean not null default true,
  shipping_cost  numeric,
  delivery_days  text default '3-5 days',
  cod_available  boolean not null default true,
  description    text default '',
  created_at     timestamptz not null default now()
);

-- Singleton rows (id is always 1) holding the home page / static page content as JSON,
-- so the shape can evolve without new migrations.
create table public.home_content (
  id         int primary key default 1 check (id = 1),
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.page_content (
  id         int primary key default 1 check (id = 1),
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id             bigint generated always as identity primary key,
  user_id        uuid references auth.users(id) on delete set null,
  customer_name  text not null,
  phone          text not null,
  address        text not null,
  city           text not null,
  zip            text default '',
  items          jsonb not null,
  subtotal       numeric not null,
  shipping       numeric not null default 0,
  total          numeric not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  status         text not null default 'Pending',
  created_at     timestamptz not null default now()
);

create table public.discount_codes (
  id        bigint generated always as identity primary key,
  code      text not null unique,
  type      text not null default 'percent',
  value     numeric not null,
  min_order numeric not null default 0,
  max_uses  int not null default 100,
  uses      int not null default 0,
  expiry    text default '',
  active    boolean not null default true
);

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row whenever someone signs up via Supabase Auth
-- ─────────────────────────────────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

-- security definer so this can read profiles without recursing into the
-- profiles RLS policy that calls it
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.admin_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and is_admin = true), 'none');
$$;

create function public.is_manager_or_above()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.admin_role() in ('super_admin', 'manager');
$$;

create function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.admin_role() = 'super_admin';
$$;

-- Only super admins may change is_admin/role, regardless of which policy
-- allowed the underlying row update (e.g. a manager updating a customer's
-- is_blocked flag must not be able to also sneak in a role change).
-- auth.uid() is null when there's no logged-in app user in the request
-- context — that's the case for direct SQL (SQL Editor, migrations, the
-- service role), which is already fully trusted. Only block the change
-- when there IS a logged-in app user and they aren't a super admin.
create function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin or new.role is distinct from old.role) then
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only super admins can change admin role or status';
    end if;
  end if;
  return new;
end;
$$;

create trigger prevent_privilege_escalation_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_privilege_escalation();

-- Safe RPC the app uses to grant/change/revoke admin roles — the only
-- sanctioned way to change is_admin/role (see AdminAccess.js).
create function public.set_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can change admin roles';
  end if;

  if new_role = 'none' then
    update public.profiles set is_admin = false, role = 'staff' where id = target_user_id;
  elsif new_role in ('super_admin', 'manager', 'staff') then
    update public.profiles set is_admin = true, role = new_role where id = target_user_id;
  else
    raise exception 'Invalid role: %', new_role;
  end if;
end;
$$;

grant execute on function public.set_admin_role(uuid, text) to authenticated;

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.subcategories   enable row level security;
alter table public.products        enable row level security;
alter table public.home_content    enable row level security;
alter table public.page_content    enable row level security;
alter table public.orders          enable row level security;
alter table public.discount_codes  enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own_or_manager" on public.profiles
  for update using (auth.uid() = id or public.is_manager_or_above());

create policy "categories_select_all" on public.categories
  for select using (true);
create policy "categories_admin_write" on public.categories
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

create policy "subcategories_select_all" on public.subcategories
  for select using (true);
create policy "subcategories_admin_write" on public.subcategories
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

create policy "products_select_visible_or_admin" on public.products
  for select using (visible = true or public.is_admin());
create policy "products_admin_write" on public.products
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

create policy "home_content_select_all" on public.home_content
  for select using (true);
create policy "home_content_admin_write" on public.home_content
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

create policy "page_content_select_all" on public.page_content
  for select using (true);
create policy "page_content_admin_write" on public.page_content
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Guests (no session) may insert an order as long as it isn't attributed to
-- someone else; logged-in customers may only insert orders for themselves.
create policy "orders_insert_own_or_guest" on public.orders
  for insert with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null)
  );
create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "orders_admin_update" on public.orders
  for update using (public.is_manager_or_above()) with check (public.is_manager_or_above());

create policy "discount_codes_select_active_or_admin" on public.discount_codes
  for select using (active = true or public.is_admin());
create policy "discount_codes_admin_write" on public.discount_codes
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Storage buckets (product photos + home page banners) — public read
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('banners', 'banners', true)
  on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_manager_or_above());
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_manager_or_above());
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_manager_or_above());

create policy "banners_public_read" on storage.objects
  for select using (bucket_id = 'banners');
create policy "banners_admin_insert" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_manager_or_above());
create policy "banners_admin_update" on storage.objects
  for update using (bucket_id = 'banners' and public.is_manager_or_above());
create policy "banners_admin_delete" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_manager_or_above());

-- ─────────────────────────────────────────────────────────────────────────
-- Seed data — mirrors the previous hardcoded data/*.js files
-- ─────────────────────────────────────────────────────────────────────────

insert into public.categories (name) values
  ('Sarees'), ('Kurtas'), ('Lehengas'), ('Salwar Suits');

insert into public.subcategories (category_id, name)
  select c.id, s.name from public.categories c
  join (values
    ('Sarees', 'Banarasi'), ('Sarees', 'Kanjivaram'), ('Sarees', 'Georgette'),
    ('Sarees', 'Cotton'), ('Sarees', 'Silk'), ('Sarees', 'Chiffon'),
    ('Kurtas', 'Anarkali'), ('Kurtas', 'Straight Cut'), ('Kurtas', 'Embroidered'),
    ('Kurtas', 'Indo-Western'), ('Kurtas', 'Printed'),
    ('Lehengas', 'Bridal'), ('Lehengas', 'Festive'), ('Lehengas', 'Party Wear'),
    ('Lehengas', 'Designer'), ('Lehengas', 'Chaniya Choli'),
    ('Salwar Suits', 'Patiala'), ('Salwar Suits', 'Churidar'), ('Salwar Suits', 'Palazzo'),
    ('Salwar Suits', 'Straight'), ('Salwar Suits', 'Sharara')
  ) as s(cat_name, name) on c.name = s.cat_name;

insert into public.products
  (name, category, sub_category, price, old_price, badge, emoji, color, visible, images, sizes, free_shipping, shipping_cost, delivery_days, cod_available, description)
values
  ('Banarasi Silk Saree', 'Sarees', 'Banarasi', 8999, 11999, 'SALE', '🥻', '#fdf3e3', true, '{}', ARRAY['S','M','L','XL','XXL'], true, null, '5-7 days', true,
    'Handwoven Banarasi silk saree with intricate zari work. Perfect for weddings and festive occasions.'),
  ('Kanjivaram Silk Saree', 'Sarees', 'Kanjivaram', 12999, null, '', '🥻', '#f5ece0', true, '{}', ARRAY['S','M','L','XL'], true, null, '5-7 days', false,
    'Pure Kanjivaram silk saree with traditional temple border and rich pallu. A timeless classic.'),
  ('Georgette Printed Saree', 'Sarees', 'Georgette', 4999, null, 'NEW', '🥻', '#fdf8ee', true, '{}', ARRAY['Free Size'], false, 99, '3-5 days', true,
    'Lightweight georgette saree with floral prints. Ideal for casual and office wear.'),
  ('Anarkali Kurta Set', 'Kurtas', 'Anarkali', 5999, null, '', '👘', '#f3ede3', true, '{}', ARRAY['XS','S','M','L','XL'], false, 99, '3-5 days', true,
    'Elegant Anarkali kurta with flared silhouette and matching dupatta. Great for festive celebrations.'),
  ('Embroidered Straight Kurta', 'Kurtas', 'Embroidered', 4499, 5599, 'SALE', '👘', '#f5f0e8', true, '{}', ARRAY['S','M','L','XL','XXL'], false, 99, '3-5 days', true,
    'Straight-cut kurta with delicate thread embroidery on neckline and sleeves. Versatile and comfortable.'),
  ('Indo-Western Fusion Kurta', 'Kurtas', 'Indo-Western', 6999, null, 'NEW', '👘', '#fdf8ee', true, '{}', ARRAY['S','M','L','XL'], true, null, '3-5 days', true,
    'Modern Indo-Western kurta blending traditional embroidery with contemporary cuts. For the fashion-forward woman.'),
  ('Bridal Lehenga', 'Lehengas', 'Bridal', 19999, null, 'NEW', '✨', '#fdf3e3', true, '{}', ARRAY['S','M','L','XL'], true, null, '7-10 days', false,
    'Stunning bridal lehenga with heavy embroidery, stone work, and rich dupatta. Make your special day unforgettable.'),
  ('Festive Chaniya Choli', 'Lehengas', 'Chaniya Choli', 11999, 14999, 'SALE', '✨', '#f5ece0', true, '{}', ARRAY['XS','S','M','L','XL','XXL'], true, null, '5-7 days', true,
    'Vibrant Chaniya Choli with mirror work and colourful embroidery. Perfect for Navratri and Garba nights.'),
  ('Party Wear Lehenga', 'Lehengas', 'Party Wear', 8999, null, '', '✨', '#fdf8ee', true, '{}', ARRAY['S','M','L','XL','XXL'], true, null, '5-7 days', true,
    'Chic party wear lehenga with sequin work and flowing skirt. Turn heads at every event.'),
  ('Patiala Salwar Set', 'Salwar Suits', 'Patiala', 4999, 6499, 'SALE', '🧵', '#f5f0e8', true, '{}', ARRAY['S','M','L','XL','XXL'], false, 99, '3-5 days', true,
    'Comfortable Patiala salwar set with pleated bottoms and printed kameez. Easy to wear and style.'),
  ('Churidar Suit', 'Salwar Suits', 'Churidar', 5499, null, '', '🧵', '#f3ede3', true, '{}', ARRAY['XS','S','M','L','XL'], false, 99, '3-5 days', true,
    'Classic churidar suit with fitted silhouette and dupatta. Elegant for both formal and casual occasions.'),
  ('Designer Palazzo Set', 'Salwar Suits', 'Palazzo', 7499, null, 'NEW', '🧵', '#fdf8ee', true, '{}', ARRAY['S','M','L','XL','XXL'], true, null, '3-5 days', true,
    'Trendy palazzo set with wide-leg pants and embellished top. Comfortable yet stylish for any occasion.');

insert into public.home_content (id, content) values (1, $$
{
  "heroBanners": [],
  "heroTag": "✦ New Festive Collection 2026 ✦",
  "heroTitle": "Timeless Tradition,\nElegant Style",
  "heroSub": "Authentic sarees, kurtas & traditional wear — crafted with love.",
  "heroBtnText": "🥻  Shop Sarees",
  "features": [
    { "icon": "🚚", "text": "Free Delivery over ₹999" },
    { "icon": "🧵", "text": "Authentic Fabrics" },
    { "icon": "↩️", "text": "30-Day Easy Returns" },
    { "icon": "🔒", "text": "Secure Checkout" }
  ],
  "saleBanner": {
    "enabled": true,
    "tag": "LIMITED TIME OFFER",
    "title": "Up to 40% Off\nFestive Collection",
    "sub": "Use code SAABI20 at checkout",
    "btnText": "Grab the Deal"
  },
  "categories": [
    { "label": "Sarees", "emoji": "🥻", "color": "#3D1C0A", "sub": "Silk · Cotton · Georgette" },
    { "label": "Kurtas", "emoji": "👘", "color": "#1C2D1A", "sub": "Anarkali · Straight · Embroidered" },
    { "label": "Lehengas", "emoji": "✨", "color": "#1C1040", "sub": "Bridal · Festive · Party" },
    { "label": "Salwar Suits", "emoji": "🧵", "color": "#2D1A00", "sub": "Patiala · Churidar · Straight" }
  ]
}
$$::jsonb);

insert into public.page_content (id, content) values (1, $$
{
  "about": {
    "heroEmoji": "🥻",
    "heroTitle": "Our Story",
    "heroSubtitle": "Tradition meets elegance",
    "sections": [
      { "heading": "Born from a love of tradition", "body": "Saabi Designes was founded with a heartfelt passion for preserving the beauty of traditional Indian wear. From handwoven sarees to intricately embroidered kurtas, every piece in our collection tells a story of heritage, craftsmanship, and culture." },
      { "heading": "Authentic Fabrics, Master Craftsmanship", "body": "We source our fabrics directly from renowned weavers across India — Banarasi silks from Varanasi, Kanjivaram from Tamil Nadu, and hand-block printed cottons from Rajasthan. Every thread is chosen with care to bring you clothing that feels as beautiful as it looks." },
      { "heading": "Our Promise to You", "body": "Whether you're shopping for a wedding, festival, or everyday elegance, Saabi Designes ensures the finest quality at honest prices. We offer free delivery on orders over ₹999, easy 30-day returns, and a team that genuinely cares about your experience." }
    ],
    "stats": [
      { "value": "10K+", "label": "Happy Customers" },
      { "value": "300+", "label": "Traditional Styles" },
      { "value": "5★", "label": "Avg. Rating" }
    ]
  },
  "contact": {
    "heroTitle": "Get in Touch",
    "heroSubtitle": "We're here to help with orders, sizing, and more",
    "info": [
      { "icon": "📍", "label": "Location", "value": "Chennai, Tamil Nadu, India" },
      { "icon": "📞", "label": "Phone", "value": "+91 98765 43210" },
      { "icon": "🕐", "label": "Hours", "value": "Mon–Sat: 9AM – 7PM" }
    ]
  },
  "store": {
    "brandName": "Saabi Designes",
    "tagline": "Fashion Boutique",
    "email": "",
    "phone": "+91 98765 43210",
    "whatsapp": "",
    "instagram": "",
    "freeShippingThreshold": "999",
    "shippingCost": "99",
    "returnDays": "30"
  },
  "checkout": {
    "upiVpa": "saabiboutique@ybl",
    "upiMerchantName": "Saabi Designes",
    "enableUpi": true,
    "enableCard": true,
    "enableCod": true,
    "successMessage": "Your order is confirmed and will be delivered in 5–7 business days.",
    "headerTag": "✦ SAABI DESIGNES ✦"
  }
}
$$::jsonb);

insert into public.discount_codes (code, type, value, min_order, max_uses, uses, expiry, active) values
  ('SAABI20',   'percent', 20,  500,  100, 48, '31 Jul 2026', true),
  ('WELCOME10', 'percent', 10,  0,    50,  12, '31 Dec 2026', true),
  ('FLAT100',   'flat',    100, 999,  30,  5,  '15 Jul 2026', false),
  ('FESTIVE30', 'percent', 30,  1500, 20,  0,  '15 Aug 2026', true);
