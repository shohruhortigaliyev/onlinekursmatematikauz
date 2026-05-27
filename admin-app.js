/* ADMIN PANEL - SUPABASE ONLY */
(function () {
"use strict";

function getAdminKey() {
  return localStorage.getItem("admin_key");
}

/* ---------------- DASHBOARD SYNC ---------------- */
async function syncFromServer() {
  if (!window.api) return;

  try {
    const tests = await window.api.getTests();
    const users = await window.api.getUsers();
    const results = await window.api.getResults?.();

    localStorage.setItem("public_tests", JSON.stringify(tests || []));
    localStorage.setItem("users", JSON.stringify(users || []));
    localStorage.setItem("results", JSON.stringify(results || []));
  } catch (e) {
    console.log("sync error", e);
  }
}

/* ---------------- TEST SAVE ---------------- */
window.saveTestHandler = async function () {
  const name = document.getElementById("tName").value.trim();
  const time = Number(document.getElementById("tTime").value) || 120;
  const type = document.getElementById("tType").value.trim();

  const questions = window.currentQuestions || [];

  if (!name) return alert("Test nomi kerak");

  const adminKey = getAdminKey();

  try {
    await window.api.createTest(
      { name, time, type, questions },
      adminKey
    );

    await syncFromServer();
    alert("Test saqlandi");
  } catch (e) {
    alert("Xatolik: test saqlanmadi");
  }
};

/* ---------------- USER SAVE ---------------- */
window.saveUserHandler = async function () {
  const fullname = document.getElementById("uFullname").value.trim();
  const login = document.getElementById("uLogin").value.trim();
  const password = document.getElementById("uPassword").value.trim();

  if (!login || !password) return alert("Login/parol kerak");

  const adminKey = getAdminKey();

  try {
    await window.api.createUser(
      { code: login, pass: password, name: fullname },
      adminKey
    );

    await syncFromServer();
    alert("User saqlandi");
  } catch (e) {
    alert("Xatolik: user saqlanmadi");
  }
};

/* ---------------- DELETE ---------------- */
window.deleteUser = async function (id) {
  if (!confirm("O‘chirasizmi?")) return;

  const adminKey = getAdminKey();

  try {
    await window.api.deleteUser(id, adminKey);
    await syncFromServer();
  } catch (e) {
    alert("O‘chirishda xatolik");
  }
};

window.deleteTest = async function (id) {
  if (!confirm("Testni o‘chirasizmi?")) return;

  const adminKey = getAdminKey();

  try {
    await window.api.deleteTest(id, adminKey);
    await syncFromServer();
  } catch (e) {
    alert("O‘chirishda xatolik");
  }
};

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await syncFromServer();
});

})();