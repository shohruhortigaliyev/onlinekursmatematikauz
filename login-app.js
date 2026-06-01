/* Login app for Matematika.uz using Supabase */

function getInput(id) {
  return document.getElementById(id).value.trim();
}

function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((panel) => panel.classList.remove("active"));
  document
    .querySelector(`[onclick="switchTab('${name}')"]`)
    .classList.add("active");
  document.getElementById("content-" + name).classList.add("active");
  clearErrors();
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.innerHTML = isHidden ? "👁️" : "👁️";
}

function clearErrors() {
  document.getElementById("userError").textContent = "";
  document.getElementById("adminError").textContent = "";
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = "⚠ " + msg;
  const card = document.querySelector(".login-card");
  if (card) {
    card.classList.remove("shake");
    void card.offsetHeight;
    card.classList.add("shake");
  }
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.style.color = "#2e7d32";
  el.textContent = msg;
}

async function loginUser() {
  const login = getInput("userLogin");
  const pass = getInput("userPass");
  if (!login) return showError("userError", "Loginni kiriting!");
  if (!pass) return showError("userError", "Parolni kiriting!");

  if (!window.api || !window.api.loginUser) {
    return showError("userError", "Servisga ulanish imkoni yo'q.");
  }

  try {
    const res = await window.api.loginUser(login, pass);
    if (!res || !res.ok) {
      return showError("userError", "Login yoki parol noto‘g‘ri!");
    }
    showSuccess("userError", "✅ Muvaffaqiyatli kirildi!");
    setTimeout(() => {
      window.location.href = "bosh-sahifa.html";
    }, 600);
  } catch (error) {
    showError(
      "userError",
      "Tizimda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    );
  }
}

async function loginAdmin() {
  const login = getInput("adminLogin");
  const pass = getInput("adminPass");
  if (!login) return showError("adminError", "Loginni kiriting!");
  if (!pass) return showError("adminError", "Parolni kiriting!");

  if (!window.api || !window.api.adminLogin) {
    return showError("adminError", "Servisga ulanish imkoni yo'q.");
  }

  try {
    console.log("Admin login uriniy:", { login, pass });
    const res = await window.api.adminLogin(login, pass);
    console.log("Admin login natijasi:", res);
    if (!res || !res.ok) {
      return showError("adminError", "Login yoki parol noto'g'ri!");
    }
    showSuccess("adminError", "✅ Admin paneliga kirildi!");
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 600);
  } catch (error) {
    console.error("Admin login xatolik:", error);
    showError(
      "adminError",
      "Tizimga ulanishda xatolik. Iltimos, qayta urinib ko'ring.",
    );
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (document.getElementById("content-user").classList.contains("active")) {
    loginUser();
  }
  if (document.getElementById("content-admin").classList.contains("active")) {
    loginAdmin();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  switchTab("user");
  document.getElementById("userLogin").focus();

  if (window.api && window.api.ensureDemoUser) {
    await window.api.ensureDemoUser();
  }
});
