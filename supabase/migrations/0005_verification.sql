-- Shundori Phase 4 — read-only helpers used by scripts/verify-supabase.mjs.
-- These functions expose schema metadata only (no application rows) and are
-- safe for the anon key because they are security definer with a fixed search
-- path and return no user data.

create or replace function public.phase4_rls_report()
returns table (table_name text, row_security boolean, policies text[])
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select
    c.relname::text as table_name,
    c.relrowsecurity as row_security,
    coalesce(
      array_agg(p.polname::text order by p.polname) filter (where p.polname is not null),
      '{}'::text[]
    ) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public'
    and c.relname in ('profiles', 'brands', 'categories', 'products', 'orders', 'order_items')
  group by c.relname, c.relrowsecurity
  order by c.relname;
$$;

create or replace function public.phase4_fk_report()
returns table (table_name text, foreign_keys text[])
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select
    c.relname::text as table_name,
    coalesce(
      array_agg(pg_get_constraintdef(con.oid) order by con.conname)
        filter (where con.oid is not null),
      '{}'::text[]
    ) as foreign_keys
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_constraint con on con.conrelid = c.oid and con.contype = 'f'
  where n.nspname = 'public'
    and c.relname in ('profiles', 'brands', 'categories', 'products', 'orders', 'order_items')
  group by c.relname
  order by c.relname;
$$;

create or replace function public.phase4_storage_report()
returns table (
  bucket_id text,
  is_public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select
    buckets.id::text as bucket_id,
    buckets.public as is_public,
    buckets.file_size_limit::bigint as file_size_limit,
    coalesce(buckets.allowed_mime_types, '{}'::text[]) as allowed_mime_types
  from storage.buckets buckets
  where buckets.id = 'product-images';
$$;

revoke all on function public.phase4_rls_report() from public;
grant execute on function public.phase4_rls_report() to anon, authenticated, service_role;

revoke all on function public.phase4_fk_report() from public;
grant execute on function public.phase4_fk_report() to anon, authenticated, service_role;

revoke all on function public.phase4_storage_report() from public;
grant execute on function public.phase4_storage_report() to anon, authenticated, service_role;
