-- Phase 3: conversation sessions, vocabulary review queue, AI usage log.
-- Learners can read their own rows. All writes go through the server
-- (secret key), because summaries, skill updates and scores must be trusted.

create type public.session_status as enum ('active', 'completed', 'abandoned');
create type public.session_mode as enum ('placement', 'practice');
create type public.vocab_kind as enum ('word', 'phrase');

create table public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  mode               public.session_mode not null,
  status             public.session_status not null default 'active',
  planned_minutes    smallint,                       -- null = open-ended (hard cap applies)
  hidden_goal        jsonb not null,                 -- {candoIds, focus, review}
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  duration_seconds   integer,
  transcript         jsonb not null default '[]'::jsonb,  -- [{role, text, at}] — no raw audio stored
  events             jsonb not null default '[]'::jsonb,  -- corrections / object pop-ups shown
  summary            jsonb                            -- {learned, keepInMind, newWords, …}
);

create index sessions_learner_started on public.sessions (learner_profile_id, started_at desc);

alter table public.sessions enable row level security;
create policy "Own sessions: read" on public.sessions
  for select using ((select auth.uid()) = user_id);

create table public.vocabulary_items (
  id                 uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  kind               public.vocab_kind not null default 'word',
  term               text not null,               -- target language
  translation        text not null,               -- learner's native language
  note               text,                        -- e.g. the rule behind a correction
  source_session_id  uuid references public.sessions (id) on delete set null,
  -- Spaced repetition state (SM-2 style; Phase 5 does the reviewing)
  due_at             timestamptz not null default now() + interval '1 day',
  interval_days      real not null default 1,
  ease               real not null default 2.5,
  reps               integer not null default 0,
  lapses             integer not null default 0,
  created_at         timestamptz not null default now()
);

create unique index vocabulary_items_unique_term
  on public.vocabulary_items (learner_profile_id, kind, lower(term));
create index vocabulary_items_due on public.vocabulary_items (learner_profile_id, due_at);

alter table public.vocabulary_items enable row level security;
create policy "Own vocabulary: read" on public.vocabulary_items
  for select using (
    exists (
      select 1 from public.learner_profiles lp
      where lp.id = learner_profile_id and lp.user_id = (select auth.uid())
    )
  );

-- Token / minute usage, so pricing can be worked out later.
create table public.ai_usage (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  session_id          uuid references public.sessions (id) on delete set null,
  kind                text not null,      -- realtime | summary | translate
  provider            text not null,
  model               text not null,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  input_audio_tokens  integer not null default 0,
  output_audio_tokens integer not null default 0,
  audio_seconds       integer not null default 0,
  created_at          timestamptz not null default now()
);

create index ai_usage_user on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
-- No user policies: internal accounting only.
