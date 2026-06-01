/* Home page script: list tests from Supabase and start test session */
(async function () {
  "use strict";

  function getCurrentUser() {
    return window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function getTests() {
    return window.api && window.api.getTests ? await window.api.getTests() : [];
  }

  async function getResults() {
    return window.api && window.api.getResults ? await window.api.getResults() : [];
  }

  function getDisplayName(result) {
    return result.fullname || result.login || result.userId || "Anon";
  }

  function computeLeaderboard(results, users) {
    const map = new Map();
    results.forEach((result) => {
      const key = String(result.userId || result.login || getDisplayName(result));
      const current = map.get(key) || {
        id: key,
        name: getDisplayName(result),
        tests: 0,
        scoreSum: 0,
      };
      current.tests += 1;
      current.scoreSum += Number(result.percent || result.score || 0);
      map.set(key, current);
    });

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
      .map((item, index) => {
        const user = users.find(
          (u) => String(u.id) === String(item.id) || u.login === item.name,
        );
        return {
          ...item,
          rank: index + 1,
          score: item.avgScore,
          name: user ? user.fullname || user.login || item.name : item.name,
        };
      });
  }

  async function renderLeaderboard() {
    const list = document.getElementById("lb-list");
    if (!list) return;
    const [results, users] = await Promise.all([getResults(), window.api.getUsers()]);
    const leaderboard = computeLeaderboard(results, users);
    if (!leaderboard.length) {
      list.innerHTML = `
        <div class="lb-row">
          <div class="lb-info">
            <div class="lb-name">Hozircha peshqadamlar yo'q</div>
            <div class="lb-sub">Birinchi testni bajaring</div>
          </div>
        </div>`;
      return;
    }
    const medals = ["🥇", "🥈", "🥉"];
    list.innerHTML = leaderboard
      .map((item) => {
        const rank =
          item.rank <= 3
            ? `<span class="medal">${medals[item.rank - 1]}</span>`
            : `<span class="lb-rank">${item.rank}</span>`;
        return `
          <div class="lb-row">
            ${rank}
            <div class="lb-avatar">${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
            <div class="lb-info">
              <div class="lb-name">${escapeHtml(item.name)}</div>
              <div class="lb-sub">${item.tests} test · o'rtacha ${item.score}%</div>
            </div>
            <div class="lb-score">${item.score}%</div>
          </div>`;
      })
      .join("");
  }

  async function renderStats() {
    const totalUsersEl = document.getElementById("totalUsers");
    if (!totalUsersEl || !window.api || !window.api.getUsers) return;
    const users = await window.api.getUsers();
    totalUsersEl.textContent = String(users.length);
  }

  async function sendHeartbeat() {
    try {
      const sessionId = sessionStorage.getItem("presence_session") || null;
      const body = sessionId ? { sessionId } : {};
      const resp = await fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.sessionId) {
        sessionStorage.setItem("presence_session", data.sessionId);
      }
    } catch (e) {
      // ignore
    }
  }

  async function updatePresenceCount() {
    try {
      const resp = await fetch("/api/presence");
      if (!resp.ok) return;
      const data = await resp.json();
      const el = document.getElementById("onlineUsers");
      if (el && typeof data.count === "number") {
        el.textContent = String(data.count);
      }
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

  async function render() {
    const grid = document.getElementById("testsGrid");
    const tests = await getTests();
    const currentUser = getCurrentUser();
    const allResults = await getResults();
    const completedSet = new Set(
      (currentUser
        ? allResults.filter(
            (r) =>
              String(r.userId) === String(currentUser.id) || r.login === currentUser.login,
          )
        : allResults
      ).map((r) => String(r.test)),
    );
    if (!tests.length) {
      grid.innerHTML = '<div class="card">Hozircha testlar mavjud emas</div>';
      return;
    }
    grid.innerHTML = tests
      .map((test) => {
        const isCompleted = completedSet.has(String(test.name));
        return `
        <div class="card">
          <h3>${escapeHtml(test.name)}</h3>
          <div class="meta">Savollar: ${(test.questions || []).length} — Vaqt: ${test.time || 0} min — Turi: ${escapeHtml(test.type || "")}</div>
          <div style="margin-top:10px">
            ${isCompleted ? `<button class="btn" disabled>Ishlab bo'lgan</button>` : `<button class="btn" data-id="${test.id}">Testni boshlash</button>`}
          </div>
        </div>`;
      })
      .join("");

    const testUrl = window.location.pathname.includes("/html/") ? "../test.html" : "test.html";
    grid.querySelectorAll("button[data-id]").forEach((button) =>
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        if (window.api && window.api.setActiveTestId) {
          window.api.setActiveTestId(id);
        } else {
          sessionStorage.setItem("matematika_active_test", String(id));
        }
        window.location.href = testUrl;
      }),
    );
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = getCurrentUser();
    if (!user) {
      const indexPath = window.location.pathname.includes("/html/") ? "../index.html" : "index.html";
      window.location.href = indexPath;
      return;
    }

    const userCodeBtn = document.getElementById("userCodeBtn");
    if (userCodeBtn) {
      userCodeBtn.innerHTML = `${escapeHtml(user.login || user.fullname || "Foydalanuvchi")} <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>`;
    }

    await render();
    await renderLeaderboard();
    await renderStats();
    startPresenceLoops();
  });
})();
