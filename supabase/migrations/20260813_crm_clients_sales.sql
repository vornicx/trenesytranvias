-- CRM clients, sales, settings and municipal follow-up
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
  is_important boolean not null default false,
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
create unique index if not exists tyt_sales_inquiry_unique_idx
  on public.tyt_sales (inquiry_id)
  where inquiry_id is not null;

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

revoke execute on function public.tyt_is_admin() from public;
revoke execute on function public.tyt_is_admin() from anon;
grant execute on function public.tyt_is_admin() to authenticated;

create policy tyt_settings_admin on public.tyt_settings for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_clients_admin on public.tyt_clients for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_sales_admin on public.tyt_sales for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_activity_admin on public.tyt_activity_log for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaigns_admin on public.tyt_recontact_campaigns for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaign_items_admin on public.tyt_recontact_items for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());

-- inquiries: asegurar default status new si aún no
alter table public.tyt_inquiries alter column status set default 'new';

create or replace function public.tyt_mark_inquiry_won(
  p_inquiry_id uuid,
  p_amount_eur numeric default null,
  p_concept text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inquiry public.tyt_inquiries%rowtype;
  v_client public.tyt_clients%rowtype;
  v_sale public.tyt_sales%rowtype;
  v_existing_sale public.tyt_sales%rowtype;
  v_is_municipality boolean;
  v_actor_email text;
begin
  if not public.tyt_is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_amount_eur is not null and p_amount_eur < 0 then
    raise exception 'invalid_sale_amount' using errcode = '22003';
  end if;

  select * into v_inquiry
  from public.tyt_inquiries
  where id = p_inquiry_id
  for update;
  if not found then
    raise exception 'inquiry_not_found' using errcode = 'P0002';
  end if;

  select * into v_existing_sale
  from public.tyt_sales
  where inquiry_id = p_inquiry_id;
  if found then
    select * into v_client from public.tyt_clients where id = v_existing_sale.client_id;
    if v_inquiry.status <> 'won' then
      update public.tyt_inquiries set status = 'won' where id = p_inquiry_id returning * into v_inquiry;
    end if;
    return jsonb_build_object(
      'inquiry', to_jsonb(v_inquiry),
      'client', to_jsonb(v_client),
      'sale', to_jsonb(v_existing_sale),
      'created', false
    );
  end if;

  update public.tyt_inquiries
  set status = 'won'
  where id = p_inquiry_id
  returning * into v_inquiry;

  v_is_municipality := lower(concat_ws(' ', v_inquiry.name, v_inquiry.company, v_inquiry.message))
    like '%ayuntamiento%';

  if nullif(trim(v_inquiry.email), '') is not null then
    select * into v_client
    from public.tyt_clients
    where lower(trim(email)) = lower(trim(v_inquiry.email))
    order by created_at
    limit 1;
  end if;
  if v_client.id is null then
    select * into v_client
    from public.tyt_clients
    where lower(trim(name)) = lower(trim(v_inquiry.name))
      and lower(trim(coalesce(company, ''))) = lower(trim(coalesce(v_inquiry.company, '')))
    order by created_at
    limit 1;
  end if;

  if v_client.id is null then
    insert into public.tyt_clients (name, company, email, phone, location, is_municipality)
    values (
      v_inquiry.name,
      v_inquiry.company,
      nullif(trim(v_inquiry.email), ''),
      v_inquiry.phone,
      v_inquiry.location,
      v_is_municipality
    )
    returning * into v_client;
  elsif v_is_municipality and not v_client.is_municipality then
    update public.tyt_clients
    set is_municipality = true, updated_at = now()
    where id = v_client.id
    returning * into v_client;
  end if;

  insert into public.tyt_sales (client_id, inquiry_id, amount_eur, concept)
  values (v_client.id, p_inquiry_id, p_amount_eur, nullif(trim(p_concept), ''))
  returning * into v_sale;

  update public.tyt_clients
  set sales_count = sales_count + 1,
      sales_total = sales_total + coalesce(p_amount_eur, 0),
      updated_at = now()
  where id = v_client.id
  returning * into v_client;

  v_actor_email := auth.jwt() ->> 'email';
  insert into public.tyt_activity_log (entity_type, entity_id, action, actor_email, meta)
  values (
    'inquiry',
    p_inquiry_id,
    'won',
    v_actor_email,
    jsonb_build_object(
      'client_id', v_client.id,
      'sale_id', v_sale.id,
      'amount_eur', p_amount_eur
    )
  );

  return jsonb_build_object(
    'inquiry', to_jsonb(v_inquiry),
    'client', to_jsonb(v_client),
    'sale', to_jsonb(v_sale),
    'created', true
  );
end;
$$;

revoke execute on function public.tyt_mark_inquiry_won(uuid, numeric, text) from public;
revoke execute on function public.tyt_mark_inquiry_won(uuid, numeric, text) from anon;
grant execute on function public.tyt_mark_inquiry_won(uuid, numeric, text) to authenticated;
