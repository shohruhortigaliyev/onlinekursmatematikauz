/* Admin app - Supabase-based user, test, and result management */
(function () {
  "use strict";

  let users = [];
  let tests = [];
  let results = [];
  let editingTestId = null;
  let editingUserId = null;
  let resultsSubscription = null;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function refreshData() {
    if (!window.api) return;
    try {
      const [loadedUsers, loadedTests, loadedResults] = await Promise.all([
        window.api.getUsers(),
        window.api.getTests(),
        window.api.getResults(),
      ]);
      users = loadedUsers || [];
      tests = loadedTests || [];
      results = loadedResults || [];
    } catch (error) {
      console.error("Ma'lumotlarni yuklash xatosi:", error);
      users = users || [];
      tests = tests || [];
      results = results || [];
    }
  }

  function getUserStats(user) {
    const userResults = results.filter(
      (r) => String(r.userId) === String(user.id) || r.login === user.login,
    );
    const total = userResults.length;
    const sum = userResults.reduce(
      (acc, item) => acc + Number(item.percent || item.score || 0),
      0,
    );
    return {
      totalTests: total,
      avgScore: total ? Math.round(sum / total) : 0,
    };
  }

  function renderDashboard() {
    el("countTests").textContent = String(tests.length);
    el("countUsers").textContent = String(users.length);
    el("countResults").textContent = String(results.length);
  }

  function renderTests() {
    const list = el("testsList");
    if (!tests.length) {
      list.innerHTML = '<div class="panel">Hozircha testlar yo‘q</div>';
      return;
    }
    list.innerHTML = tests
      .map((test) => {
        const qCount = (test.questions || []).length;
        return `
        <div class="test-card">
          <div style="display:flex;justify-content:space-between"><strong>${escapeHtml(
            test.name,
          )}</strong><span>${test.time || 0} min</span></div>
          <div style="margin-top:8px;color:var(--muted, #9aa)">Savollar: ${qCount} — Turi: ${escapeHtml(
            test.type || "",
          )}</div>
          <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" onclick="editTest(${test.id})">Tahrirlash</button><button class="btn ghost" onclick="deleteTest(${test.id})">O'chirish</button></div>
        </div>`;
      })
      .join("");
  }

  function renderUsers(query = "") {
    const list = el("usersList");
    const filtered = users.filter((user) => {
      const value = `${user.fullname} ${user.login} ${user.status}`.toLowerCase();
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
            <div class="user-meta">${escapeHtml(user.login)} • ${escapeHtml(user.status)}</div>
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

  function renderResults() {
    const list = el("resultsList");
    if (!results.length) {
      list.innerHTML = '<div class="panel">Natija topilmadi</div>';
      return;
    }
    list.innerHTML = results
      .slice()
      .reverse()
      .map((result) => {
        return `<div class="result-item"><strong>${escapeHtml(
          result.fullname || result.student || "Anon",
        )}</strong> — ${escapeHtml(result.test || "")} — <span style="font-weight:700">${escapeHtml(
          String(result.percent || result.score || 0),
        )}%</span> — ${escapeHtml(String(result.time || ""))} — <span style="color:var(--muted)">${escapeHtml(
          result.date || "",
        )}</span></div>`;
      })
      .join("");
  }

  function collectQuestionsFromDOM() {
    const container = el("questionsContainer");
    const rows = Array.from(container.children);
    return rows
      .map((row, index) => {
        const text = row.querySelector(".q-text").value.trim();
        const options = [
          row.querySelector(".opt0").value.trim(),
          row.querySelector(".opt1").value.trim(),
          row.querySelector(".opt2").value.trim(),
          row.querySelector(".opt3").value.trim(),
        ];
        const correct = Number(row.querySelector(".q-correct").value);
        return { id: index + 1, text, options, correct };
      })
      .filter((question) => question.text);
  }

  function makeQuestionRow(question = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "question-row";
    wrapper.innerHTML = `
      <div class="question-main">
        <input class="q-input q-text" placeholder="Savol matni" value="${escapeHtml(
          question.text || "",
        )}">
        <div class="opts">
          <div class="opt-row"><input class="opt-input opt0" placeholder="Variant A" value="${escapeHtml(
            question.options?.[0] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt1" placeholder="Variant B" value="${escapeHtml(
            question.options?.[1] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt2" placeholder="Variant C" value="${escapeHtml(
            question.options?.[2] || "",
          )}"></div>
          <div class="opt-row"><input class="opt-input opt3" placeholder="Variant D" value="${escapeHtml(
            question.options?.[3] || "",
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
    wrapper.querySelector(".q-correct").value = String(question.correct ?? 0);
    wrapper.querySelector(".remove-q").addEventListener("click", () => wrapper.remove());
    return wrapper;
  }

  function addQuestionRow(question = {}) {
    el("questionsContainer").appendChild(makeQuestionRow(question));
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

  async function saveTestHandler() {
    const name = el("tName").value.trim();
    const time = Number(el("tTime").value) || 120;
    const type = el("tType").value.trim();
    if (!name) {
      alert("Test nomi kiriting");
      return;
    }
    const questions = collectQuestionsFromDOM();
    if (!questions.length && !confirm("Savolsiz test saqlansinmi?")) {
      return;
    }
    const testPayload = {
      id: editingTestId === null ? Date.now() : editingTestId,
      name,
      time,
      type,
      questions,
    };
    try {
      if (editingTestId === null) {
        await window.api.createTest(testPayload);
      } else {
        await window.api.updateTest(testPayload);
      }
      await refreshData();
      el("addPanel").style.display = "none";
      clearAddPanel();
      renderTests();
      renderDashboard();
      alert("Saqlandi");
    } catch (error) {
      console.error(error);
      alert("Test saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
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
    try {
      if (editingUserId === null) {
        if (users.some((item) => item.login === login)) {
          alert("Bu login allaqachon mavjud");
          return;
        }
        await window.api.createUser({ fullname, login, password, status });
      } else {
        if (users.some((item) => item.login === login && item.id !== editingUserId)) {
          alert("Bu login allaqachon boshqa foydalanuvchiga tegishli");
          return;
        }
        await window.api.updateUser({
          id: editingUserId,
          fullname,
          login,
          password,
          status,
        });
      }
      await refreshData();
      renderUsers(el("searchUsers").value.trim());
      renderDashboard();
      clearUserPanel();
      el("userPanel").style.display = "none";
      alert("Foydalanuvchi saqlandi");
    } catch (error) {
      console.error(error);
      alert("Foydalanuvchi saqlashda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  }

  window.deleteUser = async function (id) {
    if (!confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await window.api.deleteUser(id);
      await refreshData();
      renderUsers(el("searchUsers").value.trim());
      renderDashboard();
    } catch (error) {
      console.error(error);
      alert("Foydalanuvchini o'chirishda xatolik yuz berdi.");
    }
  };

  window.editUser = function (id) {
    const user = users.find((item) => item.id === id);
    if (!user) {
      alert("Foydalanuvchi topilmadi");
      return;
    }
    editingUserId = user.id;
    el("uFullname").value = user.fullname;
    el("uLogin").value = user.login;
    el("uPassword").value = user.password || "";
    el("uStatus").value = user.status;
    el("userPanelTitle").textContent = "Foydalanuvchini tahrirlash";
    el("userPanel").style.display = "block";
  };

  window.deleteTest = async function (id) {
    if (!confirm("Testni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await window.api.deleteTest(id);
      await refreshData();
      renderTests();
      renderDashboard();
    } catch (error) {
      console.error(error);
      alert("Testni o'chirishda xatolik yuz berdi.");
    }
  };

  window.editTest = function (id) {
    const test = tests.find((item) => item.id === id);
    if (!test) {
      alert("Topilmadi");
      return;
    }
    editingTestId = test.id;
    el("tName").value = test.name;
    el("tTime").value = test.time || 120;
    el("tType").value = test.type || "";
    el("questionsContainer").innerHTML = "";
    (test.questions || []).forEach((question) => addQuestionRow(question));
    el("addPanel").style.display = "block";
  };

  function bind() {
    document.querySelectorAll(".nav-btn").forEach((button) =>
      button.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
        const pageKey = button.dataset.page;
        document.getElementById(pageKey).classList.add("active");
        el("pageTitle").textContent = pageKey.charAt(0).toUpperCase() + pageKey.slice(1);
        if (pageKey === "tests") renderTests();
        if (pageKey === "dashboard") renderDashboard();
        if (pageKey === "results") renderResults();
        if (pageKey === "users") renderUsers(el("searchUsers").value.trim());
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
    el("searchUsers").addEventListener("input", (event) => {
      renderUsers(event.target.value.trim());
    });
  }

  function subscribeToRealtimeResults() {
    if (!window.api || !window.api.subscribeToResults || resultsSubscription) {
      return;
    }
    resultsSubscription = window.api.subscribeToResults((newResult) => {
      results.unshift(newResult);
      renderDashboard();
      if (document.getElementById("results").classList.contains("active")) {
        renderResults();
      }
    });
  }

  async function init() {
    await refreshData();
    renderDashboard();
    renderTests();
    renderResults();
    bind();
    subscribeToRealtimeResults();
    const menu = el("menuToggle");
    const sidebarEl = el("sidebar");
    if (menu && sidebarEl) {
      menu.addEventListener("click", () => {
        sidebarEl.classList.toggle("open");
      });
      document.addEventListener("click", (event) => {
        if (window.innerWidth <= 800 && sidebarEl.classList.contains("open")) {
          if (!sidebarEl.contains(event.target) && event.target !== menu) {
            sidebarEl.classList.remove("open");
          }
        }
      });
    }
  }

  window.doLogin = async function () {
    const login = el("loginInput").value.trim();
    const pass = el("passInput").value.trim();
    const errorEl = el("loginError");
    if (!login || !pass) {
      errorEl.textContent = "Login va parolni kiriting";
      return;
    }
    if (!window.api || !window.api.adminLogin) {
      errorEl.textContent = "Servisga ulanish imkoni yo'q.";
      return;
    }
    try {
      const res = await window.api.adminLogin(login, pass);
      if (!res || !res.ok) {
        errorEl.textContent = "Login yoki parol noto‘g‘ri";
        return;
      }
      el("loginOverlay").style.display = "none";
      el("adminLayout").style.display = "flex";
      await init();
    } catch (error) {
      errorEl.textContent = "Tizimda xatolik yuz berdi";
      console.error(error);
    }
  };

  window.doLogout = function () {
    if (window.api && window.api.clearAdminSession) {
      window.api.clearAdminSession();
    }
    location.reload();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const session = window.api && window.api.getAdminSession && window.api.getAdminSession();
    if (session) {
      el("loginOverlay").style.display = "none";
      el("adminLayout").style.display = "flex";
      init();
    }
  });
})();
