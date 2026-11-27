-- Shundori Phase 4 — profiles, auth trigger and shared authorization helpers.

create extension if not exists pgcrypto;

-- Shared updated_at trigger used by every application table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_key
  on public.profiles (lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile for every new Auth user. Security definer is required
-- because the user has no profile row yet when the trigger fires.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = coalesce(new.email, ''), updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row execute function public.handle_user_email_change();

-- SECURITY DEFINER avoids recursive profile policy evaluation. Only admins and
-- staff are treated as privileged; all role checks still originate from auth.uid().
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'staff')
  );
$$;

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, email) on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "Profiles are visible to their owner" on public.profiles;
create policy "Profiles are visible to their owner"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "Profiles are visible to admins" on public.profiles;
create policy "Profiles are visible to admins"
on public.profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Owners may update contact details" on public.profiles;
create policy "Owners may update contact details"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins may manage profiles" on public.profiles;
create policy "Admins may manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());
