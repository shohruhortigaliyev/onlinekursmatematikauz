// Simple Express backend for Online Test Platform
const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "12345";

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname)));

// Read/write helpers (atomic-ish)
async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return { tests: [], results: [], users: [] };
  }
}

async function writeData(obj) {
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

function makeId() {
  return String(Date.now()) + Math.floor(Math.random() * 1000);
}

function normalizeUserFields(body) {
  const code = body.code || body.login || body.user_code || body.userLogin;
  const pass = body.pass || body.password;
  const name = body.name || body.fullname || body.userName || body.userName;
  const status = body.status || "active";
  return { code, pass, name, status };
}

function normalizeUserResponse(user) {
  const out = Object.assign({}, user);
  if (!out.login && out.code) out.login = out.code;
  if (!out.code && out.login) out.code = out.login;
  return out;
}

// Admin auth middleware (simple header)
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.admin_key;
  if (!key || key !== ADMIN_KEY)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

// API: tests
app.get("/api/tests", async (req, res) => {
  const data = await readData();
  res.json(data.tests || []);
});

app.post("/api/tests", requireAdmin, async (req, res) => {
  const data = await readData();
  const t = req.body;
  if (!t || !t.name) return res.status(400).json({ error: "invalid" });
  const newTest = Object.assign({ id: makeId(), questions: [] }, t);
  data.tests.push(newTest);
  await writeData(data);
  res.json(newTest);
});

app.put("/api/tests/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const data = await readData();
  const idx = data.tests.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "not found" });
  data.tests[idx] = Object.assign({}, data.tests[idx], req.body);
  await writeData(data);
  res.json(data.tests[idx]);
});

app.delete("/api/tests/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const data = await readData();
  data.tests = data.tests.filter((x) => String(x.id) !== String(id));
  await writeData(data);
  res.json({ ok: true });
});

// ===== USERS / ACCOUNTS =====
app.post("/api/register", async (req, res) => {
  const { code, pass, name } = normalizeUserFields(req.body || {});
  if (!code || !pass) return res.status(400).json({ error: "invalid" });
  const data = await readData();
  if (!data.users) data.users = [];
  if (data.users.find((u) => u.code === code))
    return res.status(409).json({ error: "exists" });
  const user = { id: makeId(), code, pass, name: name || "Foydalanuvchi" };
  data.users.push(user);
  await writeData(data);
  const out = normalizeUserResponse(Object.assign({}, user));
  delete out.pass;
  res.json(out);
});

// Admin-only user management
app.get("/api/users", requireAdmin, async (req, res) => {
  const data = await readData();
  const users = (data.users || []).map((user) => normalizeUserResponse(user));
  res.json(users);
});

app.post("/api/users", requireAdmin, async (req, res) => {
  const { code, pass, name, status } = normalizeUserFields(req.body || {});
  if (!code || !pass) return res.status(400).json({ error: "invalid" });
  const data = await readData();
  if (!data.users) data.users = [];
  if (data.users.find((u) => u.code === code))
    return res.status(409).json({ error: "exists" });
  const user = {
    id: makeId(),
    code,
    pass,
    name: name || "Foydalanuvchi",
    status: status || "active",
  };
  data.users.push(user);
  await writeData(data);
  const out = normalizeUserResponse(Object.assign({}, user));
  delete out.pass;
  res.json(out);
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { code, pass, name, status } = normalizeUserFields(req.body || {});
  const data = await readData();
  if (!data.users) data.users = [];
  const idx = data.users.findIndex((u) => String(u.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "not found" });
  if (
    code &&
    data.users.some((u) => u.code === code && String(u.id) !== String(id))
  )
    return res.status(409).json({ error: "exists" });
  const user = Object.assign({}, data.users[idx], {
    code: code || data.users[idx].code,
    pass: pass || data.users[idx].pass,
    name: name || data.users[idx].name,
    status: status || data.users[idx].status,
  });
  data.users[idx] = user;
  await writeData(data);
  const out = normalizeUserResponse(Object.assign({}, user));
  delete out.pass;
  res.json(out);
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const data = await readData();
  if (!data.users) data.users = [];
  data.users = data.users.filter((u) => String(u.id) !== String(id));
  await writeData(data);
  res.json({ ok: true });
});

// in-memory sessions and presence map
const sessions = new Map(); // sessionId -> userId
const presence = new Map(); // sessionId -> { lastSeen, userId }
const PRESENCE_TTL = 30 * 1000; // 30 seconds

app.post("/api/login", async (req, res) => {
  const { code, login, pass, password } = req.body || {};
  const userCode = code || login;
  const userPass = pass || password;
  if (!userCode || !userPass) return res.status(400).json({ error: "invalid" });
  const data = await readData();
  const user = (data.users || []).find(
    (u) => u.code === userCode && u.pass === userPass,
  );
  if (!user) return res.status(401).json({ error: "invalid" });
  const sid = makeId();
  sessions.set(sid, user.id);
  presence.set(sid, { lastSeen: Date.now(), userId: user.id });
  const out = normalizeUserResponse({
    id: user.id,
    code: user.code,
    name: user.name,
  });
  res.json({ ok: true, user: out, sessionId: sid });
});

app.get("/api/me", async (req, res) => {
  const sid = req.headers["x-session-id"] || req.query.session_id;
  if (!sid) return res.status(401).json({ error: "no session" });
  const userId = sessions.get(String(sid));
  if (!userId) return res.status(401).json({ error: "invalid session" });
  const data = await readData();
  const user = (data.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "not found" });
  const out = normalizeUserResponse(Object.assign({}, user));
  delete out.pass;
  res.json({ ok: true, user: out });
});

// ===== PRESENCE (online users) =====
// heartbeat accepts { sessionId } (optional). returns { sessionId }
app.post("/api/presence/heartbeat", (req, res) => {
  const { sessionId } = req.body || {};
  const sid = sessionId || makeId();
  const userId = sessions.get(String(sid)) || null;
  presence.set(String(sid), { lastSeen: Date.now(), userId });
  res.json({ sessionId: String(sid) });
});

app.get("/api/presence", (req, res) => {
  const now = Date.now();
  // remove old
  for (const [k, v] of presence.entries()) {
    if (now - v.lastSeen > PRESENCE_TTL) presence.delete(k);
  }
  // count unique logged-in users when possible
  const userIds = new Set();
  let anonymousCount = 0;
  for (const v of presence.values()) {
    if (v.userId) userIds.add(v.userId);
    else anonymousCount++;
  }
  res.json({ count: userIds.size + anonymousCount, uniqueUsers: userIds.size });
});

app.delete("/api/presence/:id", (req, res) => {
  presence.delete(String(req.params.id));
  sessions.delete(String(req.params.id));
  res.json({ ok: true });
});

// API: results
app.get("/api/results", requireAdmin, async (req, res) => {
  const data = await readData();
  res.json(data.results || []);
});

app.post("/api/results", async (req, res) => {
  const data = await readData();
  const r = req.body;
  if (!r) return res.status(400).json({ error: "invalid" });
  const item = Object.assign(
    { id: makeId(), date: new Date().toISOString() },
    r,
  );
  data.results.push(item);
  await writeData(data);
  res.json(item);
});

// Admin login (simple)
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_KEY)
    return res.status(401).json({ ok: false });
  res.json({ ok: true, admin_key: ADMIN_KEY });
});

// Fallback
app.use((req, res) => res.status(404).send("Not Found"));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
