const prisma = require("../../lib/prisma");
const { requireAdminBasicAuth, json } = require("../_utils");

const asInt = (value, fallback) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = async (req, res) => {
  try {
    const auth = requireAdminBasicAuth(req, res);
    if (!auth) return;

    // Prisma uses DATABASE_URL; make failures explicit
    if (!process.env.DATABASE_URL) {
      return json(res, 500, { ok: false, error: "Database not configured (missing DATABASE_URL)" });
    }

    if (req.method === "GET") {
      const limit = Math.max(1, Math.min(500, asInt(req.query?.limit, 200)));
      const now = new Date();

      const slots = await prisma.availabilitySlot.findMany({
        where: { endTime: { gte: now } },
        orderBy: { startTime: "asc" },
        take: limit,
      });

      return json(res, 200, { ok: true, slots });
    }

    if (req.method === "POST") {
      const { startTime, timezone, durationMinutes } = req.body || {};

      const start = new Date(String(startTime || ""));
      const dur = asInt(durationMinutes, 30);
      const tz = String(timezone || "").trim() || "UTC";

      if (!Number.isFinite(start.getTime())) {
        return json(res, 400, { ok: false, error: "Invalid startTime" });
      }
      if (!Number.isFinite(dur) || dur < 5 || dur > 240) {
        return json(res, 400, { ok: false, error: "Invalid durationMinutes" });
      }

      const end = new Date(start.getTime() + dur * 60_000);

      // Basic guard: prevent duplicates
      const existing = await prisma.availabilitySlot.findFirst({
        where: { startTime: start },
        select: { id: true },
      });
      if (existing) return json(res, 409, { ok: false, error: "Slot already exists" });

      const slot = await prisma.availabilitySlot.create({
        data: { startTime: start, endTime: end, timezone: tz },
      });

      return json(res, 201, { ok: true, slot });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "").trim();
      if (!id) return json(res, 400, { ok: false, error: "Missing id" });

      // Delete slot (and booking via cascade)
      await prisma.availabilitySlot.delete({ where: { id } }).catch(() => null);
      return json(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    const code = err?.code ? String(err.code) : "";
    // Prisma: table/view does not exist
    if (code === "P2021" || String(err?.message || "").toLowerCase().includes("does not exist")) {
      return json(res, 500, { ok: false, error: "Database schema not deployed (run prisma migrations)" });
    }
    return json(res, 500, { ok: false, error: "Server error" });
  }
};
