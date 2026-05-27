"use strict";

// Simple homepage script: loads public tests, renders leaderboard, and manages presence
const medals = ["🥇", "🥈", "🥉"];

function readResults() {
  try {
    return JSON.parse(localStorage.getItem("results") || "[]");
  } catch (e) {
    return [];
  }
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem("users") || "[]");
  } catch (e) {
    return [];
  }
}

function getDisplayName(result) {
  return result.fullname || result.login || result.userId || "Anon";
}

function computeLeaderboard() {
  const results = readResults();
  const users = readUsers();
  const map = new Map();

  for (const result of results) {
    const key = String(result.userId || result.login || getDisplayName(result));
    const existing = map.get(key) || {
      id: key,
      name: getDisplayName(result),
      tests: 0,
      scoreSum: 0,
      correct: 0,
    };
    existing.tests += 1;
    existing.scoreSum += Number(result.percent || result.score || 0);
    existing.correct += Number(result.correct || 0);
    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      avgScore: item.tests ? Math.round(item.scoreSum / item.tests) : 0,
    }))
    .sort((a, b) => {
      if (b.tests !== a.tests) return b.tests - a.tests;
      return b.avgScore - a.avgScore;
    })
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      score: item.avgScore,
    }))
    .map((item) => {
      const user = users.find(
        (u) => String(u.id) === String(item.id) || u.login === item.name,
      );
      return {
        ...item,
        name: user ? user.fullname || user.login || item.name : item.name,
      };
    });
}

function renderLeaderboard() {
  const container = document.getElementById("lb-list");
  if (!container) return;
  const leaderboard = computeLeaderboard();
  if (!leaderboard.length) {
    container.innerHTML = `
      <div class="lb-row">
        <div class="lb-info">
          <div class="lb-name">Hozircha peshqadamlar yo'q</div>
          <div class="lb-sub">Testlar to'plandi</div>
        </div>
      </div>
    `;
    return;
  }
  container.innerHTML = leaderboard
    .map((p) => {
      const isMedal = p.rank && p.rank <= 3;
      const rank = isMedal
        ? `<span class="medal">${medals[p.rank - 1]}</span>`
        : `<span class="lb-rank">${p.rank}</span>`;
      return `
      <div class="lb-row">
        ${rank}
        <div class="lb-avatar">${avatarSVG}</div>
        <div class="lb-info">
          <div class="lb-name">${p.name}</div>
          <div class="lb-sub">${p.tests} test · o'rtacha ${p.score}%</div>
        </div>
        <div class="lb-score">${p.score}%</div>
      </div>
    `;
    })
    .join("");
}

function renderStats() {
  const totalUsers = readUsers().length;
  const totalUsersEl = document.getElementById("totalUsers");
  if (totalUsersEl) {
    totalUsersEl.textContent = String(totalUsers);
  }
}

