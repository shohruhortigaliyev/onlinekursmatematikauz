/* Home page script: list public_tests and start test */
(function () {
  "use strict";

  function readPublic() {
    try {
      return JSON.parse(localStorage.getItem("public_tests") || "[]");
    } catch (e) {
      return [];
    }
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null");
    } catch (e) {
      return null;
    }
  }

  function escape(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

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

    results.forEach((result) => {
      const key = String(
        result.userId || result.login || getDisplayName(result),
      );
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

  function renderLeaderboard() {
    const list = document.getElementById("lb-list");
    if (!list) return;

    const leaderboard = computeLeaderboard();
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
      .map((p) => {
        const rank =
          p.rank <= 3
            ? `<span class="medal">${medals[p.rank - 1]}</span>`
            : `<span class="lb-rank">${p.rank}</span>`;
        return `
          <div class="lb-row">
            ${rank}
            <div class="lb-avatar">${escape(p.name.slice(0, 2).toUpperCase())}</div>
            <div class="lb-info">
              <div class="lb-name">${escape(p.name)}</div>
              <div class="lb-sub">${p.tests} test · o'rtacha ${p.score}%</div>
            </div>
            <div class="lb-score">${p.score}%</div>
          </div>`;
      })
      .join("");
  }

  function renderStats() {
    const users = readUsers();
    const totalUsersEl = document.getElementById("totalUsers");
    if (totalUsersEl) totalUsersEl.textContent = String(users.length);
  }

  async function sendHeartbeat() {
    try {
      const sessionId = localStorage.getItem("presence_session") || null;
      const body = sessionId ? { sessionId } : {};
      const resp = await fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.sessionId) {
        localStorage.setItem("presence_session", data.sessionId);
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
    const tests =
      window.api && window.api.getTests
        ? await window.api.getTests()
        : readPublic();
    const currentUser = getCurrentUser();
    const allResults = readResults();
    const completedSet = new Set(
      (currentUser
        ? allResults.filter(
            (r) =>
              String(r.userId) === String(currentUser.id) ||
              r.login === currentUser.login,
          )
        : allResults
      ).map((r) => String(r.test)),
    );
    if (!tests.length) {
      grid.innerHTML = '<div class="card">Hozircha testlar mavjud emas</div>';
      return;
    }
    grid.innerHTML = tests
      .map((t) => {
        const isCompleted = completedSet.has(String(t.name));
        return `
        <div class="card">
          <h3>${escape(t.name)}</h3>
          <div class="meta">Savollar: ${(t.questions || []).length} — Vaqt: ${t.time || 0} min — Turi: ${escape(t.type || "")}</div>
          <div style="margin-top:10px">
            ${isCompleted ? `<button class="btn" disabled>Ishlab bo'lgan</button>` : `<button class="btn" data-id="${t.id}">Testni boshlash</button>`}
          </div>
        </div>`;
      })
      .join("");

    const testUrl = window.location.pathname.includes("/html/")
      ? "../test.html"
      : "test.html";
    grid.querySelectorAll("button[data-id]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        localStorage.setItem("active_test_id", String(id));
        window.location.href = testUrl;
      }),
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    if (!user) {
      const indexPath = window.location.pathname.includes("/html/")
        ? "../index.html"
        : "index.html";
      window.location.href = indexPath;
      return;
    }

    const userCodeBtn = document.getElementById("userCodeBtn");
    if (userCodeBtn) {
      userCodeBtn.innerHTML = `${escape(user.login || user.fullname || "Foydalanuvchi")} <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>`;
    }

    render();
    renderLeaderboard();
    renderStats();
    startPresenceLoops();
  });
})();
