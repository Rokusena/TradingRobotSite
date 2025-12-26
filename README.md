# TradingRobotSite

## Contact + Booking email system (Vercel + SendGrid + Zoom)

### Architecture
Contact form: contact.html + script.js  /api/contact  SendGrid  Inbox

Booking calendar: index.html + script.js  /api/admin/slots + /api/availability + /api/book  Postgres (Prisma) + Zoom  Emails

In this repo:
- Frontend: `contact.html` posts JSON to `/api/contact`.
- Booking UI: `index.html` application modal includes a time-slot picker.
- Admin UI: bottom of `index.html` has an admin login to add available time slots.
- Backend:
	- `api/contact.js` sends contact form emails (SendGrid)
	- `api/admin/slots.js` manages availability slots (Basic auth)
	- `api/availability.js` lists public available slots
	- `api/book.js` books a slot, creates a Zoom meeting, and emails owner + customer

---

### 1) Install dependencies
This project uses the `@sendgrid/mail` package.

The booking calendar uses Prisma + Postgres.

Install:
```bash
npm install
```

---

### 2) Configure environment variables (secrets)
Required:
- `SENDGRID_API_KEY`
- `CONTACT_TO_EMAIL` (recipient; can be a comma-separated list)
- `CONTACT_FROM_EMAIL` (sender; must be a verified sender/domain in SendGrid)

Booking calendar (database):
- `DATABASE_URL` (Postgres connection string used by Prisma)

Booking calendar (admin login, used by the bottom-of-site admin panel):
- `ADMIN_NAME`
- `ADMIN_PASSWORD`

Zoom (Server-to-Server OAuth):
- `Zoom_Client_ID`
- `Zoom_Client_Secret`
- `ZOOM_Account_ID`

Example values (placeholders):
- `CONTACT_TO_EMAIL=test-recipient@example.com`
- `CONTACT_FROM_EMAIL=verified-sender@your-domain.com`

Do not expose secrets in frontend code.

---

### 3) Add environment variables in Vercel
1. Vercel Dashboard  Your Project
2. Settings  Environment Variables
3. Add the variables above for **Production** (and Preview if you want)
4. Redeploy after changing env vars

---

### 4) Resend setup (practical)
### 4) SendGrid setup (practical)
1. Create a SendGrid account
2. Create an API key and store it in `SENDGRID_API_KEY`
3. Verify your sending domain or single sender and use it as `CONTACT_FROM_EMAIL`
4. For testing, set `CONTACT_TO_EMAIL` to a temporary inbox (change later anytime)

---

### 5) Frontend integration
The site submits JSON to `/api/contact`:

Payload:
```json
{ "email": "user@example.com", "phone": "+44...", "message": "Hello" }
```

---

### 6) Testing checklist
Local testing (recommended):
1. `npm install`
2. Create a local `.env.local` (do not commit) with the env vars
3. Initialize Prisma:
	- `npx prisma generate`
	- `npx prisma migrate dev` (creates tables locally)
4. Install Vercel CLI: `npm i -g vercel`
5. Run: `vercel dev`
6. Open the local site:
	- Use the bottom “Admin: manage calendar” section to add a slot
	- Apply and book from the modal; confirm owner + customer emails

Note: testing via VS Code “Live Server” (e.g. `127.0.0.1:5500`) will not run Vercel API Routes, so `/api/contact` won’t work there.

After deployment:
1. Confirm env vars exist in Vercel for Production
2. Redeploy
3. Submit the contact form on your deployed domain
4. Check inbox + spam/junk

If email does not arrive:
- Confirm `CONTACT_FROM_EMAIL` is verified in SendGrid
- Confirm `SENDGRID_API_KEY` is correct
- Check Vercel Function logs for `/api/contact`

If booking fails:
- Confirm `DATABASE_URL` is set and Prisma migrations are applied
- Confirm Zoom env vars exist and your app has meeting scopes
- Check Vercel Function logs for `/api/book`

Production note:
- Make sure your production database has the tables from `prisma/schema.prisma` (run `npx prisma migrate deploy` against the Production `DATABASE_URL`).

