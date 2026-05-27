/* Test runtime: loads active_test_id -> public_tests, runs timer, collects answers, stores results */
(function () {
  "use strict";

  function readPublic() {
    try {
      return JSON.parse(localStorage.getItem("public_tests") || "[]");
    } catch (e) {
      return [];
    }
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

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null");
    } catch (e) {
      return null;
    }
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

  function loadActive() {
    const id = localStorage.getItem("active_test_id");
    if (!id) return null;
    const all = readPublic();
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
      `<div style="font-weight:600">${current + 1}. ${escape(q.text)}</div>` +
      '<div style="margin-top:10px">' +
      q.options
        .map(
          (o, i) =>
            `<div class="option ${answers[current] === i ? "active" : ""}" data-i="${i}">${escape(o)}</div>`,
        )
        .join("") +
      "</div>";
    finishBtn.style.display =
      current === questions.length - 1 ? "inline-block" : "none";
    questionCard.querySelectorAll(".option").forEach((o) =>
      o.addEventListener("click", () => {
        const idx = Number(o.dataset.i);
        answers[current] = idx;
        renderGrid();
        renderQuestion();
      }),
    );
  }

  function renderGrid() {
    gridEl.innerHTML = questions
      .map(
        (q, i) =>
          `<button class="${answers[i] !== undefined && answers[i] !== null ? "answered" : ""}" data-i="${i}">${i + 1}</button>`,
      )
      .join("");
    gridEl.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        current = Number(b.dataset.i);
        renderQuestion();
      }),
    );
  }

  function escape(s) {
    return String(s || "")
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

  function finish(auto) {
    if (!auto) {
      if (!confirm("Testni yakunlamoqchimisiz?")) return;
    }
    clearInterval(timerInterval);
    let correct = 0;
    let incorrect = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
      else incorrect++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const user = getCurrentUser();
    const resObj = {
      id: Date.now(),
      userId: user?.id || null,
      fullname: user?.fullname || user?.login || "Anon",
      login: user?.login || null,
      test: test.name || "Test",
      score,
      correct,
      wrong: incorrect,
      percent: score,
      time: formatTime((test.time || 0) * 60 - secondsLeft),
      date: new Date().toLocaleString(),
    };
    const results = readResults();
    results.push(resObj);
    writeResults(results);
    // try send to backend, fallback saved locally
    if (window.api && window.api.postResult) {
      window.api.postResult(resObj).catch(() => {});
    }
    resultArea.innerHTML = `<div>To'g'ri: <strong>${correct}</strong></div><div>Noto'g'ri: <strong>${incorrect}</strong></div><div>Foiz: <strong>${score}%</strong></div>`;
    resultModal.style.display = "flex";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    // try sync tests from server (admin-provided) into localStorage
    (async () => {
      if (window.api && window.api.getTests) {
        try {
          const srv = await window.api.getTests();
          if (Array.isArray(srv) && srv.length) {
            localStorage.setItem("public_tests", JSON.stringify(srv));
          }
        } catch (e) {
          // ignore - fallback to localStorage
        }
      }
      test = loadActive();

      if (!test) {
        questionCard.innerHTML =
          '<div class="card">Faol test topilmadi. Bosh sahifaga qayting.</div>';
        return;
      }
      initAfterLoad();
    })();

    function initAfterLoad() {
      testTitle && (testTitle.textContent = test.name || "Test");
      questions = (test.questions || []).map((q) => ({
        text: q.text,
        options: q.options,
        correct: Number(q.correct || 0),
      }));
      answers = new Array(questions.length).fill(null);
      secondsLeft = (test.time || 120) * 60;
      timerEl.textContent = formatTime(secondsLeft);
      renderGrid();
      renderQuestion();
      startTimer();
    }
  });
})();
