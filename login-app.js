/* Login app for admin and users with localStorage account management */
const DEFAULT_ADMIN = { login: "admin", pass: "12345" };
const ALT_ADMIN = { login: "admin", pass: "admin123" };

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

function getInput(id) {
  return document.getElementById(id).value.trim();
}

function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
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

function loginUser() {
  const login = getInput("userLogin");
  const pass = getInput("userPass");
  if (!login) return showError("userError", "Loginni kiriting!");
  if (!pass) return showError("userError", "Parolni kiriting!");
  // Try backend login first
  if (window.api) {
    window.api
      .loginUser(login, pass)
      .then((res) => {
        if (res && res.ok) {
          const u = res.user;
          localStorage.setItem(
            "current_user",
            JSON.stringify({
              id: u.id,
              fullname: u.name || u.fullname || u.code,
              login: u.code,
            }),
          );
          showSuccess("userError", "✅ Muvaffaqiyatli kirildi!");
          setTimeout(() => (window.location.href = "bosh-sahifa.html"), 600);
        } else {
          // fallback to local
          const users = readUsers();
          const user = users.find(
            (item) => item.login === login && item.password === pass,
          );
          if (!user)
            return showError("userError", "Login yoki parol noto‘g‘ri!");
          localStorage.setItem(
            "current_user",
            JSON.stringify({
              id: user.id,
              fullname: user.fullname,
              login: user.login,
              status: user.status,
              createdAt: user.createdAt,
            }),
          );
          showSuccess("userError", "✅ Muvaffaqiyatli kirildi!");
          setTimeout(() => (window.location.href = "bosh-sahifa.html"), 600);
        }
      })
      .catch(() => {
        const users = readUsers();
        const user = users.find(
          (item) => item.login === login && item.password === pass,
        );
        if (!user) return showError("userError", "Login yoki parol noto‘g‘ri!");
        localStorage.setItem(
          "current_user",
          JSON.stringify({
            id: user.id,
            fullname: user.fullname,
            login: user.login,
            status: user.status,
            createdAt: user.createdAt,
          }),
        );
        showSuccess("userError", "✅ Muvaffaqiyatli kirildi!");
        setTimeout(() => (window.location.href = "bosh-sahifa.html"), 600);
      });
    return;
  }

  // local fallback (should rarely run now)
  const users = readUsers();
  const user = users.find(
    (item) => item.login === login && item.password === pass,
  );
  if (!user) {
    return showError("userError", "Login yoki parol noto‘g‘ri!");
  }

  localStorage.setItem(
    "current_user",
    JSON.stringify({
      id: user.id,
      fullname: user.fullname,
      login: user.login,
      status: user.status,
      createdAt: user.createdAt,
    }),
  );

  showSuccess("userError", "✅ Muvaffaqiyatli kirildi!");
  setTimeout(() => {
    window.location.href = "bosh-sahifa.html";
  }, 600);
}

function loginAdmin() {
  const login = getInput("adminLogin");
  const pass = getInput("adminPass");
  if (!login) return showError("adminError", "Loginni kiriting!");
  if (!pass) return showError("adminError", "Parolni kiriting!");
  // Try backend admin login
  if (window.api) {
    window.api
      .adminLogin(pass)
      .then((res) => {
        if (res && res.ok && res.admin_key) {
          localStorage.setItem("admin_logged_in", "true");
          localStorage.setItem("admin_key", res.admin_key);
          showSuccess("adminError", "✅ Admin paneliga kirildi!");
          setTimeout(() => (window.location.href = "admin.html"), 600);
        } else {
          // fallback local check
          const creds =
            JSON.parse(localStorage.getItem("adminCreds") || "null") ||
            DEFAULT_ADMIN;
          const okAdmin =
            (login === creds.login && pass === creds.pass) ||
            (login === ALT_ADMIN.login && pass === ALT_ADMIN.pass);
          if (okAdmin) {
            localStorage.setItem("admin_logged_in", "true");
            showSuccess("adminError", "✅ Admin paneliga kirildi!");
            setTimeout(() => (window.location.href = "admin.html"), 600);
          } else showError("adminError", "Login yoki parol noto'g'ri!");
        }
      })
      .catch(() => {
        const creds =
          JSON.parse(localStorage.getItem("adminCreds") || "null") ||
          DEFAULT_ADMIN;
        const okAdmin =
          (login === creds.login && pass === creds.pass) ||
          (login === ALT_ADMIN.login && pass === ALT_ADMIN.pass);
        if (okAdmin) {
          localStorage.setItem("admin_logged_in", "true");
          showSuccess("adminError", "✅ Admin paneliga kirildi!");
          setTimeout(() => (window.location.href = "admin.html"), 600);
        } else showError("adminError", "Login yoki parol noto'g'ri!");
      });
    return;
  }

  const creds =
    JSON.parse(localStorage.getItem("adminCreds") || "null") || DEFAULT_ADMIN;
  const okAdmin =
    (login === creds.login && pass === creds.pass) ||
    (login === ALT_ADMIN.login && pass === ALT_ADMIN.pass);
  if (okAdmin) {
    localStorage.setItem("admin_logged_in", "true");
    showSuccess("adminError", "✅ Admin paneliga kirildi!");
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 600);
  } else {
    showError("adminError", "Login yoki parol noto'g'ri!");
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

document.addEventListener("DOMContentLoaded", () => {
  switchTab("user");
  document.getElementById("userLogin").focus();
});

// Ensure demo user exists so demo credentials on index.html work without edits
document.addEventListener("DOMContentLoaded", () => {
  try {
    const users = readUsers();
    if (!users.some((u) => u.login === "00-913")) {
      users.push({
        id: Date.now(),
        fullname: "Demo Foydalanuvchi",
        login: "00-913",
        password: "123456",
        status: "Faol",
        createdAt: new Date().toLocaleString(),
      });
      writeUsers(users);
    }
  } catch (e) {
    // ignore
  }
});
