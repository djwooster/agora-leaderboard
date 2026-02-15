# Agora Leaderboard

## What This App Does
A mobile-first group fitness challenge tracker. Anyone can create a challenge with custom
metrics and share a link. Participants log their daily activity; a live leaderboard ranks
everyone by cumulative points and streak. No accounts required — identity is persisted per
challenge in localStorage.

## Tech Stack
- Next.js 16 with TypeScript (App Router)
- Tailwind CSS v4
- shadcn/ui for components
- Supabase for database + realtime (Postgres, no ORM — Supabase JS client only)
- nanoid for token generation
- date-fns for date math

## Design Language
Notion-inspired: clean, minimal, fast to use.
- Neutral/white backgrounds — no loud colors
- Tight border-radius (`--radius: 0.375rem`)
- Geist Sans font
- Thin borders, no drop shadows on cards
- Muted foreground for secondary info (`text-muted-foreground`)
- Small, tight typography (`text-sm` as the base for body content)
- Hover states: subtle `bg-muted` or `bg-muted/30` tint — never heavy highlights
- Mobile-first layouts, max-width `max-w-2xl` centered on desktop

## Folder Structure
/src
  /app                        - All pages (App Router)
    /page.tsx                 - Home: recent challenges list
    /challenge
      /new/page.tsx           - Create challenge (3-step form)
      /[shareToken]/page.tsx  - Live leaderboard
      /[shareToken]/admin/page.tsx - Admin panel
  /components
    /ui                       - shadcn primitives (do not edit directly)
    /layout                   - PageHeader and shared shell components
    /leaderboard              - LeaderboardView, LogDayModal, IdentifyModal
    /challenge                - CreateChallengeForm
  /lib
    /supabase.ts              - Supabase client (single instance, safe SSR fallback)
    /leaderboard.ts           - Score + streak computation (pure functions)
    /tokens.ts                - generateShareToken / generateAdminToken
    /utils.ts                 - shadcn cn() helper
  /types/index.ts             - All shared TypeScript types
/supabase
  /schema.sql                 - Full DDL — run once in Supabase SQL editor or via migrate script

## Coding Rules
- Use TypeScript everywhere — no `any`
- All DB calls happen in `useEffect` or event handlers (never at SSR time)
- Use `"use client"` only when the component needs interactivity or browser APIs
- Prefer server components for pages that only fetch + render
- Handle errors explicitly — show user-facing messages, don't just `console.error`
- Comments only where logic is non-obvious
- Keep components focused — if a component is doing too much, split it

## Data Model
```
challenges    id, name, description, start_date, end_date,
              share_token (public URL key), admin_token (secret URL key),
              is_active, created_at

metrics       id, challenge_id, name, unit, points_per_unit,
              daily_max (optional cap), sort_order, created_at

participants  id, challenge_id, name, avatar_emoji, created_at
              UNIQUE(challenge_id, name)

logs          id, participant_id, metric_id, value, log_date, created_at
              UNIQUE(participant_id, metric_id, log_date)  -- one log per metric per day
```

## Key User Flows
1. **Create challenge** → 3-step form → gets admin URL + share URL
2. **Join** → open share URL → pick name (or add yourself) → stored in localStorage
3. **Log daily** → "Log today" button → multi-metric input modal → upsert to DB
4. **Admin** → admin URL with `?key=` param → manage participants, view links

## Authorization Model
- No auth. Identity = participant name in localStorage per challenge ID.
- Admin access = knowing the `admin_token` value (UUID in the URL `?key=` param).
- The admin_token is validated by comparing the provided key against the DB value.
- Never return `admin_token` in any client-facing query other than the admin page itself.

## Supabase Connection
Two connection strings are needed — both use the **pooler** (not the direct IPv6 host):

- `DATABASE_URL` — Transaction pooler, port **6543** (used by the app at runtime)
  `postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres`

- `DIRECT_URL` — Session pooler, port **5432** (used for migrations / schema changes).
  The IPv6 direct host (`db.[ref].supabase.co`) is often unreachable. Use session pooler:
  `postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres`

Special characters in the password must be URL-encoded: `$` → `%24`, `@` → `%40`, `#` → `%23`

The project ref is `czjhefnewbnajoirtfso`. Region and exact pooler hostname are in the
Supabase dashboard under **Settings → Database → Connection string**.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://czjhefnewbnajoirtfso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
Run schema once: `node scripts/migrate.mjs`
Requires `DB_DIRECT_URL` env var pointing to the session pooler connection string.

## Realtime
Supabase realtime subscriptions are used on the leaderboard page to push live updates
when participants log or join. Subscriptions are set up in `LeaderboardView.tsx` and
cleaned up on unmount. Tables `participants` and `logs` are added to `supabase_realtime`.

## Deployment Notes (Vercel)
- All pages that call Supabase are `"use client"` components — no SSR DB calls
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in Vercel env
- Run schema migration before first deploy (once, not on each deploy)
- No Edge Runtime concerns — no middleware auth, no Prisma

## When Building Features
1. Get it working first — correctness before polish
2. Add error handling and loading states
3. Match the Notion design language (see Design Language above)
4. Keep it mobile-first — test at 390px width first
