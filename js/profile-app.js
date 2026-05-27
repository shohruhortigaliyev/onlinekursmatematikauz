// ===== TAB SWITCHING =====
function switchTab(name) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  document
    .querySelectorAll(".tab-page")
    .forEach((pg) => pg.classList.remove("active"));

  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("page-" + name).classList.add("active");
}

// ===== PASSWORD SAVE =====
function savePassword() {
  const old = document.getElementById("oldPass").value.trim();
  const nw = document.getElementById("newPass").value.trim();
  const confirm = document.getElementById("confirmPass").value.trim();
  const msg = document.getElementById("passMsg");

  if (!old || !nw || !confirm) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Barcha maydonlarni to'ldiring!";
    return;
  }

  if (nw !== confirm) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Yangi parollar mos kelmadi!";
    return;
  }

  if (nw.length < 6) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Parol kamida 6 ta belgidan iborat bo'lsin!";
    return;
  }

  msg.className = "form-msg success";
  msg.textContent = "✅ Parol muvaffaqiyatli o'zgartirildi!";

  document.getElementById("oldPass").value = "";
  document.getElementById("newPass").value = "";
  document.getElementById("confirmPass").value = "";

  setTimeout(() => {
    msg.textContent = "";
  }, 3000);
}

// (Payment feature removed)

// ===== LOAD RESULTS =====
function loadResults() {
  // prefer centralized "results" key saved by test runtime
  const saved =
    localStorage.getItem("results") || localStorage.getItem("testResults");
  const results = saved ? JSON.parse(saved) : [];
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null");
    } catch (e) {
      return null;
    }
  })();

  const empty = document.getElementById("emptyState");
  const list = document.getElementById("resultsList");

  // filter results for current user when available
  const filtered = currentUser
    ? results.filter(
        (r) =>
          String(r.userId) === String(currentUser.id) ||
          r.login === currentUser.login,
      )
    : results;

  if (filtered.length === 0) {
    empty.style.display = "block";
    list.style.display = "none";
    return;
  }

  empty.style.display = "none";
  list.style.display = "block";

  list.innerHTML = filtered
    .slice()
    .reverse()
    .map((r) => {
      const total =
        Number(r.correct || 0) + Number(r.wrong || 0) || r.total || 0;
      const testName = r.test || r.testName || "Test";
      return `
    <div class="result-card">
      <div>
        <div class="rc-title">${testName}</div>
        <div class="rc-date">
          ${r.date} &nbsp;·&nbsp; ${r.correct || 0}/${total} to'g'ri
        </div>
      </div>
      <div class="result-score">${r.percent || r.score || 0}%</div>
    </div>
  `;
    })
    .join("");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadResults();
  // payments feature removed: no payment-related initialization
});
