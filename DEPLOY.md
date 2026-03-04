# Production deployment (Vercel)

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (for Production, Preview, and optionally Development):

| Variable        | Required | Description |
|----------------|----------|-------------|
| `DATABASE_URL` | Yes      | PostgreSQL connection string (e.g. Neon, Supabase, Vercel Postgres). Must be set for the app to start; the app will throw a clear error on first DB access if missing. |

No `.env` file is required in production; Vercel injects these at runtime.

## Database migrations (production)

The project uses **Prisma Migrate**. Do **not** use `prisma db push` in production (it can cause data loss and is not safe for team deployments).

### First-time setup (new production DB)

1. Ensure your production PostgreSQL database is created and you have its connection string.
2. Set `DATABASE_URL` in Vercel to that connection string.
3. Run migrations **once** from your local machine (or a CI job) with the **production** URL:

   ```bash
   # Use the same DATABASE_URL as in Vercel (paste it for this command, or use a .env.production)
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

   Or, if you use a separate env file for prod:

   ```bash
   npx dotenv -e .env.production -- npx prisma migrate deploy
   ```

4. Confirm:

   ```bash
   npx prisma migrate status
   ```

   Should report: "Database schema is up to date."

### After schema changes

1. Create a new migration locally (against your dev DB):

   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. Deploy the migration to production **before** or **right after** deploying the app:

   ```bash
   DATABASE_URL="<production-url>" npx prisma migrate deploy
   ```

3. Deploy the new app version to Vercel.

## Deploy steps on Vercel

1. **Connect repository**
   - Vercel → Add New Project → Import your Git repo.

2. **Set environment variables**
   - Project → Settings → Environment Variables:
     - `DATABASE_URL` = your production PostgreSQL URL (e.g. Neon connection string).
   - Apply to: Production (and Preview if you use preview deployments).

3. **Run migrations**
   - From your machine (or CI), run:
     ```bash
     DATABASE_URL="<your-production-DATABASE_URL>" npx prisma migrate deploy
     ```
   - Do this **before** or immediately after the first deploy so the DB schema matches the app.

4. **Build and deploy**
   - Vercel runs `npm run build` (which runs `prisma generate && next build`).
   - No need to commit `.env`; Vercel uses the variables you configured.

5. **Optional: Postgres on Vercel**
   - If you use Vercel Postgres, `DATABASE_URL` is set automatically when you attach the storage.

## Session cookies (HTTPS)

- Login/register set the session cookie with `secure: process.env.NODE_ENV === "production"`, so on Vercel (HTTPS) the cookie is `Secure`.
- `sameSite: "lax"`, `httpOnly: true`, `path: "/"` are already set. No change needed for Vercel.

## Smoke test checklist after deploy

1. **Health**
   - Open the app URL; you should see the app (or redirect to login).

2. **Auth**
   - Open `/register`; register a new user; you should be redirected and see the app.
   - Open `/login`; log in with that user; you should be in the app.
   - Call `GET /api/auth/me` with the same browser (cookies sent); response should include `user: { id, username }`.

3. **Logout**
   - Click logout (or call `POST /api/auth/logout` with credentials); you should be redirected to `/login` and `GET /api/auth/me` should return `user: null`.

4. **Protected routes**
   - Log out, then open a protected route (e.g. `/` or `/profile`); you should be redirected to `/login?next=...`.
   - Log in again; you should be redirected back to the requested page.

5. **API**
   - While logged in, create a project (if the app has project API); list projects; ensure only your user’s data is returned.

If any step fails, check Vercel Function logs and ensure `DATABASE_URL` is set and migrations have been run.