function loadTests() {
  const tests = JSON.parse(localStorage.getItem("public_tests") || "[]");
  const container = document.getElementById("testsContainer");
  if (!container) return;
  if (tests.length === 0) {
    container.innerHTML = `
      <div class="empty-box">
        <h3>Testlar mavjud emas</h3>
      </div>
    `;
    return;
  }
  const user = JSON.parse(localStorage.getItem("current_user") || "null");
  const results = readResults();
  const completed = new Set(
    (user
      ? results.filter(
          (r) => String(r.userId) === String(user.id) || r.login === user.login,
        )
      : results
    ).map((r) => String(r.test)),
  );

  container.innerHTML = tests
    .map((test) => {
      const isCompleted = completed.has(String(test.name));
      return `
      <div class="test-card">
        <div class="test-card-top">
          <h3>${test.name}</h3>
          <span>${test.type || "Bepul"}</span>
        </div>
        <div class="test-info">
          <div><strong>${(test.questions || []).length}</strong><span>Savol</span></div>
          <div><strong>${test.time || 120}</strong><span>Daqiqa</span></div>
        </div>
        ${isCompleted ? `<button class="start-btn" disabled>Ishlab bo'lgan</button>` : `<button class="start-btn" onclick="startTest('${test.id}')">Testni boshlash</button>`}
      </div>
    `;
    })
    .join("");
}

function startTest(id) {
  localStorage.setItem("active_test_id", String(id));
  const testUrl = window.location.pathname.includes("/html/")
    ? "../test.html"
    : "test.html";
  location.href = testUrl;
}

const avatarSVG = `
<svg width="14" height="14" fill="none" stroke="#bbb" stroke-width="2" viewBox="0 0 24 24">
  <circle cx="12" cy="8" r="4"/>
  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
</svg>
`;

function renderLeaderboard() {
  const container = document.getElementById("lb-list");
  if (!container) return;
  container.innerHTML = leaderboardData
    .map((p, i) => {
      const isMedal = p.rank && p.rank <= 3;
      const rank = isMedal
        ? `<span class="medal">${medals[p.rank - 1]}</span>`
        : `<span class="lb-rank">${p.rank || i + 1}</span>`;
      return `
      <div class="lb-row">
        ${rank}
        <div class="lb-avatar">${avatarSVG}</div>
        <div class="lb-info">
          <div class="lb-name">${p.name}</div>
          <div class="lb-sub">${p.correct} to'g'ri · ${p.tests} test</div>
        </div>
        <div class="lb-score">${p.score}%</div>
      </div>
    `;
    })
    .join("");
}

function animateCount(el, target, duration = 1200) {
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start);
    }
  }, 16);
}

function loadAdminTests() {
  const tests = JSON.parse(localStorage.getItem("public_tests") || "[]");
  const section = document.getElementById("adminTestsSection");
  if (!section) return;
  if (tests.length === 0) {
    section.innerHTML = "";
    return;
  }
  section.innerHTML = tests
    .map(
      (t) => `
    <div class="admin-test-card" onclick="startTest('${t.id}')">
      <h2>${t.name}</h2>
      <p>Savollar soni: ${(t.questions || []).length} ta<br>Berilgan vaqt: ${t.time} daqiqa<br>Turi: ${t.type}</p>
      <div class="test-card-footer"><span class="test-year">${t.year || 2026}</span><span class="test-free">${t.type}</span></div>
    </div>
  `,
    )
    .join("");
}

function initNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  badge.addEventListener("click", () => {
    badge.style.animation = "none";
    badge.offsetHeight;
    badge.style.animation = "pop 0.3s ease";
  });
}

function initUserCode() {
  const btn = document.getElementById("userCodeBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    btn.style.background = "#eef2ff";
    setTimeout(() => (btn.style.background = ""), 300);
  });
}

// PRESENCE
let PRESENCE_SESSION = localStorage.getItem("presence_session") || null;
async function sendHeartbeat() {
  try {
    const body = PRESENCE_SESSION ? { sessionId: PRESENCE_SESSION } : {};
    const resp = await fetch("/api/presence/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data && data.sessionId) {
      PRESENCE_SESSION = data.sessionId;
      localStorage.setItem("presence_session", PRESENCE_SESSION);
    }
  } catch (e) {
    // ignore network errors
  }
}

async function updatePresenceCount() {
  try {
    const resp = await fetch("/api/presence");
    if (!resp.ok) return;
    const data = await resp.json();
    const el = document.getElementById("onlineUsers");
    if (el && typeof data.count === "number")
      el.textContent = String(data.count);
  } catch (e) {
    // ignore
  }
}

function startPresenceLoops() {
  sendHeartbeat();
  updatePresenceCount();
  setInterval(sendHeartbeat, 10000);
  setInterval(updatePresenceCount, 5000);
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  // try to fetch public tests from server, fallback to localStorage
  (async function () {
    try {
      const resp = await fetch("/api/tests");
      if (resp.ok) {
        const tests = await resp.json();
        if (Array.isArray(tests))
          localStorage.setItem("public_tests", JSON.stringify(tests));
      }
    } catch (e) {
      // ignore network errors, use localStorage
    }
    loadTests();
  })();
  renderLeaderboard();
  renderStats();
  initNotifBadge();
  initUserCode();
  loadAdminTests();
  startPresenceLoops();
});
