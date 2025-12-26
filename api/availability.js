const prisma = require("../lib/prisma");
const { json } = require("./_utils");

const asInt = (value, fallback) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  const limit = Math.max(1, Math.min(200, asInt(req.query?.limit, 50)));
  const now = new Date();

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      bookedAt: null,
      startTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  });

  return json(res, 200, { ok: true, slots });
};
