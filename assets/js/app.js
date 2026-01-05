/* ==========================================================
   UTILITIES
========================================================== */
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const escapeHtml = s =>
  String(s).replaceAll("&","&amp;")
           .replaceAll("<","&lt;")
           .replaceAll(">","&gt;");

const arraysEqualAsSets = (a,b) => {
  if (a.length !== b.length) return false;
  const A = [...a].sort(), B = [...b].sort();
  return A.every((v,i) => v === B[i]);
};

const formatTimeSeconds = sec => {
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return String(m).padStart(2,"0") + ":" +
         String(s).padStart(2,"0");
};

/* ==========================================================
   STATE
========================================================== */
const state = {
  questionOrder: [],
  qmap: {},
  currentIndex: 0,
  answers: {},
  startTime: null,
  timerIntervalId: null,
  finished: false
};

/* DOM refs */
const questionArea = document.getElementById("questionArea");
const qIndexEl = document.getElementById("qIndex");
const qTotalEl = document.getElementById("qTotal");
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const resultsEl = document.getElementById("results");
const timerEl = document.getElementById("timer");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const app = document.getElementById("app");

/* ==========================================================
   START BUTTON
========================================================== */
startBtn.onclick = () => {
  startScreen.style.display = "none";
  app.style.display = "block";
  init();
};

/* ==========================================================
   INITIALISE TEST
========================================================== */
function init() {
  const QUESTIONS = TEST_DATA.questions;

  state.questionOrder = shuffle(QUESTIONS.map(q => q.id));
  state.qmap = {};

  QUESTIONS.forEach(q => {
    const order = shuffle(q.choices.map((_,i) => i));
    const newChoices = order.map(i => q.choices[i]);
    const newAnswer = Array.isArray(q.answer)
      ? q.answer.map(a => order.indexOf(a))
      : order.indexOf(q.answer);

    state.qmap[q.id] = {
      ...q,
      requiredAnswers: q.requiredAnswers || 1,
      choices: newChoices,
      answer: newAnswer
    };
  });

  state.answers = {};
  state.currentIndex = 0;
  state.finished = false;

  state.startTime = Date.now();
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = setInterval(() => {
    if (!state.finished) {
      timerEl.textContent = formatTimeSeconds(
        Math.floor((Date.now() - state.startTime) / 1000)
      );
    }
  }, 500);

  qTotalEl.textContent = state.questionOrder.length;
  renderCurrent();
}

/* ==========================================================
   PROGRESS
========================================================== */
function countAnswered() {
  return state.questionOrder.reduce((count,id) => {
    const q = state.qmap[id];
    const answers = state.answers[id] || [];
    return count + (answers.length === q.requiredAnswers ? 1 : 0);
  }, 0);
}

function updateProgress() {
  const pct = Math.round(
    countAnswered() / state.questionOrder.length * 100
  );
  progressBar.style.width = pct + "%";
}

/* ==========================================================
   RENDER QUESTION
========================================================== */
function renderCurrent() {
  const qid = state.questionOrder[state.currentIndex];
  const q = state.qmap[qid];
  const chosen = new Set(state.answers[qid] || []);

  qIndexEl.textContent = state.currentIndex + 1;
  updateProgress();

  let html = `
    <div class="qnum">
      Question ${state.currentIndex+1} /
      ${state.questionOrder.length}
    </div>
    <div class="qtext">${escapeHtml(q.q)}</div>
  `;

  if (q.image) {
    html += `
      <div class="img-wrap">
        <img class="qimage"
             src="${TEST_DATA.basePath + q.image}"
             alt="${q.imageAlt || ""}">
      </div>
    `;
  }

  html += `<div class="choices">`;

  q.choices.forEach((choice,i) => {
    html += `
      <div class="choice ${chosen.has(i) ? "selected" : ""}"
           data-choice="${i}">
        <div class="marker">${String.fromCharCode(65+i)}</div>
        <div>${escapeHtml(choice)}</div>
      </div>
    `;
  });

  html += `</div>`;
  questionArea.innerHTML = html;

  document.querySelectorAll(".choice").forEach(el => {
    el.onclick = () =>
      handleSelect(qid, Number(el.dataset.choice));
  });

  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled =
    (state.answers[qid] || []).length !== q.requiredAnswers;

  nextBtn.textContent =
    state.currentIndex === state.questionOrder.length-1
      ? "Submit & Finish"
      : "Submit & Next →";
}

/* ==========================================================
   SELECT ANSWERS
========================================================== */
function handleSelect(qid, idx) {
  const q = state.qmap[qid];
  let selected = [...(state.answers[qid] || [])];

  if (q.requiredAnswers === 1) {
    selected = [idx];
  } else {
    selected = selected.includes(idx)
      ? selected.filter(i => i !== idx)
      : selected.length < q.requiredAnswers
        ? [...selected, idx]
        : selected;
  }

  state.answers[qid] = selected;
  renderCurrent();
}

/* ==========================================================
   NAVIGATION
========================================================== */
prevBtn.onclick = () => {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderCurrent();
  }
};

nextBtn.onclick = () => {
  if (state.currentIndex < state.questionOrder.length-1) {
    state.currentIndex++;
    renderCurrent();
  } else {
    finish();
  }
};

resetBtn.onclick = () => init();

/* ==========================================================
   FINISH TEST
========================================================== */
function finish() {
  state.finished = true;
  clearInterval(state.timerIntervalId);

  let correct = 0;
  const total = state.questionOrder.length;

  const results = state.questionOrder.map(id => {
    const q = state.qmap[id];
    const chosen = state.answers[id] || [];
    const correctAns = Array.isArray(q.answer) ? q.answer : [q.answer];
    const ok = arraysEqualAsSets(chosen, correctAns);
    if (ok) correct++;
    return { q, chosen, correctAns, ok };
  });

  let html = `
    <div class="card" style="padding:16px;margin-top:12px;">
      <div class="score">
        ${correct}/${total}
        — ${Math.round(correct/total*100)}%
      </div>
      <button id="retryBtn"
        class="ghost small"
        style="margin-top:10px">
        Retry Test
      </button>
    </div>
  `;

  results.forEach((r,i) => {
    html += `
      <div class="review-item">
        <strong>Q${i+1}.</strong> ${escapeHtml(r.q.q)}
        <span style="float:right;color:${
          r.ok ? "var(--correct)" : "var(--wrong)"
        }">
          ${r.ok ? "Correct" : "Incorrect"}
        </span>
        <pre class="expl">
${escapeHtml(r.q.explanation || "")}
        </pre>
      </div>
    `;
  });

  resultsEl.innerHTML = html;
  resultsEl.classList.add("visible");

  document.getElementById("retryBtn").onclick = () => init();
}

/* ==========================================================
   KEYBOARD SHORTCUTS
========================================================== */
document.onkeydown = e => {
  if (e.key >= "1" && e.key <= "9") {
    const idx = Number(e.key) - 1;
    const qid = state.questionOrder[state.currentIndex];
    const q = state.qmap[qid];
    if (idx < q.choices.length) handleSelect(qid, idx);
  }
  if (e.key === "Enter") nextBtn.click();
  if (e.key === "ArrowLeft") prevBtn.click();
  if (e.key === "ArrowRight") nextBtn.click();
};
