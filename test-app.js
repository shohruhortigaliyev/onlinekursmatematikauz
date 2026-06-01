/* Test runtime: loads active_test_id, runs timer, collects answers, saves results to Supabase */
(function () {
  "use strict";

  function getCurrentUser() {
    return window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null;
  }

  const timerEl = document.getElementById("timer");
  const questionCard = document.getElementById("questionCard");
  const gridEl = document.getElementById("grid");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");
  const resultModal = document.getElementById("resultModal");
  const resultArea = document.getElementById("resultArea");
  const closeRes = document.getElementById("closeRes");
  const testTitle = document.getElementById("testTitle");

  let test = null;
  let questions = [];
  let answers = [];
  let current = 0;
  let secondsLeft = 0;
  let timerInterval = null;

  function getActiveTestId() {
    return window.api && window.api.getActiveTestId ? window.api.getActiveTestId() : null;
  }

  async function loadActive() {
    const id = getActiveTestId();
    if (!id) return null;
    const all = window.api && window.api.getTests ? await window.api.getTests() : [];
    return all.find((t) => String(t.id) === String(id)) || null;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsLeft--;
      timerEl.textContent = formatTime(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        finish(true);
      }
    }, 1000);
  }

  function renderQuestion() {
    const q = questions[current];
    questionCard.innerHTML =
      `<div style="font-weight:600">${escapeHtml(current + 1 + ". " + (q.text || ""))}</div>` +
      '<div style="margin-top:10px">' +
      (q.options || [])
        .map(
          (o, i) =>
            `<div class="option ${answers[current] === i ? "active" : ""}" data-i="${i}">${escapeHtml(o)}</div>`,
        )
        .join("") +
      '</div>';
    finishBtn.style.display = current === questions.length - 1 ? "inline-block" : "none";
    questionCard.querySelectorAll(".option").forEach((option) =>
      option.addEventListener("click", () => {
        const idx = Number(option.dataset.i);
        answers[current] = idx;
        renderGrid();
        renderQuestion();
      }),
    );
  }

  function renderGrid() {
    gridEl.innerHTML = questions
      .map(
        (_, i) =>
          `<button class="${answers[i] !== undefined && answers[i] !== null ? "answered" : ""}" data-i="${i}">${i + 1}</button>`,
      )
      .join("");
    gridEl.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", () => {
        current = Number(button.dataset.i);
        renderQuestion();
      }),
    );
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  prevBtn.addEventListener("click", () => {
    if (current > 0) {
      current--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (current < questions.length - 1) {
      current++;
      renderQuestion();
    }
  });

  finishBtn.addEventListener("click", () => {
    finish(false);
  });

  closeRes &&
    closeRes.addEventListener("click", () => {
      resultModal.style.display = "none";
      window.location.href = "bosh-sahifa.html";
    });

  async function finish(auto) {
    if (!auto) {
      if (!confirm("Testni yakunlamoqchimisiz?")) return;
    }
    clearInterval(timerInterval);
    const correctCount = questions.reduce((sum, question, index) => {
      return sum + (answers[index] === Number(question.correct) ? 1 : 0);
    }, 0);
    const incorrect = questions.length - correctCount;
    const score = Math.round((correctCount / questions.length) * 100);
    const user = getCurrentUser();
    const result = {
      userId: user?.id || null,
      fullname: user?.fullname || user?.login || "Anon",
      login: user?.login || null,
      test: test.name || "Test",
      score,
      correct: correctCount,
      wrong: incorrect,
      percent: score,
      time: formatTime((test.time || 0) * 60 - secondsLeft),
      date: new Date().toLocaleString(),
    };
    if (window.api && window.api.postResult) {
      try {
        await window.api.postResult(result);
      } catch (error) {
        console.error("Result save error:", error);
      }
    }
    resultArea.innerHTML = `<div>To'g'ri: <strong>${correctCount}</strong></div><div>Noto'g'ri: <strong>${incorrect}</strong></div><div>Foiz: <strong>${score}%</strong></div>`;
    resultModal.style.display = "flex";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    test = await loadActive();
    if (!test) {
      questionCard.innerHTML = '<div class="card">Faol test topilmadi. Bosh sahifaga qayting.</div>';
      return;
    }
    initAfterLoad();
  });

  function initAfterLoad() {
    testTitle && (testTitle.textContent = test.name || "Test");
    questions = (test.questions || []).map((q) => ({
      text: q.text,
      options: q.options || [],
      correct: Number(q.correct || 0),
    }));
    answers = new Array(questions.length).fill(null);
    secondsLeft = (test.time || 120) * 60;
    timerEl.textContent = formatTime(secondsLeft);
    renderGrid();
    renderQuestion();
    startTimer();
  }
})();
