// ===== TAB SWITCHING =====
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-page").forEach((pg) => pg.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("page-" + name).classList.add("active");
}

function getCurrentUser() {
  return window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null;
}

async function savePassword() {
  const oldPass = document.getElementById("oldPass").value.trim();
  const newPass = document.getElementById("newPass").value.trim();
  const confirmPass = document.getElementById("confirmPass").value.trim();
  const msg = document.getElementById("passMsg");

  if (!oldPass || !newPass || !confirmPass) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Barcha maydonlarni to'ldiring!";
    return;
  }

  if (newPass !== confirmPass) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Yangi parollar mos kelmadi!";
    return;
  }

  if (newPass.length < 6) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Parol kamida 6 ta belgidan iborat bo'lsin!";
    return;
  }

  const user = getCurrentUser();
  if (!user || !window.api || !window.api.updateUserPassword) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Tizimga ulanib bo'lmadi.";
    return;
  }

  try {
    const res = await window.api.updateUserPassword(user.login, oldPass, newPass);
    if (!res || !res.ok) {
      msg.className = "form-msg error";
      msg.textContent = "❌ Joriy parol noto'g'ri yoki yangilash imkoni yo'q.";
      return;
    }
    msg.className = "form-msg success";
    msg.textContent = "✅ Parol muvaffaqiyatli o'zgartirildi!";
    document.getElementById("oldPass").value = "";
    document.getElementById("newPass").value = "";
    document.getElementById("confirmPass").value = "";
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = "❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
    console.error(error);
  }

  setTimeout(() => {
    msg.textContent = "";
  }, 3000);
}

async function loadResults() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = window.location.pathname.includes("/html/") ? "../index.html" : "../index.html";
    return;
  }

  const empty = document.getElementById("emptyState");
  const list = document.getElementById("resultsList");
  const results =
    window.api && window.api.getUserResults
      ? await window.api.getUserResults(currentUser.id, currentUser.login)
      : [];

  if (!results || results.length === 0) {
    empty.style.display = "block";
    list.style.display = "none";
    return;
  }

  empty.style.display = "none";
  list.style.display = "block";
  list.innerHTML = results
    .slice()
    .reverse()
    .map((r) => {
      const total = Number(r.correct || 0) + Number(r.wrong || 0) || r.total || 0;
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

document.addEventListener("DOMContentLoaded", () => {
  loadResults();
});
