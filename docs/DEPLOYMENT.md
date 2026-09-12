# Deployment

Recommended split: **Vercel** for the Next.js app, **Supabase** (hosted) for
the database/auth. Nothing in this app is tied to Vercel specifically — any
Node.js hosting that supports Next.js works — but Vercel is the
lowest-friction option and is what this guide covers.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Apply the schema: either
   - `npx supabase link --project-ref <your-project-ref>` then
     `npx supabase db push`, or
   - paste the contents of
     `supabase/migrations/20260101000000_initial_schema.sql` into the SQL
     editor and run it once.
3. In **Project Settings → API**, note the Project URL, `anon` publishable
   key, and `service_role` secret key.

## 2. Configure environment variables on your hosting platform

Set these in Vercel's Project Settings → Environment Variables (or your
host's equivalent) for the **Production** environment:

| Variable | Value | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase `anon` key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase `service_role` key | **No — never** |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-study.vercel.app` | Yes |
| `NODE_ENV` | `production` (most platforms set this automatically) | No |

Do not set `NODE_ENV=development` on any deployed/public instance — some
integrity controls and error messages are more permissive in development.

Never commit `.env.local` or paste real keys into `.env.example`.

## 3. Deploy

```bash
git push
```

(Or connect the repository in the Vercel dashboard for automatic deploys on
push.) Vercel auto-detects Next.js; no custom build command is needed.

## 4. Seed the deployed database

Run the seed/admin-creation scripts locally against the **production**
Supabase project by temporarily pointing `.env.local` at it (or by passing
env vars inline):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npx tsx scripts/seed.ts

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npx tsx scripts/create-admin.ts -- --email you@example.edu --password "a-strong-password" --role admin
```

Treat the `service_role` key as a production secret — only run this from a
trusted machine, never in CI logs.

## 5. Post-deploy checklist

- [ ] Visit `/admin/login` and confirm you can sign in with the account you
      just created.
- [ ] Update **Settings** with the real consent text, researcher contact,
      and faculty mentor contact before recruiting participants.
- [ ] Confirm `conditions_mandatory` and `task_counts` in Settings match
      your approved study protocol.
- [ ] Do a full walkthrough of `/study` yourself end-to-end.
- [ ] Confirm exports at `/admin/export` work and contain no unexpected
      fields.
- [ ] If your institution requires it, confirm ethics/IRB approval
      references are recorded wherever your protocol requires (this app
      does not itself claim any approval — see
      [ETHICS_DATA_HANDLING.md](ETHICS_DATA_HANDLING.md)).

## Data retention / backups

Supabase's hosted Postgres includes point-in-time recovery on paid tiers;
configure a backup policy appropriate to your institution's data retention
requirements and record it in **Settings → Data retention policy** (shown
to researchers in the admin console, not to participants).
