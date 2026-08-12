# Aplicar migraciones en Supabase

Proyecto: `vtdvwphpjhhxnvezjoxr` (Trenes y Tranvías)

URL: `https://vtdvwphpjhhxnvezjoxr.supabase.co`

## Estado

Migraciones aplicadas vía Supabase MCP (2026-08-13):

1. `20260813_init_inquiries_and_allowlist` — `tyt_inquiries`, `tyt_admin_allowlist`, RLS
2. `20260812_crm_clients_sales` — clients, sales, activity_log, settings, campañas

## Allowlist (obligatorio para Studio)

El Studio solo deja entrar emails presentes en `tyt_admin_allowlist`.

En SQL Editor:

```sql
insert into public.tyt_admin_allowlist (email, display_name)
values ('TU_EMAIL@dominio.com', 'Tu nombre')
on conflict (email) do update set display_name = excluded.display_name;
```

Luego crea la cuenta en `/gestion` con ese mismo email (botón “Crear acceso inicial”) o inicia sesión si ya existe en Auth.

## Verificación

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'tyt_%'
order by table_name;
```
