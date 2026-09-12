# UROP Language Study Platform

A research data-collection platform for the UROP project:

> **AI-Tool Influence on Code-Switching Patterns Among SRM Students: An
> NLP-Based Register and Code-Mixing Analysis**

It collects three kinds of participant writing under controlled conditions —
**human formal/academic writing**, **human casual communication**, and
**AI-mediated writing** (student prompt → AI output → optional student edit)
— together with writing-process metadata, for later linguistic/NLP analysis.
It is a data-collection instrument, not an analysis tool: raw text is always
preserved verbatim, and no NLP processing runs automatically.

See also: [SETUP.md](docs/SETUP.md) · [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) ·
[RESEARCH_DATA_DICTIONARY.md](docs/RESEARCH_DATA_DICTIONARY.md) ·
[DEPLOYMENT.md](docs/DEPLOYMENT.md) · [ETHICS_DATA_HANDLING.md](docs/ETHICS_DATA_HANDLING.md)

## What's here

**Participant app** (`/study/*`) — instructions → consent → profile → formal
writing → casual replies → AI-mediated task → review → completion.

**Researcher/admin app** (`/admin/*`) — dashboard, participant browser,
sample browser, question-bank editor, CSV/JSON export, and study settings.
Protected by Supabase Auth; participants can never reach it.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS 4**
- **Supabase** (Postgres + Auth) — local dev via the Supabase CLI, hosted via a Supabase project
- **Zod** for request validation, **Vitest** + Testing Library for tests

## Project structure

Next.js is a full-stack framework: the frontend and backend are deliberately
**one deployable unit** (this is the standard, deployment-friendly pattern —
Vercel or any Node host runs a single `next build` output, with no separate
backend server, CORS setup, or second deploy pipeline to maintain). Within
that one app, the three layers are still cleanly separated by folder:

```
UROP/
├── app/                    # FRONTEND — pages, layouts, and only the API
│   ├── study/              #   route handlers Next.js requires to live
│   ├── admin/              #   alongside pages (app/api/**). Each route.ts
│   └── api/                #   under app/api is a BACKEND endpoint.
│
├── components/             # FRONTEND — React components only
│   ├── ui/                 #   generic primitives (Card, Button, Alert...)
│   ├── study/               #   participant-flow specific
│   └── admin/               #   admin-console specific
│
├── lib/                    # BACKEND — business logic, auth, validation
│   ├── auth/                #   session + admin-auth checks
│   ├── api/                 #   shared API error handling
│   ├── study/                #   task assignment, consent, settings
│   ├── supabase/             #   the ONLY place DB clients are constructed
│   ├── utils/                #   pure helpers (word count, integrity flag, CSV)
│   ├── hooks/                # FRONTEND — React hooks (paste-blocking, autosave)
│   └── validation.ts, env.ts
│
├── supabase/migrations/    # DATABASE — schema, as versioned SQL
├── types/database.ts       # DATABASE — row types shared by frontend & backend
├── scripts/                 # one-off backend/DB scripts (seed, create-admin)
├── tests/                  # unit tests
├── docs/                   # setup, schema, data dictionary, deployment, ethics
└── public/                 # FRONTEND — static assets
```

**Why `app/api/**` isn't a separate `backend/` folder:** the App Router
discovers both pages and API routes by scanning `app/`; moving `api/`
outside it isn't a supported Next.js configuration. The database boundary is
already hard: no file outside `lib/supabase/` ever opens a Postgres
connection or holds the service-role key — every other layer goes through
`createSupabaseServiceClient()`/`createSupabaseServerClient()`.

## Quick start (local development)

```bash
npm install
npx supabase start          # starts local Postgres/Auth in Docker
cp .env.example .env.local  # then fill in the values `supabase start` printed
npm run seed                # loads the starter question bank + default settings
npx tsx scripts/create-admin.ts --email you@example.edu --password "a-strong-password" --role admin
npm run dev
```

Then open http://localhost:3000 (participant flow) and
http://localhost:3000/admin/login (researcher console).

Full walkthrough, including a hosted Supabase project and Vercel deployment,
is in [SETUP.md](docs/SETUP.md).

## How participant data flows through the system

1. A participant accepts consent (`POST /api/consent`) → a `participants` row
   and a `study_sessions` row are created; an httpOnly cookie identifies the
   session for the rest of the visit. No name/email is collected.
2. Profile answers are saved to `participant_profiles`.
3. For each condition (formal/casual/ai), the app assigns a randomized subset
   of active tasks from the `tasks` question bank on first visit
   (`task_assignments`), then the participant submits into
   `writing_samples`, `casual_responses`, or `ai_interactions` respectively.
   Word counts, integrity metadata (paste/cut/drop counts, timing, focus
   loss) are recomputed server-side, never trusted from the client.
4. In-progress drafts autosave to `session_drafts` (current text only, not a
   keystroke log) so a refresh doesn't lose work.
5. On the review step, `POST /api/complete` checks the researcher-configured
   mandatory conditions and marks the session `completed`.
6. Researchers browse/export data under `/admin/*`, which reads through the
   Supabase **service-role** key from server-only API routes — the browser
   never talks to the database directly except for admin login.

## Adding or editing research questions

Sign in at `/admin/login`, then go to **Question Bank** to add a task (pick
a condition, write the scenario/instructions, set word-count limits) or
toggle one inactive. Go to **Settings** to change how many tasks per
condition each participant receives, which conditions are mandatory, the
consent text/version, AI tool options, and the current study phase (for
running baseline/follow-up waves without a schema change).

## Exporting the dataset

`/admin/export` offers CSV and JSON downloads per table (participants,
profiles, formal, casual, AI). Every row is keyed by the anonymous
`participant_code` — no internal database UUIDs or identifying fields are
included.

## Known limitations

- **postgrest-js type-inference bug**: the installed `@supabase/postgrest-js`
  resolves `.select()` results to `never` for most non-trivial select
  strings, and `.insert()`/`.update()` to `never` whenever the row has any
  optional field. Every affected call site works around this with the
  library's own `.overrideTypes<T, { merge: false }>()` escape hatch (reads)
  or an `as never` cast on the payload (writes) — see the comment at the top
  of `lib/supabase/server.ts`. Runtime behavior is unaffected; only the
  compile-time type-checking path required the workaround, and it was
  verified against a real local Supabase Postgres instance.
- The `middleware.ts` convention is deprecated in Next 16 in favor of
  `proxy.ts`; it still works fully today and was left as-is to avoid
  unnecessary churn during initial delivery — migrate at your convenience
  with `npx @next/codemod@canary middleware-to-proxy .`.
- No automated end-to-end (Playwright) tests are included; `tests/` covers
  unit-level logic (word/character counting, integrity flagging, CSV export,
  validation schemas, and the paste/cut/drop-blocking hook). The full
  participant → admin flow was manually verified against a local Supabase
  instance during development (see the session's test walkthrough).
- Randomized task assignment has a small theoretical race window if the same
  session calls the assignment endpoint twice concurrently (not a realistic
  scenario for a single-browser participant flow).

## Recommended next steps

- Run `npm run db:types` once you have a linked Supabase project, and adopt
  generated types where the postgrest-js bug above doesn't interfere.
- Add Playwright coverage for the full participant journey and admin auth
  boundary.
- Wire up the (currently unused) `study_phase` support into an admin UI for
  managing multiple waves (baseline/post_exposure/followup) explicitly,
  beyond the single free-text setting field.
- If/when NLP processing is added, write it as new tables
  (`writing_sample_features`, etc.) that reference `writing_samples.id`
  rather than ever mutating `raw_text` in place.
