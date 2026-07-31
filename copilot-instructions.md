# Copilot Instructions

# Radikal — Adventure Sports Booking Platform

Radikal is a booking platform for adventure sports in the Indian Himalayas
(Manali, Ladakh, Kashmir, Lahaul, Spiti). Activities include snowboard, ski, 
bike, and trek. Custom tours, corporate bookings and specific tours like women only available. Users browse activities, pick a date/slot, pay via
Razorpay, and receive a confirmed booking.

## Tech Stack

- Next.js 15 (App Router), TypeScript (strict mode)
- Tailwind CSS + shadcn/ui components
- Prisma ORM + PostgreSQL (Neon/Supabase)
- Auth.js (NextAuth v5)
- Razorpay for payments (NOT Stripe — India-first, UPI support required)
- Zod for validation
- Deployed on Vercel

## Domain Model (source of truth: prisma/schema.prisma)

- `Activity`: type (SKI | SNOWBOARD | BIKE | TREK), location, price, duration,
  images, difficulty. Treks are custom/configurable, not fixed packages —
  don't assume a trek has a fixed itinerary.
- `Slot`: a bookable date instance of an activity, with `capacity` and
  `booked` count. Never let `booked` exceed `capacity` — always check
  availability inside a transaction before confirming a booking.
- `Booking`: links a user, activity, and slot. Status flow is strictly
  `PENDING -> CONFIRMED -> CANCELLED`. A booking becomes CONFIRMED only after
  a Razorpay webhook confirms payment — never confirm on the client side.
- Prices are stored as integers in paise/rupees (no floats). Only format
  as currency (₹) at the UI display layer, never in stored data or calculations.

## Architecture Conventions

- **Server Components by default.** Add `"use client"` only for interactive
  pieces (forms, date pickers, checkout button, anything using `useState`/
  `useEffect`).
- **Data mutations go through Server Actions**, colocated in `lib/actions/`
  (e.g. `lib/actions/booking.ts`). Use API routes (`app/api/...`) only for
  things that must be routes: webhooks (`app/api/webhooks/razorpay`) and any
  third-party callback URLs.
- **Validation:** every form and server action input is validated with a zod
  schema. Schemas live in `lib/validations/` and are imported by both the
  client form and the server action (single source of truth, no duplicated
  validation logic).
- **Prisma client:** always import the singleton from `lib/prisma.ts`. Never
  instantiate `new PrismaClient()` elsewhere — this breaks on Vercel's
  serverless functions due to connection exhaustion.
- **Auth:** use the `auth()` helper from `lib/auth.ts` in server components/
  actions to get the current session. Never trust a `userId` passed from the
  client — always derive it from the server-side session.
- **File/folder structure:**
  ```
  app/
    (marketing)/        # public pages: landing, about
    (auth)/             # login, signup
    activities/[slug]/  # browse + detail pages
    booking/[activityId]/checkout/
    dashboard/          # user's own bookings
    admin/              # internal CRUD for activities/slots — auth-gated
    api/webhooks/razorpay/
  components/
    ui/                 # shadcn primitives — don't hand-edit unless extending
    activities/
    booking/
  lib/
    prisma.ts
    auth.ts
    razorpay.ts
    actions/
    validations/
  ```

## Styling & UI

- Use Tailwind utility classes directly; use the `cn()` helper from
  `lib/utils.ts` for conditional/merged classNames.
- Prefer composing shadcn/ui primitives (`Button`, `Card`, `Dialog`, `Form`,
  `Select`, `DataTable`) over building new primitives from scratch.
- Keep a consistent visual language for Himalayan/adventure branding: earthy,
  outdoor tones — don't default to generic SaaS blue/indigo palettes unless
  asked.
- Images are a big part of this product (mountains, treks, gear) — always
  use `next/image` with explicit width/height or `fill`, never a bare `<img>`.

## Booking & Payment Flow (be precise here — this is the critical path)

1. User selects an activity + slot on the client.
2. Server Action creates a `Booking` with status `PENDING` and calls
   Razorpay's Orders API to create an order.
3. Client opens Razorpay Checkout with the order ID.
4. On success, Razorpay redirects/callbacks — but the booking is only
   confirmed by the **webhook** (`app/api/webhooks/razorpay/route.ts`)
   verifying the payment signature server-side, never by the client redirect
   alone.
5. Webhook updates `Booking.status` to `CONFIRMED` and increments
   `Slot.booked`, inside a Prisma transaction to avoid overbooking race
   conditions.
6. Always verify Razorpay webhook signatures using the webhook secret before
   trusting payload data.

## What NOT to do

- Don't use Stripe, PayPal, or any non-Razorpay payment flow.
- Don't confirm bookings or grant access based on client-side state alone.
- Don't use floats for money.
- Don't create new Prisma Client instances outside `lib/prisma.ts`.
- Don't fetch data with `useEffect` in a component that could just be a
  Server Component.
- Don't hardcode location/activity lists in components — pull from the DB
  via Prisma so admin can manage listings without a code deploy.

## Environment Variables (expected in .env)

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Commit / PR style

- Small, focused commits per feature (e.g. "add slot availability check to
  booking action", not "update stuff").
- Run `npx prisma generate` after any schema change and commit the migration.