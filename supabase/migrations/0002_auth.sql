-- 0002_auth.sql — profiles, roles, and RLS helper functions.
-- Introduces auth: every auth.users row gets a profile; role + financial flag
-- drive access control. RLS is enabled here for profiles and (in 0003/0004)
-- for the rest. Cycle 5.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin', 'member', 'external')),
  can_see_financials boolean not null default false
);

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS helper functions. SECURITY DEFINER so they read profiles without being
-- subject to profiles' own RLS (which would otherwise recurse).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'member')
  );
$$;

create or replace function public.has_financial_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or can_see_financials)
  );
$$;

-- Profiles RLS: a user reads their own row; admins read/write everyone.
alter table public.profiles enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());
