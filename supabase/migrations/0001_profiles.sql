-- Phase 1: one profile row per auth user.
-- Learner profiles, skill map, sessions, vocabulary etc. come in later phases.

create type public.age_group as enum ('kid', 'teen', 'adult');

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  age_group        public.age_group,            -- null until captured (e.g. Google sign-in)
  native_language  text not null default 'en' check (native_language in ('en', 'sq', 'it')),
  -- Kids: the parent/guardian account that consented.
  parent_id        uuid references public.profiles (id) on delete set null,
  parental_consent_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "Parents read their children" on public.profiles
  for select using ((select auth.uid()) = parent_id);

create policy "Users update own profile" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Keep updated_at fresh.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create the profile automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, age_group, native_language)
  values (
    new.id,
    coalesce(meta ->> 'full_name', meta ->> 'name', split_part(new.email, '@', 1)),
    case when meta ->> 'age_group' in ('kid', 'teen', 'adult')
         then (meta ->> 'age_group')::public.age_group end,
    case when meta ->> 'native_language' in ('en', 'sq', 'it')
         then meta ->> 'native_language' else 'en' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may only edit safe columns; consent/parent links are set server-side.
revoke update on public.profiles from authenticated;
grant update (display_name, age_group, native_language) on public.profiles to authenticated;
