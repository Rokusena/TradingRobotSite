// api/contact.js (Vercel Serverless Function - Node.js)
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      email = "",
      phone = "",
      message = "",
      turnstileToken = "",
      company = "", // honeypot
    } = req.body || {};

    if (company) return res.status(200).json({ ok: true }); // bot -> pretend success

    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone).trim();
    const cleanMessage = String(message).trim();

    if (!cleanEmail || !cleanPhone || !cleanMessage) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // CAPTCHA (Turnstile)
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return res.status(400).json({ ok: false, error: "Captcha required" });
      }

      const form = new URLSearchParams();
      form.append("secret", turnstileSecret);
      form.append("response", turnstileToken);
      if (req.headers["x-forwarded-for"]) {
        form.append("remoteip", String(req.headers["x-forwarded-for"]).split(",")[0].trim());
      }

      const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      const verifyJson = await verifyResp.json();
      if (!verifyJson?.success) {
        return res.status(400).json({ ok: false, error: "Captcha failed" });
      }
    }

    // Email via Resend (REST API, no dependencies)
    const resendKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM;

    if (!resendKey || !to || !from) {
      return res.status(500).json({
        ok: false,
        error: "Server not configured (missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM)",
      });
    }

    const subject = "Furtiluna contact request";
    const text =
      `New contact request:\n\n` +
      `Email: ${cleanEmail}\n` +
      `Phone: ${cleanPhone}\n\n` +
      `Message:\n${cleanMessage}\n`;

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        reply_to: cleanEmail,
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text().catch(() => "");
      return res.status(502).json({ ok: false, error: "Email failed", detail: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};