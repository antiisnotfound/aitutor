# [APP NAME] — AI language tutor

Learners improve by talking with a realistic 3D tutor on a video-call-style screen.
Partner: Discover Albania. Full product brief: `claude-code-brief.md` (kept outside the repo).

## Stack
Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 (brand tokens in `src/app/globals.css`) ·
next-intl (en / sq / it, locale-prefixed URLs) · Supabase (Postgres, Auth with Google + email, RLS).

## Run locally
```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000
npm test                     # unit tests (scheduling, scoring, estimates)
```
Without Supabase keys the app runs in **demo mode** (development only): the login screen offers
"Try the demo", which creates a throwaway local account stored in a cookie, so every screen can be tried.
Without `OPENAI_API_KEY`, development uses a scripted demo tutor (browser speech, no voice recognition)
so the whole call → summary loop can be clicked through.

## Supabase setup (one-time)
1. Create a project at supabase.com. Copy **Project URL**, **Publishable key** and **Secret key** into `.env.local`.
2. SQL editor → run each file in `supabase/migrations/` in order (`0001_…` to `0004_…`).
3. Auth → URL configuration: Site URL `http://localhost:3000`, add redirect URL `http://localhost:3000/auth/callback`.
4. Auth → Providers → Google: enable, paste the Google OAuth client ID/secret
   (Google Cloud console → OAuth client, authorised redirect URI = the callback URL Supabase shows).

## 3D tutor (Phase 4)
The tutor is a TalkingHead (three.js) avatar with audio-driven lip-sync (HeadAudio) on the live voice
stream, so it works for any language. Avatars are GLB files (Avaturn Type-2 exports work as-is) named
per tutor in `src/config/avatars.ts`; host them in `public/avatars/` (git-ignored) or a CDN and set
`NEXT_PUBLIC_AVATAR_BASE_URL`. Without avatars, on weak devices (or < 12 fps) the still portrait is shown.
`npm run dev` / `build` copy the lip-sync worklet + model into `public/vendor/` automatically.

## Review & tests (Phase 5)
- **Word review**: flashcards with SM-2-style spaced repetition (`src/lib/learning/srs.ts`).
- **Check-in quiz** (every 14 days, configurable): ~10 questions built from the learner's own recent words and
  phrases (topped up with A1 starter words). Missed words go straight back into review and into the next
  conversation's hidden goal.
- **Level-up exam A1**: reading, listening, writing, speaking — original questions in the style of Cambridge /
  DELF / CELI (`src/content/exam-a1.ts`). Objective parts auto-scored; writing and speaking scored by the AI
  against fixed 0–4 rubrics. Pass: 70 % overall and no part under 50 % (`src/config/app.ts`). Unlocks at 60 %
  of A1 can-dos mastered; failed attempts can be retaken after 3 days (both configurable; gate skipped in demo).
- Questions with answers are built and graded on the server; the browser never receives the answers.
  Spoken answers are transcribed and the audio is discarded.

## Where things live
| Path | What |
|---|---|
| `src/config/app.ts` | App name placeholder, language pairs, session caps, pass rule defaults |
| `src/config/learning.ts` | CEFR levels & hours, goals, skills, tutors per language, pair difficulty |
| `src/content/cefr-a1.ts` | A1 can-do checklist (paraphrased CEFR Companion Volume descriptors) |
| `src/lib/learning/` | Time-to-next-level estimate, level progress from the skill map |
| `src/lib/user.ts` | Current user + active learner profile + skill map (Supabase or demo) |
| `src/app/[locale]/onboarding` | 4-step onboarding wizard and save action |
| `src/lib/ai/` | **AI adapter** (the only place that talks to a vendor): OpenAI + mock providers, tutor prompt, tools |
| `src/lib/ai/client/` | Browser side of the live call: OpenAI WebRTC transport + mock transport |
| `src/lib/data/` | Sessions, skill map, vocabulary, usage storage (Supabase or demo memory) |
| `src/app/api/session/` | Start (hidden goal + realtime key), caption translation, end (assessment + saves) |
| `src/app/[locale]/(focus)/session` | Live video-call screen and session summary |
| `src/lib/avatar/engine.ts` + `src/components/tutor/` | 3D tutor (lazy-loaded), lip-sync, portrait fallback |
| `src/config/avatars.ts` | Avatar file per tutor, framing and blend-shape baseline |
| `src/lib/assessment/` + `src/components/assessment/` | Quiz/exam building, grading, availability, runner UI |
| `src/content/a1-words.ts`, `src/content/exam-a1.ts` | A1 starter words, exam papers and rubrics |
| `src/i18n/` + `messages/*.json` | Locales and UI strings |
| `src/proxy.ts` | Locale routing, session refresh, signed-in/out redirects |
| `src/lib/supabase/` | Server + proxy Supabase clients |
| `src/app/[locale]/login` | Login & native-language screen, auth server actions |
| `src/app/[locale]/(app)` | Signed-in area: theme (adult/kids) + bottom nav |
| `src/app/auth/callback` | OAuth / email-confirmation landing |
| `supabase/migrations` | Database schema + RLS |
