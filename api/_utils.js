const pickHeader = (headers, key) => {
  if (!headers) return "";
  const lower = String(key).toLowerCase();
  const value = headers[lower] ?? headers[key] ?? "";
  return Array.isArray(value) ? value.join(", ") : String(value || "");
};

const parseEmailList = (value) => {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const basicAuthCredentials = (req) => {
  const auth = pickHeader(req.headers, "authorization");
  if (!auth || !auth.toLowerCase().startsWith("basic ")) return null;
  const b64 = auth.slice(6).trim();
  let decoded = "";
  try {
    decoded = Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
};

const requireAdminBasicAuth = (req, res) => {
  const creds = basicAuthCredentials(req);
  const user = String(process.env.ADMIN_NAME || "").trim();
  const pass = String(process.env.ADMIN_PASSWORD || "").trim();

  if (!user || !pass) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Admin auth not configured" }));
    return null;
  }

  const username = String(creds?.username || "").trim();
  const password = String(creds?.password || "");
  if (!creds || username !== user || password !== pass) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    return null;
  }

  return creds;
};

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

module.exports = {
  pickHeader,
  parseEmailList,
  requireAdminBasicAuth,
  json,
};
