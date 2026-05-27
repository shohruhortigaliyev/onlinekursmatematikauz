// ===== DEFAULT QUESTIONS =====
const defaultQuestions = [
  {
    id: 1,
    section: 1,
    text: "Quyida berilgan mulohaza axborotli jarayonlarning qaysi bosqichiga misol bo'la oladi?\n\"Sinf rahbari o'quvchilar haqidagi ma'lumotlarni jadvalga kiritdi.\"",
    options: ["uzatish", "to'plash", "qayta ishlash", "izlash"],
    correct: 1,
  },
  {
    id: 2,
    section: 1,
    text: "Kompyuterning asosiy xotirasi qanday qurilma hisoblanadi?",
    options: ["HDD", "RAM", "CPU", "GPU"],
    correct: 1,
  },
  {
    id: 3,
    section: 1,
    text: "Qaysi fayl kengaytmasi rasm faylini bildiradi?",
    options: [".mp3", ".docx", ".jpg", ".xlsx"],
    correct: 2,
  },
  {
    id: 4,
    section: 1,
    text: "qaysi fayl kengaytmasi rasm faylini bildiradi?",
    options: [".mp3", ".docx", "jpg", "xlsx"],
    correct: 2,
  },
];

// ===== DEFAULT SECTIONS =====
const defaultSections = [
  { label: "INFORMATIKA VA AXBOROT TEXNOLOGIYALARI", min: 1, max: 35 },
  { label: "KASBIY STANDART", min: 36, max: 40 },
  { label: "PEDAGOGIK MAHORAT", min: 41, max: 50 },
];

// ===== STATE =====
let questions = [];
let sections = [];
let answers = [];
let currentIndex = 0;
let totalSeconds = 120 * 60;
let timerInterval = null;
let activeTestName = "Attestatsiya namunaviy testi";
let isSelecting = false;

// ===== LOAD TEST =====
function loadTest() {
  const id = localStorage.getItem("active_test_id");

  const tests = JSON.parse(localStorage.getItem("public_tests") || "[]");

  const found = id ? tests.find((t) => String(t.id) === String(id)) : null;

  if (found && found.questions && found.questions.length > 0) {
    questions = found.questions;

    totalSeconds = (found.time || 120) * 60;

    activeTestName = found.name || "Custom Test";

    sections = [
      {
        label: activeTestName.toUpperCase(),
        min: 1,
        max: questions.length,
      },
    ];
  } else {
    questions = defaultQuestions;

    totalSeconds = 120 * 60;

    activeTestName = "Attestatsiya namunaviy testi";

    sections = defaultSections;
  }

  answers = new Array(questions.length).fill(null);

  const topbarTitle = document.getElementById("topbarTitle");
  const sidebarTitle = document.getElementById("sidebarTitle");

  if (topbarTitle) {
    topbarTitle.textContent = activeTestName;
  }

  if (sidebarTitle) {
    sidebarTitle.textContent = activeTestName;
  }
}

// ===== TIMER =====
function startTimer() {
  clearInterval(timerInterval);

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    totalSeconds--;

    if (totalSeconds <= 0) {
      clearInterval(timerInterval);

      finishTest(true);

      return;
    }

    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");

  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");

  const s = String(totalSeconds % 60).padStart(2, "0");

  const timer = document.getElementById("timer");

  if (timer) {
    timer.textContent = `⏱ ${h}:${m}:${s}`;
  }
}

// ===== BUILD GRID =====
function buildGrids() {
  const container = document.getElementById("sidebarSections");

  if (!container) return;

  container.innerHTML = "";

  sections.forEach((sec) => {
    const label = document.createElement("div");

    label.className = "sidebar-section-label";

    label.textContent = sec.label;

    container.appendChild(label);

    const grid = document.createElement("div");

    grid.className = "question-grid";

    for (let i = sec.min; i <= sec.max; i++) {
      const btn = document.createElement("button");

      btn.className = "grid-btn";

      const q = questions[i - 1];

      if (!q) continue;

      btn.id = `gbtn-${q.id}`;

      btn.textContent = i;

      btn.onclick = () => {
        currentIndex = i - 1;

        renderQuestion();
      };

      grid.appendChild(btn);
    }

    container.appendChild(grid);
  });
}

// ===== UPDATE GRID =====
function updateGrid() {
  questions.forEach((q, i) => {
    const btn = document.getElementById(`gbtn-${q.id}`);

    if (!btn) return;

    btn.className = "grid-btn";

    if (i === currentIndex) {
      btn.classList.add("active");
    }

    if (answers[i] !== null) {
      btn.classList.add("answered");
    }
  });
}

