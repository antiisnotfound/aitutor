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
```
Without Supabase keys the app runs in **demo mode** (development only): the login screen offers
"Try the demo", which creates a throwaway local account stored in a cookie, so every screen can be tried.

## Supabase setup (one-time)
1. Create a project at supabase.com. Copy **Project URL** and **Publishable key** into `.env.local`.
2. SQL editor → run each file in `supabase/migrations/` in order (`0001_…`, `0002_…`).
3. Auth → URL configuration: Site URL `http://localhost:3000`, add redirect URL `http://localhost:3000/auth/callback`.
4. Auth → Providers → Google: enable, paste the Google OAuth client ID/secret
   (Google Cloud console → OAuth client, authorised redirect URI = the callback URL Supabase shows).

## Where things live
| Path | What |
|---|---|
| `src/config/app.ts` | App name placeholder, language pairs, session caps, pass rule defaults |
| `src/config/learning.ts` | CEFR levels & hours, goals, skills, tutors per language, pair difficulty |
| `src/content/cefr-a1.ts` | A1 can-do checklist (paraphrased CEFR Companion Volume descriptors) |
| `src/lib/learning/` | Time-to-next-level estimate, level progress from the skill map |
| `src/lib/user.ts` | Current user + active learner profile + skill map (Supabase or demo) |
| `src/app/[locale]/onboarding` | 4-step onboarding wizard and save action |
| `src/i18n/` + `messages/*.json` | Locales and UI strings |
| `src/proxy.ts` | Locale routing, session refresh, signed-in/out redirects |
| `src/lib/supabase/` | Server + proxy Supabase clients |
| `src/app/[locale]/login` | Login & native-language screen, auth server actions |
| `src/app/[locale]/(app)` | Signed-in area: theme (adult/kids) + bottom nav |
| `src/app/auth/callback` | OAuth / email-confirmation landing |
| `supabase/migrations` | Database schema + RLS |
