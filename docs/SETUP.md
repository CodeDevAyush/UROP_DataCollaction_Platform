# Setup

## Prerequisites

- Node.js 20+ and npm
- [Docker](https://www.docker.com/) (for local Supabase) — only needed for local development
- A [Supabase](https://supabase.com) account — only needed for a hosted/production database

## 1. Install dependencies

```bash
npm install
```

## 2. Local database (development)

This project uses the Supabase CLI to run Postgres + Auth locally in Docker.

```bash
npx supabase start
```

The first run downloads several Docker images and can take a few minutes.
When it finishes, it prints a block like:

```json
{"API_URL":"http://127.0.0.1:54321", "ANON_KEY":"...", "SERVICE_ROLE_KEY":"...", ...}
```

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # API_URL above
NEXT_PUBLIC_SUPABASE_ANON_KEY=...                    # ANON_KEY above
SUPABASE_SERVICE_ROLE_KEY=...                        # SERVICE_ROLE_KEY above
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Database migrations in `supabase/migrations/` are applied automatically by
`supabase start` (and by `npm run db:reset`, which re-applies them from
scratch — useful if you change a migration during development).

Useful commands:

```bash
npm run db:start   # start the local stack (same as `supabase start`)
npm run db:stop    # stop it
npm run db:reset   # drop and re-apply all migrations
```

Studio (a GUI for the local database) is available at the `STUDIO_URL`
printed by `supabase start`, typically http://127.0.0.1:54323.

## 3. Seed the question bank and settings

```bash
npm run seed
```

This is idempotent (safe to re-run) and loads:

- 5 formal-writing tasks, 6 casual scenarios, 5 AI-mediated tasks (see
  `scripts/seed.ts` to edit the starter question bank directly, or use the
  admin **Question Bank** page once the app is running)
- default study settings (mandatory conditions, task counts, AI tool
  options, consent version/text placeholders)

## 4. Create your first admin account

```bash
npx tsx scripts/create-admin.ts --email you@example.edu --password "a-strong-password" --name "Your Name" --role admin
```

Roles are `researcher` (default) or `admin` — both can currently use every
admin page; the distinction is there for future permission tiers. Run the
same command again with a different `--role` to promote/demote an existing
account.

> **Windows note:** use `npx tsx scripts/create-admin.ts --email ...` (as
> above), not `npm run create-admin -- --email ...`. On Windows, `npm.cmd`
> strips `--flag` names (but not their values) when forwarding arguments
> after `--`, so the script sees `you@example.edu a-strong-password admin`
> with no flag names attached and prints its usage message instead of
> running. Calling `tsx` directly via `npx` sidesteps npm's argument
> reprocessing entirely. This only affects Windows; macOS/Linux shells are
> unaffected either way.

## 5. Run the app

```bash
npm run dev
```

- Participant flow: http://localhost:3000
- Admin console: http://localhost:3000/admin/login

## 6. Tests

```bash
npm test          # run once
npm run test:watch
```

## 7. Production build

```bash
npm run build
npm start
```

## Using a hosted Supabase project instead of local

1. Create a project at https://supabase.com/dashboard.
2. In the SQL editor (or via `supabase link` + `supabase db push`), apply
   the migration in `supabase/migrations/20260101000000_initial_schema.sql`.
3. In **Project Settings → API**, copy the Project URL, `anon` key, and
   `service_role` key into `.env.local` (or your host's environment
   variable settings for production — see [DEPLOYMENT.md](DEPLOYMENT.md)).
4. Run `npm run seed` and `npx tsx scripts/create-admin.ts ...` again,
   pointed at the hosted project (they read the same `.env.local`).

## Troubleshooting

- **`Missing required environment variable`** — copy `.env.example` to
  `.env.local` and fill in real values; the app fails fast rather than
  silently misbehaving.
- **`npm run create-admin -- --email ...` prints the usage message even
  though you passed the flags** — this is a Windows/npm quirk, not a bug in
  the script. Run `npx tsx scripts/create-admin.ts --email ...` directly
  instead (see the note above).
- **`supabase start` fails to connect to Docker** — make sure Docker Desktop
  (or your Docker daemon) is actually running, not just installed.
- **Admin login says "No admin profile found"** — the Supabase Auth user
  exists but has no matching `admin_profiles` row; re-run
  `npm run create-admin` with the same email.
