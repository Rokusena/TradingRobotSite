// api/contact.js (Vercel Serverless Function - Node.js)
const sgMail = require("@sendgrid/mail");

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
      company = "", // honeypot
    } = req.body || {};

    if (company) return res.status(200).json({ ok: true }); // bot -> pretend success

    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone).trim();
    const cleanMessage = String(message).trim();

    if (!cleanEmail || !cleanPhone || !cleanMessage) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Basic validation (keep simple, production-safe)
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!emailOk) return res.status(400).json({ ok: false, error: "Invalid email" });
    if (cleanPhone.length < 6 || cleanPhone.length > 30) {
      return res.status(400).json({ ok: false, error: "Invalid phone" });
    }
    if (cleanMessage.length < 2 || cleanMessage.length > 5000) {
      return res.status(400).json({ ok: false, error: "Invalid message" });
    }

    // Email via SendGrid (no SMTP)
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const toRaw = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL;

    if (!sendgridApiKey || !toRaw || !from) {
      return res.status(500).json({
        ok: false,
        error: "Server not configured (missing SENDGRID_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL)",
      });
    }

    sgMail.setApiKey(sendgridApiKey);

    const to = String(toRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const subject = "Furtiluna contact request";
    const text =
      `New contact request:\n\n` +
      `Email: ${cleanEmail}\n` +
      `Phone: ${cleanPhone}\n\n` +
      `Message:\n${cleanMessage}\n`;

    try {
      await sgMail.send({
        to: to.length === 1 ? to[0] : to,
        from,
        subject,
        text,
        replyTo: cleanEmail,
      });
    } catch (err) {
      // Avoid leaking provider details to clients
      return res.status(502).json({ ok: false, error: "Email failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};