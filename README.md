# Furtiluna — Serverless Application & Scheduling Backend

Backend-first web app that collects applications, qualifies leads, manages admin-controlled time slots, and books Zoom meetings with email notifications using Vercel serverless functions.

Live demo: https://furtiluna.com

## Problem this solves

This project replaces a manual workflow (collecting applications, deciding who qualifies, scheduling calls, and sending meeting details) with a small backend that:

- Accepts and validates application/contact submissions
- Lets an admin publish time slots without building a full admin app
- Prevents double-booking in a concurrent environment
- Automatically creates a Zoom meeting and emails both parties

## Backend-focused features

- **Serverless REST API** on Vercel under `api/`.
- **Input validation + sanitization** (trim/length checks, email regex, safe JSON formatting).
- **Abuse prevention** on contact submissions (honeypot field; bot requests get a fake success response).
- **Admin-only scheduling** via HTTP Basic Auth for managing time slots.
- **Concurrency-safe booking** (atomic DB update to lock a slot and return `409` on contention).
- **External integrations**:
  - SendGrid for email delivery
  -  Zoom REST APIs (meeting creation via OAuth)
- **PostgreSQL + Prisma** for persistence (availability slots + bookings).

## Tech stack

**Frontend**
- HTML/CSS/vanilla JS (static site)

**Backend**
- Node.js (Vercel Serverless Functions)
- PostgreSQL + Prisma ORM
- SendGrid (`@sendgrid/mail`) for transactional emails
- Zoom REST APIs (Server-to-Server OAuth)

## High-level architecture

Request flow (happy path):

1. User fills application form in the UI.
2. If the user qualifies (simple rules in the UI), the UI loads slots from the backend.
3. User selects a slot → backend locks the slot in Postgres.
4. Backend creates a Zoom meeting.
5. Backend stores the booking record.
6. Backend emails the owner + the customer with Zoom details.

System components:

- Static pages (`index.html`, `contact.html`) hosted by Vercel
- Serverless API routes (`api/*.js`) for business logic
- Postgres database accessed via Prisma (`lib/prisma.js`, `prisma/schema.prisma`)
- SendGrid + Zoom as external providers

## API (backend responsibilities)

All endpoints return JSON.

### `POST /api/contact`

Purpose: accept a contact/application message and email the site owner.

- Validates inputs (email format, phone length, message length)
- Honeypot anti-spam: if `company` is present → return `200 { ok: true }` without sending email
- Uses environment variables for SendGrid and recipient lists
- Avoids leaking provider errors to clients

Request body:
```json
{ "email": "user@example.com", "phone": "+370...", "message": "Hello", "company": "" }
```

Responses:
- `200` success (or fake success for bots)
- `400` invalid/missing fields
- `405` wrong method
- `500` server misconfigured / unexpected error
- `502` email provider failed

### `GET /api/availability?limit=50`

Purpose: list upcoming unbooked availability slots.

- Filters out past slots and already-booked slots
- Applies a safe limit clamp (1..200)

Responses:
- `200` `{ ok: true, slots: [...] }`
- `405` wrong method

### `POST /api/book`

Purpose: book a slot, create a Zoom meeting, persist a booking, and send emails.

- Validates required fields and email format
- Checks slot existence and rejects already-booked slots
- Prevents “too-soon” bookings (slot must be at least ~1 minute in the future)
- **Concurrency control:** atomically locks the slot using `updateMany(where: { bookedAt: null })` and returns `409` if another request won the race
- Creates a Zoom meeting via OAuth token exchange + Zoom meeting API
- Saves booking details (including Zoom join/start URLs)
- Sends transactional emails to both owner(s) and the customer

Responses:
- `200` success with booking/Zoom details
- `400` invalid fields / slot too soon
- `404` slot not found
- `409` slot already booked
- `405` wrong method
- `502` external dependency failure (Zoom/SendGrid) without leaking internals

### `GET|POST|DELETE /api/admin/slots`

Purpose: admin-only slot management.

- Uses HTTP Basic Auth (`ADMIN_NAME`, `ADMIN_PASSWORD`)
- `GET`: list upcoming slots (including booked ones)
- `POST`: create a slot from `startTime + durationMinutes` (prevents duplicates, returns `409`)
- `DELETE`: remove a slot by `id` (cascades booking deletion via Prisma relation)

Responses:
- `200`/`201` success
- `400` invalid input
- `401` unauthorized (`WWW-Authenticate: Basic realm="Admin"`)
- `405` wrong method
- `500` server/config/schema errors
- `409` duplicate slot

## Validation, error handling, and security decisions

- **Validation exists** to avoid bad data reaching third-party providers (SendGrid/Zoom) and to keep DB records consistent.
- **Clear status codes** (`400/401/404/409/405/5xx`) make the UI logic predictable and reduce hidden failures.
- **Abuse prevention** (honeypot) reduces spam without adding a CAPTCHA dependency.
- **Secrets are never shipped to the browser**; SendGrid/Zoom/DB credentials only live in environment variables.
- **Admin actions are protected** by HTTP Basic Auth (simple and effective for a small internal admin surface).

## Environment variables

Email (SendGrid):
- `SENDGRID_API_KEY`
- `CONTACT_FROM_EMAIL` (must be a verified sender/domain in SendGrid)
- `CONTACT_TO_EMAIL` (recipient; can be comma-separated)

Database:
- `DATABASE_URL` (Postgres connection string used by Prisma)

Admin auth (for `/api/admin/slots`):
- `ADMIN_NAME`
- `ADMIN_PASSWORD`

Zoom (Server-to-Server OAuth):
- `Zoom_Client_ID`
- `Zoom_Client_Secret`
- `ZOOM_Account_ID`

## Deployment notes (Vercel)

- Add env vars in Vercel → Project Settings → Environment Variables.
- Ensure production DB schema is deployed:
- `npx prisma migrate deploy` (run against the production `DATABASE_URL`)
- Use Vercel Function logs when debugging SendGrid/Zoom failures.

## What I learned

- How to design small, reliable backend workflows that integrate external APIs.
- Why status codes and error boundaries matter in production (especially with third-party dependencies).
- How to handle concurrency issues (double booking) in a serverless context.
- Practical secret management and deployment debugging on Vercel.

## Responsible AI usage

I used AI tools to speed up iteration (drafting helper functions, improving wording, and suggesting implementation options). All architectural decisions, validation rules, external integrations (SendGrid/Zoom), and deployment/debugging steps were implemented and verified by me.

## Future improvements

- Add IP-based rate limiting and/or CAPTCHA for `/api/contact`.
- Enforce qualification rules server-side (currently the UI controls the flow).
- Add a compensation mechanism to release a slot if downstream steps fail.
- Add automated tests for endpoint validation and booking race conditions.

