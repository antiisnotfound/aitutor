-- Phase 2: one learner profile per (user, target language) + CEFR skill map.

create type public.cefr_level as enum ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.learning_goal as enum ('trip', 'work_study', 'exam', 'heritage', 'moving', 'words');
create type public.skill as enum ('speaking', 'listening', 'reading', 'writing');
create type public.tutor_gender as enum ('female', 'male');
create type public.skill_status as enum ('not_seen', 'practising', 'mastered');

create table public.learner_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  target_language  text not null check (target_language in ('en', 'it', 'sq')),
  level            public.cefr_level not null default 'A0',
  goal             public.learning_goal not null,
  focus_skills     public.skill[] not null default '{speaking}' check (cardinality(focus_skills) > 0),
  daily_minutes    smallint not null check (daily_minutes in (10, 15, 20, 30)),
  tutor_gender     public.tutor_gender not null,
  placement_done   boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, target_language)
);

create trigger learner_profiles_touch before update on public.learner_profiles
  for each row execute function public.touch_updated_at();

alter table public.learner_profiles enable row level security;

create policy "Own learner profiles: read" on public.learner_profiles
  for select using ((select auth.uid()) = user_id);
create policy "Own learner profiles: insert" on public.learner_profiles
  for insert with check ((select auth.uid()) = user_id);
create policy "Own learner profiles: update" on public.learner_profiles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Learners pick their plan; level and placement are set by the server's assessment.
revoke update on public.learner_profiles from authenticated;
grant update (goal, focus_skills, daily_minutes, tutor_gender) on public.learner_profiles to authenticated;

-- Which target language the learner is currently studying.
alter table public.profiles
  add column active_language text check (active_language in ('en', 'it', 'sq'));
grant update (active_language) on public.profiles to authenticated;

-- Skill map: one row per CEFR can-do the learner has touched.
-- Missing row = not seen. Written by the server after sessions (Phase 3).
create table public.skill_map_entries (
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  cando_id           text not null,           -- e.g. 'A1.spoken-interaction.greetings'
  status             public.skill_status not null default 'practising',
  evidence           jsonb not null default '[]'::jsonb,  -- [{session_id, note, at}]
  updated_at         timestamptz not null default now(),
  primary key (learner_profile_id, cando_id)
);

alter table public.skill_map_entries enable row level security;

create policy "Own skill map: read" on public.skill_map_entries
  for select using (
    exists (
      select 1 from public.learner_profiles lp
      where lp.id = learner_profile_id and lp.user_id = (select auth.uid())
    )
  );

-- Same for inserts: level/placement keep their defaults.
revoke insert on public.learner_profiles from authenticated;
grant insert (user_id, target_language, goal, focus_skills, daily_minutes, tutor_gender)
  on public.learner_profiles to authenticated;
