# Radikal

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- Auth.js v5
- PostgreSQL

## Prerequisites

- Node.js 20+
- npm
- A local PostgreSQL instance or a reachable database URL

## Environment setup

Create a local environment file named `.env` in the project root if it does not already exist.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/radikal"
NEXTAUTH_SECRET="replace-with-a-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
UPSTASH_REDIS_REST_URL="https://YOUR_DATABASE.upstash.io"
UPSTASH_REDIS_REST_TOKEN="replace-with-upstash-rest-token"
# Optional; NEXTAUTH_SECRET is used when this is omitted.
RATE_LIMIT_SECRET="replace-with-a-long-random-string"
```

Set `TRUSTED_PROXY_IP_HEADER` only in deployments whose proxy strips that
header from inbound requests and sets it itself. Without it, IP-based limits
intentionally use a shared bucket rather than trusting client-supplied headers.

Production Sentry source-map uploads require `SENTRY_AUTH_TOKEN` in the build
environment. CI production builds fail when that token is absent.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Push the Prisma schema to your local database:

```bash
npx prisma db push
```

3. Seed the database with sample trips, guides, slots, and a demo user:

```bash
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

5. Open http://localhost:3000

## Project structure highlights

- `src/app/` — app routes, auth pages, booking checkout, and homepage
- `src/components/` — reusable UI components and homepage sections
- `src/lib/` — auth helpers, Prisma client, and server actions
- `prisma/schema.prisma` — Prisma schema and enums
- `prisma/seed-dummy-data.ts` — local seed data
