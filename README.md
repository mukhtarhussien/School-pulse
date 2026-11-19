# Schools Pulse

Next.js school portal starter with the backend from the existing School-pulse project: Neon PostgreSQL, Drizzle ORM, session authentication, admin and student APIs, Google sign-in support, file storage, and the Flutter API.

## Local setup

1. Install dependencies and create a local environment file:

   ```bash
   npm ci
   cp .env.example .env.local
   ```

2. Set at least `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env.local`. Set `NEXT_PUBLIC_APP_URL` to the local or deployed site URL. Generate a session secret with `openssl rand -hex 32`.

3. Apply the Drizzle schema and create the initial administrator:

   ```bash
   npm run db:push
   npm run admin:bootstrap
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Optional integrations

- Google sign-in needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` configured in Google OAuth and the app environment.
- Android app uploads need `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` for an S3-compatible store.
- The Flutter API is documented in [docs/flutter-api.md](docs/flutter-api.md).
- Never commit `.env.local` or expose secrets through `NEXT_PUBLIC_*` variables.

## Database commands

- `npm run db:generate` generates a migration from the Drizzle schema.
- `npm run db:migrate` applies generated Drizzle migrations.
- `npm run db:migrate:sql` applies the hand-written SQL files in `migrations/` (including platform report storage and Google session markers).
- `npm run db:push` syncs the schema directly to the configured PostgreSQL database.
