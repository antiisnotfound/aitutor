-- Phase 5: check-in quizzes and level-up exams.
-- Questions (with answers) are generated and graded on the server; the
-- browser only ever receives questions without answers. Speaking answers
-- are transcribed and the audio is discarded.

create type public.assessment_kind as enum ('checkin', 'levelup');
create type public.assessment_status as enum ('in_progress', 'graded', 'abandoned');

create table public.assessment_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  kind               public.assessment_kind not null,
  level              public.cefr_level not null,          -- level being tested, e.g. 'A1'
  status             public.assessment_status not null default 'in_progress',
  items              jsonb not null,                      -- questions incl. answers + learner responses
  overall            real,                                -- 0–1
  per_skill          jsonb,                               -- {reading: 0.8, listening: …}
  passed             boolean,
  feedback           jsonb,                               -- {toWorkOn: [...], criteria: {...}}
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

create index assessment_attempts_learner on public.assessment_attempts (learner_profile_id, kind, started_at desc);

alter table public.assessment_attempts enable row level security;
-- Learners can read their own results; `items` contains answers, so the app
-- only exposes it through the server. Writes use the secret key.
create policy "Own attempts: read" on public.assessment_attempts
  for select using ((select auth.uid()) = user_id);

-- `items` holds the correct answers: never readable from the browser.
revoke select on public.assessment_attempts from authenticated;
grant select (id, user_id, learner_profile_id, kind, level, status, overall, per_skill, passed, feedback, started_at, completed_at)
  on public.assessment_attempts to authenticated;
