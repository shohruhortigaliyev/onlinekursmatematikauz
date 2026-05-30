/* Admin app - panel for managing tests, users, and viewing results */
(function () {
  "use strict";

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem("users") || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
  }

  function readPublicTests() {
    try {
      return JSON.parse(localStorage.getItem("public_tests") || "[]");
    } catch (e) {
      return [];
    }
  }

  function writePublicTests(tests) {
    localStorage.setItem("public_tests", JSON.stringify(tests));
  }

  function readResults() {
    try {
      return JSON.parse(localStorage.getItem("results") || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeResults(results) {
    localStorage.setItem("results", JSON.stringify(results));
  }

  window.doLogout = function () {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_key");
    const indexPath = window.location.pathname.includes("/html/")
      ? "../index.html"
      : "index.html";
    window.location.href = indexPath;
  };

  async function syncFromServer() {
    const adminKey = localStorage.getItem("admin_key");
    if (!adminKey || !window.api) return;
    try {
      if (window.api.getResults) {
        const results = await window.api.getResults(adminKey);
        localStorage.setItem("results", JSON.stringify(results || []));
      }
      if (window.api.getUsers) {
        const users = await window.api.getUsers(adminKey);
        localStorage.setItem("users", JSON.stringify(users || []));
      }
      if (window.api.getTests) {
        const tests = await window.api.getTests();
        // server's tests are authoritative
        localStorage.setItem("public_tests", JSON.stringify(tests || []));
      }
    } catch (e) {
      // ignore errors; UI will fallback to localStorage
    }
  }

  async function saveTestRemote(test, isNew) {
    if (!window.api || !window.api.createTest) return null;
    try {
      if (isNew) return await window.api.createTest(test);
      if (window.api.updateTest) return await window.api.updateTest(test);
    } catch (e) {
      console.warn("Remote test save failed", e);
    }
    return null;
  }

  async function saveUserRemote(user, isNew) {
    if (!window.api || !window.api.createUser) return null;
    try {
      if (isNew) return await window.api.createUser(user);
      if (window.api.updateUser) return await window.api.updateUser(user);
    } catch (e) {
      console.warn("Remote user save failed", e);
    }
    return null;
  }

  async function deleteTestRemote(id) {
    if (!window.api || !window.api.deleteTest) return false;
    try {
      await window.api.deleteTest(id);
      return true;
    } catch (e) {
      console.warn("Remote test delete failed", e);
      return false;
    }
  }

  async function deleteUserRemote(id) {
    if (!window.api || !window.api.deleteUser) return false;
    try {
      await window.api.deleteUser(id);
      return true;
    } catch (e) {
      console.warn("Remote user delete failed", e);
      return false;
    }
  }

  // saveAdminCard removed with payment feature

  function el(id) {
    return document.getElementById(id);
  }

  function getUserStats(user) {
    const results = readResults().filter(
      (r) => String(r.userId) === String(user.id) || r.login === user.login,
    );
    const total = results.length;
    const scoreSum = results.reduce(
      (sum, item) => sum + Number(item.percent || item.score || 0),
      0,
    );
    return {
      totalTests: total,
      avgScore: total ? Math.round(scoreSum / total) : 0,
    };
  }

  // payments feature removed

  function renderDashboard() {
    el("countTests").textContent = readPublicTests().length;
    el("countUsers").textContent = readUsers().length;
    el("countResults").textContent = readResults().length;
  }

  function renderTests() {
    const list = el("testsList");
    const tests = readPublicTests();
    if (!tests.length) {
      list.innerHTML = '<div class="panel">Hozircha testlar yo�q</div>';
      return;
    }
    list.innerHTML = tests
      .map((t) => {
        const qCount = (t.questions || []).length;
        return `
        <div class="test-card">
          <div style="display:flex;justify-content:space-between"><strong>${escapeHtml(
            t.name,
          )}</strong><span>${t.time || 0} min</span></div>
          <div style="margin-top:8px;color:var(--muted, #9aa)">Savollar: ${qCount} � Turi: ${escapeHtml(
            t.type || "",
          )}</div>
          <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" onclick="editTest(${t.id})">Tahrirlash</button><button class="btn ghost" onclick="deleteTest(${t.id})">O'chirish</button></div>
        </div>`;
      })
      .join("");
  }

  function renderUsers(query = "") {
    const list = el("usersList");
    const users = readUsers();
    const filtered = users.filter((user) => {
      const value =
        `${user.fullname} ${user.login} ${user.status}`.toLowerCase();
      return value.includes(query.toLowerCase());
    });
    if (!filtered.length) {
      list.innerHTML = '<div class="panel">Foydalanuvchilar topilmadi</div>';
      return;
    }
    list.innerHTML = filtered
      .map((user) => {
        const stats = getUserStats(user);
        return `
        <div class="user-item">
          <div>
            <div class="user-name">${escapeHtml(user.fullname)}</div>
            <div class="user-meta">${escapeHtml(user.login)} � ${escapeHtml(user.status)}</div>
          </div>
          <div class="user-stats">
            <span>Testlar: ${stats.totalTests}</span>
            <span>O'rtacha: ${stats.avgScore}%</span>
          </div>
          <div class="user-actions">
            <button class="btn ghost" onclick="editUser(${user.id})">Tahrirlash</button>
            <button class="btn ghost" onclick="deleteUser(${user.id})">O'chirish</button>
          </div>
        </div>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function collectQuestionsFromDOM() {
    const container = el("questionsContainer");
    const rows = Array.from(container.children);
    return rows
      .map((r, i) => {
        const text = r.querySelector(".q-text").value.trim();
        const opts = [
          r.querySelector(".opt0").value.trim(),
          r.querySelector(".opt1").value.trim(),
          r.querySelector(".opt2").value.trim(),
          r.querySelector(".opt3").value.trim(),
        ];
        const correct = Number(r.querySelector(".q-correct").value);
        return { id: i + 1, text, options: opts, correct };
      })
      .filter((q) => q.text);
  }

  function makeQuestionRow(q) {
    const wrap = document.createElement("div");
    wrap.className = "question-row";
    wrap.innerHTML = `
      <div class="question-main">
        <input class="q-input q-text" placeholder="Savol matni" value="${escapeHtml(
          q?.text || "",
        )}">
        <div class="opts">
          <div class="opt-row"><input class="opt-input opt0" placeholder="Variant A" value="${escapeHtml(
            q?.options?.[0] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt1" placeholder="Variant B" value="${escapeHtml(
            q?.options?.[1] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt2" placeholder="Variant C" value="${escapeHtml(
            q?.options?.[2] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt3" placeholder="Variant D" value="${escapeHtml(
            q?.options?.[3] || "",
          )}"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
        <label style="font-size:13px;color:var(--muted)">To'g'ri</label>
        <select class="q-correct" style="padding:6px;border-radius:6px;background:transparent;color:inherit;border:1px solid rgba(255,255,255,0.04)">
          <option value="0">A</option>
          <option value="1">B</option>
          <option value="2">C</option>
          <option value="3">D</option>
        </select>
        <button class="remove-q">O'chirish</button>
      </div>
    `;
    wrap.querySelector(".q-correct").value = String(q?.correct ?? 0);
    wrap
      .querySelector(".remove-q")
      .addEventListener("click", () => wrap.remove());
    return wrap;
  }

  function addQuestionRow(q) {
    el("questionsContainer").appendChild(makeQuestionRow(q));
  }

  function clearAddPanel() {
    el("tName").value = "";
    el("tTime").value = "120";
    el("tType").value = "";
    el("questionsContainer").innerHTML = "";
    editingTestId = null;
  }

  function clearUserPanel() {
    el("uFullname").value = "";
    el("uLogin").value = "";
    el("uPassword").value = "";
    el("uStatus").value = "";
    el("userPanelTitle").textContent = "Yangi foydalanuvchi";
    editingUserId = null;
  }

  let editingTestId = null;
  let editingUserId = null;

  async function saveTestHandler() {
    const name = el("tName").value.trim();
    const time = Number(el("tTime").value) || 120;
    const type = el("tType").value.trim();
    if (!name) {
      alert("Test nomi kiriting");
      return;
    }
    const questions = collectQuestionsFromDOM();
    if (!questions.length) {
      if (!confirm("Savolsiz test saqlansinmi?")) return;
    }

    let tests = readPublicTests();
    let savedTest = null;
    if (editingTestId === null) {
      const newTest = {
        id: Date.now(),
        name,
        time,
        type,
        questions,
        createdAt: new Date().toLocaleString(),
      };
      if (window.api && window.api.createTest) {
        const remoteTest = {
          name,
          time,
          type,
          questions,
          createdAt: newTest.createdAt,
        };
        savedTest = await saveTestRemote(remoteTest, true);
      }
      tests.push(savedTest || newTest);
    } else {
      const idx = tests.findIndex((t) => t.id === editingTestId);
      if (idx === -1) return alert("Tahrir xatosi");
      const updatedTest = Object.assign({}, tests[idx], {
        name,
        time,
        type,
        questions,
      });
      if (window.api && window.api.updateTest) {
        savedTest = await saveTestRemote(updatedTest, false);
      }
      tests[idx] = savedTest || updatedTest;
    }
    writePublicTests(tests);
    if (savedTest) await syncFromServer();
    el("addPanel").style.display = "none";
    clearAddPanel();
    renderTests();
    renderDashboard();
    alert("Saqlandi");
  }

  async function saveUserHandler() {
    const fullname = el("uFullname").value.trim();
    const login = el("uLogin").value.trim();
    const password = el("uPassword").value.trim();
    const status = el("uStatus").value.trim() || "Faol";
    if (!fullname || !login || !password) {
      alert("Barcha maydonlarni to'ldiring");
      return;
    }

    let users = readUsers();
    let savedUser = null;
    if (editingUserId === null) {
      if (users.some((user) => user.login === login)) {
        return alert("Bu login allaqachon mavjud");
      }
      const newUser = {
        id: Date.now(),
        fullname,
        login,
        password,
        status,
        createdAt: new Date().toLocaleString(),
      };
      if (window.api && window.api.createUser) {
        const remoteUser = {
          fullname,
          login,
          password,
          status,
          createdAt: newUser.createdAt,
        };
        savedUser = await saveUserRemote(remoteUser, true);
      }
      users.push(savedUser || newUser);
    } else {
      const idx = users.findIndex((user) => user.id === editingUserId);
      if (idx === -1) return alert("Foydalanuvchi topilmadi");
      if (
        users.some((user) => user.login === login && user.id !== editingUserId)
      ) {
        return alert("Bu login allaqachon boshqa foydalanuvchiga tegishli");
      }
      const updatedUser = Object.assign({}, users[idx], {
        fullname,
        login,
        password,
        status,
      });
      if (window.api && window.api.updateUser) {
        savedUser = await saveUserRemote(updatedUser, false);
      }
      users[idx] = savedUser || updatedUser;
    }
    writeUsers(users);
    if (savedUser) await syncFromServer();
    renderUsers(el("searchUsers").value.trim());
    renderDashboard();
    clearUserPanel();
    el("userPanel").style.display = "none";
    alert("Foydalanuvchi saqlandi");
  }

  window.deleteUser = async function (id) {
    if (!confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    if (window.api && window.api.deleteUser) {
      await deleteUserRemote(id);
      await syncFromServer();
    }
    const users = readUsers().filter((user) => user.id !== id);
    writeUsers(users);
    renderUsers(el("searchUsers").value.trim());
    renderDashboard();
  };

  window.editUser = function (id) {
    const users = readUsers();
    const user = users.find((item) => item.id === id);
    if (!user) return alert("Foydalanuvchi topilmadi");
    editingUserId = user.id;
    el("uFullname").value = user.fullname;
    el("uLogin").value = user.login;
    el("uPassword").value = user.password;
    el("uStatus").value = user.status;
    el("userPanelTitle").textContent = "Foydalanuvchini tahrirlash";
    el("userPanel").style.display = "block";
  };

  window.deleteTest = async function (id) {
    if (!confirm("Testni o'chirishni tasdiqlaysizmi?")) return;
    if (window.api && window.api.deleteTest) {
      await deleteTestRemote(id);
      await syncFromServer();
    }
    const tests = readPublicTests().filter((t) => t.id !== id);
    writePublicTests(tests);
    renderTests();
    renderDashboard();
  };

  window.editTest = function (id) {
    const tests = readPublicTests();
    const t = tests.find((x) => x.id === id);
    if (!t) return alert("Topilmadi");
    editingTestId = t.id;
    el("tName").value = t.name;
    el("tTime").value = t.time || 120;
    el("tType").value = t.type || "";
    el("questionsContainer").innerHTML = "";
    (t.questions || []).forEach((q) => addQuestionRow(q));
    el("addPanel").style.display = "block";
  };

  function renderResults() {
    const list = el("resultsList");
    const results = readResults();
    if (!results.length) {
      list.innerHTML = '<div class="panel">Natija topilmadi</div>';
      return;
    }
    list.innerHTML = results
      .slice()
      .reverse()
      .map((r) => {
        return `<div class="result-item"><strong>${escapeHtml(
          r.fullname || r.student || "Anon",
        )}</strong> � ${escapeHtml(r.test || "")} � <span style="font-weight:700">${escapeHtml(
          String(r.percent || r.score || 0),
        )}%</span> � ${escapeHtml(String(r.time || ""))} � <span style="color:var(--muted)">${escapeHtml(
          r.date || "",
        )}</span></div>`;
      })
      .join("");
  }

  function bind() {
    document.querySelectorAll(".nav-btn").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-btn")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        document
          .querySelectorAll(".page")
          .forEach((p) => p.classList.remove("active"));
        const page = b.dataset.page;
        document.getElementById(page).classList.add("active");
        el("pageTitle").textContent =
          page.charAt(0).toUpperCase() + page.slice(1);
        if (page === "tests") renderTests();
        if (page === "dashboard") renderDashboard();
        if (page === "results") renderResults();
        if (page === "users") renderUsers(el("searchUsers").value.trim());
      }),
    );

    el("openAdd").addEventListener("click", () => {
      editingTestId = null;
      el("addPanel").style.display = "block";
      el("questionsContainer").innerHTML = "";
      addQuestionRow();
    });
    el("cancelAdd").addEventListener("click", () => {
      el("addPanel").style.display = "none";
      clearAddPanel();
    });
    el("saveTest").addEventListener("click", saveTestHandler);
    el("addQuestion").addEventListener("click", () => addQuestionRow());

    el("openUserAdd").addEventListener("click", () => {
      clearUserPanel();
      el("userPanel").style.display = "block";
    });
    el("cancelUser").addEventListener("click", () => {
      el("userPanel").style.display = "none";
      clearUserPanel();
    });
    el("saveUser").addEventListener("click", saveUserHandler);
    el("searchUsers").addEventListener("input", (e) => {
      renderUsers(e.target.value.trim());
    });
  }

  function init() {
    renderDashboard();
    renderTests();
    renderUsers();
    renderResults();
    bind();
    const menu = document.getElementById("menuToggle");
    const sidebarEl = document.getElementById("sidebar");
    if (menu && sidebarEl) {
      menu.addEventListener("click", () => {
        sidebarEl.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (window.innerWidth <= 800 && sidebarEl.classList.contains("open")) {
          if (!sidebarEl.contains(e.target) && e.target !== menu) {
            sidebarEl.classList.remove("open");
          }
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem("admin_logged_in") === "true";
    if (!isLoggedIn) {
      const indexPath = window.location.pathname.includes("/html/")
        ? "../index.html"
        : "index.html";
      window.location.href = indexPath;
      return;
    }
    // Admin is logged in, initialize the panel
    (async () => {
      await syncFromServer();
      init();
    })();
  });
})();