// ===== PROGRESS =====
function updateProgress() {
  const progressText = document.getElementById("progressText");

  if (!progressText) return;

  const answered = answers.filter((a) => a !== null).length;

  progressText.textContent = `${answered}/${questions.length} bajarildi`;
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = questions[currentIndex];

  if (!q) return;

  const questionNumber = document.getElementById("questionNumber");

  const questionText = document.getElementById("questionText");

  const optionsList = document.getElementById("optionsList");

  if (questionNumber) {
    questionNumber.textContent = `${q.id}-savol`;
  }

  if (questionText) {
    questionText.textContent = q.text;
  }

  if (optionsList) {
    optionsList.innerHTML = q.options
      .map(
        (opt, i) => `
      <div class="option-item ${answers[currentIndex] === i ? "selected" : ""}"
           onclick="selectAnswer(${i})">

        <div class="option-radio">
          <div class="option-radio-dot"></div>
        </div>

        <span>${opt}</span>

      </div>
    `,
      )
      .join("");
  }

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");

  if (prevBtn) {
    prevBtn.style.display = currentIndex === 0 ? "none" : "inline-flex";
  }

  if (nextBtn) {
    nextBtn.style.display =
      currentIndex === questions.length - 1 ? "none" : "inline-flex";
  }

  if (finishBtn) {
    finishBtn.style.display =
      currentIndex === questions.length - 1 ? "inline-block" : "none";
  }

  const card = document.getElementById("questionCard");

  if (card) {
    card.style.animation = "none";

    card.offsetHeight;

    card.style.animation = "fadeIn 0.25s ease";
  }

  updateGrid();

  updateProgress();
}

// ===== SELECT ANSWER =====
function selectAnswer(index) {
  if (isSelecting) return;

  isSelecting = true;

  answers[currentIndex] = index;

  document.querySelectorAll(".option-item").forEach((item, i) => {
    item.classList.toggle("selected", i === index);
  });

  updateGrid();

  updateProgress();

  if (currentIndex < questions.length - 1) {
    setTimeout(() => {
      nextQuestion();

      isSelecting = false;
    }, 400);
  } else {
    isSelecting = false;
  }
}

// ===== NAVIGATION =====
function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;

    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;

    renderQuestion();
  }
}

// ===== FINISH =====
function finishTest(autoFinish = false) {
  if (!autoFinish) {
    const confirmFinish = confirm("Testni yakunlamoqchimisiz?");

    if (!confirmFinish) return;
  }

  clearInterval(timerInterval);

  let correct = 0;

  questions.forEach((q, i) => {
    if (answers[i] === q.correct) {
      correct++;
    }
  });

  const total = questions.length;

  const percent = Math.round((correct / total) * 100);

  let color = "red";

  if (percent >= 70) {
    color = "green";
  } else if (percent >= 50) {
    color = "orange";
  }

  // ===== SAVE RESULT =====
  const results = JSON.parse(localStorage.getItem("testResults") || "[]");

  results.push({
    testName: activeTestName,
    correct,
    total,
    percent,
    date: new Date().toLocaleDateString("uz-UZ"),
  });

  localStorage.setItem("testResults", JSON.stringify(results));

  // ===== SHOW RESULT =====
  const resultStats = document.getElementById("resultStats");

  if (resultStats) {
    resultStats.innerHTML = `
      Jami savollar: <span>${total}</span><br>

      To'g'ri javoblar:
      <span>${correct}</span><br>

      Noto'g'ri javoblar:
      <span>${total - correct}</span><br>

      Natija:
      <span style="
        color:${color};
        font-weight:bold;
        font-size:22px;
      ">
        ${percent}%
      </span>
    `;
  }

  const resultModal = document.getElementById("resultModal");

  if (resultModal) {
    resultModal.style.display = "flex";
  }
}

// ===== RESTART =====
function restartTest() {
  clearInterval(timerInterval);

  currentIndex = 0;

  loadTest();

  answers = new Array(questions.length).fill(null);

  const resultModal = document.getElementById("resultModal");

  if (resultModal) {
    resultModal.style.display = "none";
  }

  buildGrids();

  renderQuestion();

  startTimer();
}

// ===== KEYBOARD SUPPORT =====
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    nextQuestion();
  }

  if (e.key === "ArrowLeft") {
    prevQuestion();
  }
});

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadTest();

  buildGrids();

  renderQuestion();

  startTimer();
});
