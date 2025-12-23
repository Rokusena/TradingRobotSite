// api/contact.js (Vercel Serverless Function - Node.js)
const { Resend } = require("resend");

const pickHeader = (headers, key) => {
  if (!headers) return "";
  const lower = String(key).toLowerCase();
  const value = headers[lower] ?? headers[key] ?? "";
  return Array.isArray(value) ? value.join(", ") : String(value || "");
};

const getClientIp = (headers) => {
  const candidates = [
    pickHeader(headers, "x-forwarded-for"),
    pickHeader(headers, "x-vercel-forwarded-for"),
    pickHeader(headers, "cf-connecting-ip"),
    pickHeader(headers, "true-client-ip"),
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  if (candidates.length === 0) return "";
  // x-forwarded-for can be a comma-separated list
  return candidates[0].split(",")[0].trim();
};

const safeJson = (value, maxLen = 12000) => {
  try {
    const raw = JSON.stringify(value ?? null, null, 2);
    if (raw.length <= maxLen) return raw;
    return raw.slice(0, maxLen) + "\n... (truncated)";
  } catch {
    return "[unserializable body]";
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { email = "", phone = "", message = "", company = "" } = req.body || {}; // company = honeypot

    if (company) return res.status(200).json({ ok: true }); // bot -> pretend success

    const cleanEmail = String(email || "").trim();
    const cleanPhone = String(phone || "").trim();
    const cleanMessage = String(message || "").trim();

    // Require at least something useful; still email us the whole request if partial.
    if (!cleanEmail && !cleanPhone && !cleanMessage) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Light validation: only validate fields that are present.
    if (cleanEmail) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
      if (!emailOk) return res.status(400).json({ ok: false, error: "Invalid email" });
    }
    if (cleanPhone && (cleanPhone.length < 6 || cleanPhone.length > 30)) {
      return res.status(400).json({ ok: false, error: "Invalid phone" });
    }
    if (cleanMessage && (cleanMessage.length > 15000 || cleanMessage.length < 1)) {
      return res.status(400).json({ ok: false, error: "Invalid message" });
    }

    // Email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const toRaw = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL;

    if (!resendApiKey || !toRaw || !from) {
      return res.status(500).json({
        ok: false,
        error: "Server not configured (missing RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL)",
      });
    }

    const resend = new Resend(resendApiKey);

    const to = String(toRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const subject = "Furtiluna contact request";

    const ip = getClientIp(req.headers);
    const userAgent = pickHeader(req.headers, "user-agent");
    const referer = pickHeader(req.headers, "referer");
    const origin = pickHeader(req.headers, "origin");
    const host = pickHeader(req.headers, "host");
    const contentType = pickHeader(req.headers, "content-type");

    const text =
      `New contact/application submission\n\n` +
      `Email: ${cleanEmail || "(missing)"}\n` +
      `Phone: ${cleanPhone || "(missing)"}\n\n` +
      `Message:\n${cleanMessage || "(missing)"}\n\n` +
      `--- Request metadata ---\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Method: ${req.method || ""}\n` +
      `Host: ${host || ""}\n` +
      `Origin: ${origin || ""}\n` +
      `Referer: ${referer || ""}\n` +
      `IP: ${ip || ""}\n` +
      `User-Agent: ${userAgent || ""}\n` +
      `Content-Type: ${contentType || ""}\n\n` +
      `--- Raw body (for safety) ---\n` +
      `${safeJson(req.body)}\n`;

    try {
      const payload = {
        to: to.length === 1 ? to[0] : to,
        from,
        subject,
        text,
      };
      if (cleanEmail) payload.replyTo = cleanEmail;

      await resend.emails.send(payload);
    } catch (err) {
      // Avoid leaking provider details to clients
      return res.status(502).json({ ok: false, error: "Email failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};