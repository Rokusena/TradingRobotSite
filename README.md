# TradingRobotSite

## Contact form email system (Vercel + Resend)

### Architecture
Form (contact.html + script.js)  Vercel API Route (/api/contact)  Resend API  Inbox

In this repo:
- Frontend: `contact.html` posts JSON to `/api/contact`.
- Backend: `api/contact.js` (Vercel Serverless Function) validates input and sends email using Resend.

---

### 1) Install dependencies
This project uses the `resend` package.

Install:
```bash
npm install
```

---

### 2) Configure environment variables (secrets)
Required:
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` (recipient; can be a comma-separated list)
- `CONTACT_FROM_EMAIL` (sender; must be a verified sender/domain in Resend)

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
1. Create a Resend account
2. Create an API key and store it in `RESEND_API_KEY`
3. Verify your sending domain or sender and use it as `CONTACT_FROM_EMAIL`
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
3. Install Vercel CLI: `npm i -g vercel`
4. Run: `vercel dev`
5. Open the local site and submit the contact form

Note: testing via VS Code “Live Server” (e.g. `127.0.0.1:5500`) will not run Vercel API Routes, so `/api/contact` won’t work there.

After deployment:
1. Confirm env vars exist in Vercel for Production
2. Redeploy
3. Submit the contact form on your deployed domain
4. Check inbox + spam/junk

If email does not arrive:
- Confirm `CONTACT_FROM_EMAIL` is verified in Resend
- Confirm `RESEND_API_KEY` is correct
- Check Vercel Function logs for `/api/contact`

