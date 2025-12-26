const sgMail = require("@sendgrid/mail");
const prisma = require("../lib/prisma");
const { json, parseEmailList } = require("./_utils");

const getZoomAccessToken = async () => {
  const clientId = process.env.Zoom_Client_ID;
  const clientSecret = process.env.Zoom_Client_Secret;
  const accountId = process.env.ZOOM_Account_ID;

  if (!clientId || !clientSecret || !accountId) {
    throw new Error("Zoom not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (!resp.ok) {
    throw new Error("Zoom token failed");
  }

  const data = await resp.json();
  if (!data?.access_token) throw new Error("Zoom token missing");
  return data.access_token;
};

const createZoomMeeting = async ({ startTime, timezone, durationMinutes, topic }) => {
  const token = await getZoomAccessToken();

  const payload = {
    topic: topic || "Furtiluna meeting",
    type: 2,
    start_time: startTime.toISOString(),
    timezone: timezone || "UTC",
    duration: durationMinutes,
    settings: {
      join_before_host: false,
      waiting_room: true,
      approval_type: 2,
    },
  };

  const resp = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error("Zoom create meeting failed");
  }

  const data = await resp.json();
  return {
    id: data?.id ? String(data.id) : "",
    joinUrl: String(data?.join_url || ""),
    startUrl: String(data?.start_url || ""),
    password: String(data?.password || ""),
  };
};

const configureSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SendGrid not configured");
  sgMail.setApiKey(apiKey);

  const from = process.env.CONTACT_FROM_EMAIL;
  const toRaw = process.env.CONTACT_TO_EMAIL;
  if (!from || !toRaw) throw new Error("Email not configured");

  const ownerTo = parseEmailList(toRaw);
  if (ownerTo.length === 0) throw new Error("CONTACT_TO_EMAIL empty");

  return { from, ownerTo };
};

const formatWhen = (date, timezone) => {
  try {
    const dtf = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    });
    return dtf.format(date);
  } catch {
    return date.toISOString();
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const {
      slotId,
      customerName,
      customerEmail,
      customerPhone,
      applicationText,
      applicationJson,
    } = req.body || {};

    const slotIdClean = String(slotId || "").trim();
    const name = String(customerName || "").trim();
    const email = String(customerEmail || "").trim();
    const phone = String(customerPhone || "").trim();
    const appText = String(applicationText || "").trim();

    if (!slotIdClean || !name || !email || !phone || !appText) {
      return json(res, 400, { ok: false, error: "Missing fields" });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return json(res, 400, { ok: false, error: "Invalid email" });

    // Fetch slot
    const slot = await prisma.availabilitySlot.findUnique({
      where: { id: slotIdClean },
    });
    if (!slot) return json(res, 404, { ok: false, error: "Slot not found" });
    if (slot.bookedAt) return json(res, 409, { ok: false, error: "Slot already booked" });

    const now = new Date();
    if (slot.startTime.getTime() < now.getTime() + 60_000) {
      return json(res, 400, { ok: false, error: "Slot is too soon" });
    }

    const durationMinutes = Math.max(
      5,
      Math.min(240, Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60_000))
    );

    // Atomically mark slot as booked
    const locked = await prisma.availabilitySlot.updateMany({
      where: { id: slotIdClean, bookedAt: null },
      data: { bookedAt: now },
    });

    if (!locked?.count) {
      return json(res, 409, { ok: false, error: "Slot already booked" });
    }

    // Create Zoom meeting
    const meeting = await createZoomMeeting({
      startTime: slot.startTime,
      timezone: slot.timezone,
      durationMinutes,
      topic: `Furtiluna call: ${name}`,
    });

    // Persist booking
    const booking = await prisma.booking.create({
      data: {
        slotId: slotIdClean,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        applicationText: appText,
        applicationJson: applicationJson ?? null,
        meetingStartTime: slot.startTime,
        meetingTimezone: slot.timezone,
        zoomMeetingId: meeting.id || null,
        zoomJoinUrl: meeting.joinUrl || null,
        zoomStartUrl: meeting.startUrl || null,
        zoomPassword: meeting.password || null,
      },
    });

    // Email owner + customer
    const { from, ownerTo } = configureSendGrid();

    const whenText = formatWhen(slot.startTime, slot.timezone);

    const ownerSubject = `New booking: ${name} (${whenText})`;
    const ownerBody =
      `${appText}\n\n` +
      `--- Booking ---\n` +
      `When: ${whenText}\n` +
      `Timezone: ${slot.timezone}\n` +
      `Zoom join: ${meeting.joinUrl || ""}\n` +
      `Zoom host: ${meeting.startUrl || ""}\n` +
      `Zoom meeting id: ${meeting.id || ""}\n` +
      (meeting.password ? `Zoom passcode: ${meeting.password}\n` : "") +
      `Booking id: ${booking.id}\n`;

    const customerSubject = `Your Furtiluna meeting is booked (${whenText})`;
    const customerBody =
      `Hi ${name},\n\n` +
      `Your meeting is confirmed.\n\n` +
      `When: ${whenText}\n` +
      `Timezone: ${slot.timezone}\n` +
      `Zoom link: ${meeting.joinUrl || ""}\n` +
      (meeting.password ? `Passcode: ${meeting.password}\n` : "") +
      `\nSee you then.\n`;

    await sgMail.send([
      {
        to: ownerTo.length === 1 ? ownerTo[0] : ownerTo,
        from,
        subject: ownerSubject,
        text: ownerBody,
        replyTo: email,
      },
      {
        to: email,
        from,
        subject: customerSubject,
        text: customerBody,
      },
    ]);

    return json(res, 200, {
      ok: true,
      bookingId: booking.id,
      when: whenText,
      timezone: slot.timezone,
      zoomJoinUrl: meeting.joinUrl,
    });
  } catch (err) {
    return json(res, 502, { ok: false, error: "Booking failed" });
  }
};
