-- supabase/migrations/20260812_crm_clients_sales.sql
create extension if not exists pgcrypto;

create table if not exists public.tyt_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.tyt_settings (key, value) values
  ('client_fiche_threshold', '3'::jsonb),
  ('default_municipal_election_year', '2027'::jsonb)
on conflict (key) do nothing;

create table if not exists public.tyt_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  location text,
  notes text,
  is_municipality boolean not null default false,
  election_year int,
  next_recontact_at date,
  last_recontact_at timestamptz,
  sales_count int not null default 0,
  sales_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tyt_clients_email_idx on public.tyt_clients (lower(email));
create index if not exists tyt_clients_municipality_idx on public.tyt_clients (is_municipality);

create table if not exists public.tyt_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.tyt_clients(id) on delete set null,
  inquiry_id uuid references public.tyt_inquiries(id) on delete set null,
  amount_eur numeric(12,2),
  sold_at date not null default (timezone('utc', now()))::date,
  concept text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tyt_sales_sold_at_idx on public.tyt_sales (sold_at desc);

create table if not exists public.tyt_activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.tyt_recontact_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  election_year int not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.tyt_recontact_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.tyt_recontact_campaigns(id) on delete cascade,
  client_id uuid not null references public.tyt_clients(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','contacted','continues','stopped')),
  notes text,
  updated_at timestamptz not null default now(),
  unique (campaign_id, client_id)
);

-- RLS: solo usuarios en tyt_admin_allowlist (mismo criterio que studio)
alter table public.tyt_settings enable row level security;
alter table public.tyt_clients enable row level security;
alter table public.tyt_sales enable row level security;
alter table public.tyt_activity_log enable row level security;
alter table public.tyt_recontact_campaigns enable row level security;
alter table public.tyt_recontact_items enable row level security;

create or replace function public.tyt_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tyt_admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy tyt_settings_admin on public.tyt_settings for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_clients_admin on public.tyt_clients for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_sales_admin on public.tyt_sales for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_activity_admin on public.tyt_activity_log for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaigns_admin on public.tyt_recontact_campaigns for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaign_items_admin on public.tyt_recontact_items for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());

-- inquiries: asegurar default status new si aún no
alter table public.tyt_inquiries alter column status set default 'new';
