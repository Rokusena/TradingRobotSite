# TradingRobotSite

## Contact form email system (Vercel + SendGrid)

### Architecture
Form (contact.html + script.js)  Vercel API Route (/api/contact)  SendGrid API  Inbox

In this repo:
- Frontend: `contact.html` posts JSON to `/api/contact`.
- Backend: `api/contact.js` (Vercel Serverless Function) validates input, optionally checks Cloudflare Turnstile, then sends email using SendGrid.

---

### 1) Install SendGrid SDK
This project uses `@sendgrid/mail`.

Install:
```bash
npm install
```

---

### 2) Configure environment variables (secrets)
Required:
- `SENDGRID_API_KEY`
- `CONTACT_TO_EMAIL` (recipient; can be a comma-separated list)
- `CONTACT_FROM_EMAIL` (sender; must be verified in SendGrid)

Optional:
- `TURNSTILE_SECRET_KEY` (if set, Turnstile is required)

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

### 4) SendGrid setup (practical)
1. Create a SendGrid account
2. Create an API key with **Mail Send** permissions
3. Verify a sender (Single Sender Verification) and use that as `CONTACT_FROM_EMAIL`
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

After deployment:
1. Confirm env vars exist in Vercel for Production
2. Redeploy
3. Submit the contact form on your deployed domain
4. Check inbox + spam/junk

If email does not arrive:
- Confirm `CONTACT_FROM_EMAIL` is verified in SendGrid
- Confirm `SENDGRID_API_KEY` is correct and has Mail Send permission
- Check Vercel Function logs for `/api/contact`
- If Turnstile is enabled, ensure your site key/secret pair is correct

