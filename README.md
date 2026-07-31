# Radikal

Radikal is a Next.js MVP for an adventure sports booking platform focused on small-group experiences in the Indian Himalayas. The experience currently covers guided tours in Manali, Ladakh, Kashmir, and Lahaul-Spiti with activities such as snowboard, ski, bike, and trek.

## What’s included

- Modern landing experience for tours, travel styles, guides, and testimonials
- Auth flow with email/password login and signup using Auth.js v5
- Booking flow with a pending booking creation action and a dummy payment confirmation action
- Seeded local data for tours, guides, slots, and a demo user
- Prisma + PostgreSQL data layer for activities, bookings, guides, and reviews

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
```

## Local development

1. Install dependencies:

```bash
npm install
```

2. Push the Prisma schema to your local database:

```bash
npx prisma db push
```

3. Seed the database with sample tours, guides, slots, and a demo user:

```bash
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

5. Open http://localhost:3000

## Demo credentials

- Email: `demo@radikal.travel`
- Password: `password123`

## Project structure highlights

- `src/app/` — app routes, auth pages, booking checkout, and homepage
- `src/components/` — reusable UI components and homepage sections
- `src/lib/` — auth helpers, Prisma client, and server actions
- `prisma/schema.prisma` — Prisma schema and enums
- `prisma/seed.ts` — local seed data

## Notes

The booking flow is intentionally MVP-focused. Payments are simulated via a dummy action that marks a booking as confirmed directly after a short delay.
