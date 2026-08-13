-- Base schema for public leads + Studio admin allowlist
create extension if not exists pgcrypto;

create table if not exists public.tyt_admin_allowlist (
  email text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.tyt_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  source text not null default 'website',
  priority text not null default 'normal',
  project_type text,
  operation text,
  location text,
  message text,
  internal_notes text,
  status text not null default 'new',
  assigned_to text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tyt_inquiries_status_idx on public.tyt_inquiries (status);
create index if not exists tyt_inquiries_created_at_idx on public.tyt_inquiries (created_at desc);

create or replace function public.tyt_set_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tyt_inquiries_updated_at on public.tyt_inquiries;
create trigger tyt_inquiries_updated_at
before update on public.tyt_inquiries
for each row execute function public.tyt_set_updated_at();

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

alter table public.tyt_admin_allowlist enable row level security;
alter table public.tyt_inquiries enable row level security;

drop policy if exists tyt_allowlist_admin_select on public.tyt_admin_allowlist;
create policy tyt_allowlist_admin_select on public.tyt_admin_allowlist
  for select using (public.tyt_is_admin());

drop policy if exists tyt_inquiries_anon_insert on public.tyt_inquiries;
create policy tyt_inquiries_anon_insert on public.tyt_inquiries
  for insert to anon
  with check (
    status = 'new'
    and source = 'website'
    and priority = 'normal'
    and internal_notes is null
    and assigned_to is null
    and next_follow_up_at is null
    and last_contacted_at is null
  );

drop policy if exists tyt_inquiries_admin_all on public.tyt_inquiries;
create policy tyt_inquiries_admin_all on public.tyt_inquiries
  for all to authenticated
  using (public.tyt_is_admin()) with check (public.tyt_is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.tyt_admin_allowlist to authenticated;
grant insert on public.tyt_inquiries to anon, authenticated;
grant select, update, delete on public.tyt_inquiries to authenticated;
