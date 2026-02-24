/**
 * pyq-quiz.js – PYQ quiz runner
 * Matches Android PYQQuestionActivity exactly:
 *  - Fetches JSON from Dropbox link (papers[] + questions[])
 *  - question_type: "mcq" (single or multi depending on correct count) and text input
 *  - Practice mode: "Check Answer" button with instant feedback + correct answer shown
 *  - Exam mode: countdown timer (from JSON total_time_minutes), no instant feedback
 *  - Prev / Next navigation, Next becomes "Submit" on last question
 *  - extra_info sections: shown inline, skipped in question count
 *  - Submit → results modal with score, percentage, feedback, per-question summary
 *  - Review mode: browse answered questions, correct answers highlighted green
 *  - Saves time entry via saveTimeEntry (aligned storage schema)
 *  - Saves PYQ session via savePYQSession
 */
import { savePYQSession, saveTimeEntry } from "./storage.js";
import { fetchQuizLink } from "./api.js";

// ─── URL params (mirrors Android Intent extras) ───────────────────────────────
const params = new URLSearchParams(location.search);
const subjectName = params.get("subject") || "PYQ";
const quizType = params.get("quiz") || "";
const quizYear = params.get("year") || "";
const quizSession = params.get("session") || "";
const examMode = params.get("exam") === "1";
// Legacy fallback: if ?link= is still passed (old bookmarks)
const legacyLink = params.get("link") || "";

// ─── State ────────────────────────────────────────────────────────────────────
let questions = []; // JSONArray from server (raw objects)
let paperInfo = null; // papers[0]
let currentIndex = 0;
let totalDisplayQ = 0;
let totalMarks = 0;
let userScore = 0;
let isReviewMode = false;
let countdownInterval = null;
let pyqStartMs = Date.now();

// Answer stores (mirrors Android Maps)
const userSingleAnswers = {}; // index → option index
const userMultiAnswers = {}; // index → [option indices]
const userTextAnswers = {}; // index → string
const questionScores = {}; // index → score earned
const questionSummaries = []; // {index, qNum, marks, score, isExtra}

// Extra-info maps
const questionToExtraInfo = {}; // question index → extra_info index

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setText("quizSubjectName", `${subjectName} – ${quizType}`);
  setText("modeLabel", examMode ? "🔒 Exam Mode" : "📖 Practice");

  if (!examMode) {
    show("checkAnswerBtn");
    hide("timerWrap");
  } else {
    hide("checkAnswerBtn");
    show("timerWrap");
  }

  try {
    // Resolve quiz URL at runtime (never exposed in URL bar)
    let fetchUrl;
    if (legacyLink) {
      // Backward compat: old ?link= param
      fetchUrl = legacyLink;
    } else if (subjectName && quizType && quizYear && quizSession) {
      // New flow: fetch + decrypt the link server-side
      fetchUrl = await fetchQuizLink(
        subjectName,
        quizType,
        quizYear,
        quizSession,
      );
    } else {
      throw new Error("Missing quiz parameters");
    }

    // Convert Dropbox share links to direct download links
    if (fetchUrl.includes("www.dropbox.com")) {
      fetchUrl = fetchUrl.replace(
        "www.dropbox.com",
        "dl.dropboxusercontent.com",
      );
      fetchUrl = fetchUrl.replace(/[?&]dl=[01]/, "");
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    // Support two formats: { papers:[], questions:[] } or { questions:[] }
    paperInfo = (raw.papers && raw.papers[0]) || null;
    questions = raw.questions || raw || [];

    if (!Array.isArray(questions) || !questions.length)
      throw new Error("No questions found");

    processExtraInfoMappings();
    calcDisplayCount();
    calcTotalMarks();

    // Timer from JSON (mirrors Android: total_time_minutes, clamp "4"→"60")
    if (examMode && paperInfo) {
      let mins = parseInt(paperInfo.total_time_minutes || "60");
      if (mins === 4) mins = 60;
      startCountdown(mins * 60);
    }

    pyqStartMs = Date.now();
    showQuestion(0);
  } catch (e) {
    setText("questionText", "⚠️ Failed to load: " + e.message);
  }
});

// ─── Extra info processing (mirrors processExtraInfoSections) ─────────────────
function isExtra(q) {
  return (q.question_text || "") === "extra_info";
}

function processExtraInfoMappings() {
  questions.forEach((q, i) => {
    if (!isExtra(q)) return;
    const forQ = (q.for_questions || "").split(",");
    forQ.forEach((numStr) => {
      const n = parseInt(numStr.trim());
      if (isNaN(n)) return;
      const qi = findQIndexByNumber(n);
      if (qi >= 0) questionToExtraInfo[qi] = i;
    });
  });
}

function findQIndexByNumber(num) {
  return questions.findIndex((q) => !isExtra(q) && q.question_number === num);
}

function calcDisplayCount() {
  let max = 0;
  questions.forEach((q) => {
    if (!isExtra(q) && q.question_number > max) max = q.question_number;
  });
  totalDisplayQ = max || questions.filter((q) => !isExtra(q)).length;
}

function calcTotalMarks() {
  totalMarks = 0;
  questions.forEach((q) => {
    if (!isExtra(q)) totalMarks += q.marks || 0;
  });
}

// ─── Show question (mirrors PYQQuestionActivity.showQuestion) ─────────────────
function showQuestion(index) {
  currentIndex = index;
  const q = questions[index];
  if (!q) return;

  if (isExtra(q)) {
    showExtraSection(q);
    return;
  }

  // Header
  const qNum = q.question_number || index + 1;
  setText("progressText", `Question ${qNum}/${totalDisplayQ}`);
  setText("questionMarks", `${q.marks || 0} Marks`);

  // Question text (supports HTML from Android Html.fromHtml)
  const qtEl = document.getElementById("questionText");
  if (qtEl)
    qtEl.innerHTML = q.question_text
      ? q.question_text.replace(/\n/g, "<br>")
      : "<em>(Image question)</em>";

  // Image
  const imgEl = document.getElementById("questionImage");
  if (imgEl) {
    if (q.question_image_url) {
      imgEl.src = q.question_image_url;
      imgEl.style.display = "block";
      imgEl.onclick = () => openLightbox(q.question_image_url);
    } else {
      imgEl.style.display = "none";
    }
  }

  // Determine type
  const options = q.options || [];
  const correctCount = options.filter((o) => o.is_correct).length;
  let qTypeLabel = "";

  hide("singleChoiceWrap");
  hide("multiChoiceWrap");
  hide("textInputWrap");
  hide("resultCard");

  if (q.question_type === "mcq" || options.length) {
    if (correctCount > 1) {
      qTypeLabel = "Multiple answers";
      buildMultiChoice(options);
    } else {
      qTypeLabel = "Single answer";
      buildSingleChoice(options);
    }
  } else {
    qTypeLabel = "Text / Numeric answer";
    buildTextInput(q);
  }
  setText("questionTypeLabel", qTypeLabel);

  // Restore previous answers
  restoreAnswers(q);

  // Review mode: show correct answers
  if (isReviewMode) showCorrectHighlights(index, q);

  // Extra info FAB
  const fab = document.getElementById("extraInfoFab");
  if (fab) {
    if (questionToExtraInfo[index] !== undefined) fab.style.display = "flex";
    else fab.style.display = "none";
  }

  updateNavButtons();
  updateProgressBar();

  // Show score chip if already checked
  const resultCard = document.getElementById("resultCard");
  if (questionScores[index] !== undefined && !isReviewMode) {
    // Already checked
    renderResultCard(index, q);
  }
}

// ─── Extra info section ───────────────────────────────────────────────────────
function showExtraSection(q) {
  hide("questionCardInner");
  show("extraInfoSection");
  hide("resultCard");
  hide("checkAnswerBtn");

  const el = document.getElementById("extraInfoText");
  if (el) el.innerHTML = (q.extra_text || "").replace(/\n/g, "<br>");
  const imgEl = document.getElementById("extraInfoImage");
  if (imgEl) {
    if (q.question_image_url) {
      imgEl.src = q.question_image_url;
      imgEl.style.display = "block";
    } else imgEl.style.display = "none";
  }
  setText("progressText", "ℹ️ Extra Info");
  updateNavButtons();
  updateProgressBar();
}

// ─── Single-choice ────────────────────────────────────────────────────────────
function buildSingleChoice(options) {
  show("questionCardInner");
  hide("extraInfoSection");
  const wrap = document.getElementById("singleChoiceWrap");
  wrap.innerHTML = "";
  show("singleChoiceWrap");

  options.forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "option-row";
    row.dataset.index = i;

    const radio = document.createElement("div");
    radio.className = "option-radio";

    const label = document.createElement("div");
    label.className = "option-label";
    label.innerHTML = opt.text || "";

    row.appendChild(radio);
    row.appendChild(label);

    if (opt.image_url) {
      const img = document.createElement("img");
      img.src = opt.image_url;
      img.className = "option-image";
      img.onclick = (e) => {
        e.stopPropagation();
        openLightbox(opt.image_url);
      };
      row.appendChild(img);
    }

    row.onclick = () => {
      if (isReviewMode || questionScores[currentIndex] !== undefined) return;
      document
        .querySelectorAll("#singleChoiceWrap .option-row")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      userSingleAnswers[currentIndex] = i;
    };

    wrap.appendChild(row);
  });
}

// ─── Multi-choice ─────────────────────────────────────────────────────────────
function buildMultiChoice(options) {
  show("questionCardInner");
  hide("extraInfoSection");
  const wrap = document.getElementById("multiChoiceWrap");
  wrap.innerHTML = "";
  show("multiChoiceWrap");

  options.forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "option-row";
    row.dataset.index = i;

    const cb = document.createElement("div");
    cb.className = "option-checkbox";

    const label = document.createElement("div");
    label.className = "option-label";
    label.innerHTML = opt.text || "";

    row.appendChild(cb);
    row.appendChild(label);

    if (opt.image_url) {
      const img = document.createElement("img");
      img.src = opt.image_url;
      img.className = "option-image";
      img.onclick = (e) => {
        e.stopPropagation();
        openLightbox(opt.image_url);
      };
      row.appendChild(img);
    }

    row.onclick = () => {
      if (isReviewMode || questionScores[currentIndex] !== undefined) return;
      const sel = userMultiAnswers[currentIndex] || [];
      if (row.classList.contains("selected")) {
        row.classList.remove("selected");
        cb.classList.remove("checked");
        userMultiAnswers[currentIndex] = sel.filter((x) => x !== i);
      } else {
        row.classList.add("selected");
        cb.classList.add("checked");
        userMultiAnswers[currentIndex] = [...sel, i];
      }
    };

    wrap.appendChild(row);
  });
}

// ─── Text input ───────────────────────────────────────────────────────────────
function buildTextInput(q) {
  show("questionCardInner");
  hide("extraInfoSection");
  show("textInputWrap");
  const inp = document.getElementById("textAnswer");
  if (inp) {
    inp.value = userTextAnswers[currentIndex] || "";
    inp.oninput = () => {
      userTextAnswers[currentIndex] = inp.value.trim();
    };
    if (isReviewMode || questionScores[currentIndex] !== undefined)
      inp.disabled = true;
    else inp.disabled = false;
  }

  if (isReviewMode && q.correct_answer_text) {
    setText("correctAnswerHint", "Correct: " + q.correct_answer_text);
    show("correctAnswerHint");
  } else {
    hide("correctAnswerHint");
  }
}

// ─── Restore previous answers ─────────────────────────────────────────────────
function restoreAnswers(q) {
  const options = q.options || [];
  const correctCount = options.filter((o) => o.is_correct).length;

  if (q.question_type === "mcq" || options.length) {
    if (correctCount > 1) {
      const sel = userMultiAnswers[currentIndex] || [];
      document
        .querySelectorAll("#multiChoiceWrap .option-row")
        .forEach((row) => {
          const i = parseInt(row.dataset.index);
          if (sel.includes(i)) {
            row.classList.add("selected");
            row.querySelector(".option-checkbox")?.classList.add("checked");
          }
        });
    } else {
      const sel = userSingleAnswers[currentIndex];
      if (sel !== undefined) {
        const row = document.querySelector(
          `#singleChoiceWrap .option-row[data-index="${sel}"]`,
        );
        if (row) row.classList.add("selected");
      }
    }
  }
}

// ─── Correct answer highlights (review mode) ──────────────────────────────────
function showCorrectHighlights(index, q) {
  const options = q.options || [];
  const correctCount = options.filter((o) => o.is_correct).length;
  const wrapId = correctCount > 1 ? "multiChoiceWrap" : "singleChoiceWrap";

  document.querySelectorAll(`#${wrapId} .option-row`).forEach((row) => {
    const i = parseInt(row.dataset.index);
    const opt = options[i];
    if (opt && opt.is_correct) row.classList.add("correct-highlight");
  });

  if (questionScores[index] !== undefined) renderResultCard(index, q);
}

// ─── Check Answer button (mirrors Android checkAnswer) ────────────────────────
function checkAnswer() {
  saveCurrentAnswers();
  const q = questions[currentIndex];
  if (!q || isExtra(q)) return;

  const { score, correctStr } = calcQuestionScore(currentIndex, q);
  questionScores[currentIndex] = score;

  renderResultCard(currentIndex, q, score, correctStr);

  // Highlight correct option
  showCorrectHighlights(currentIndex, q);

  // Disable inputs
  disableInputs();
}
window.checkAnswer = checkAnswer;

function renderResultCard(index, q, score, correctStr) {
  const s = score !== undefined ? score : questionScores[index] || 0;
  const marks = q.marks || 0;
  const isCorrect = s === marks;
  const isPartial = s > 0 && !isCorrect;

  show("resultCard");
  const title = document.getElementById("resultTitle");
  const ca = document.getElementById("resultCorrectAnswer");
  const exp = document.getElementById("resultExplanation");

  if (title) {
    title.textContent = isCorrect
      ? "✅ Correct!"
      : isPartial
        ? "⚡ Partially Correct"
        : "❌ Incorrect";
    title.className =
      "result-title " +
      (isCorrect ? "correct" : isPartial ? "partial" : "wrong");
  }
  if (ca) ca.innerHTML = correctStr || buildCorrectStr(q);
  if (exp) {
    exp.textContent = `You scored ${s} out of ${marks} marks for this question.`;
    exp.style.display = "block";
  }
}

function buildCorrectStr(q) {
  const options = q.options || [];
  if (q.question_type === "mcq" || options.length) {
    const corrects = options
      .filter((o) => o.is_correct)
      .map((o) => o.text)
      .join(", ");
    return options.filter((o) => o.is_correct).length > 1
      ? "Correct Answers: " + corrects
      : "Correct Answer: " + corrects;
  }
  return "Correct Answer: " + (q.correct_answer_text || "");
}

function disableInputs() {
  document
    .querySelectorAll(
      "#singleChoiceWrap .option-row, #multiChoiceWrap .option-row",
    )
    .forEach((r) => (r.style.pointerEvents = "none"));
  const inp = document.getElementById("textAnswer");
  if (inp) inp.disabled = true;
}

// ─── Scoring (mirrors Android calculateScore/checkAnswer) ─────────────────────
function calcQuestionScore(index, q) {
  const options = q.options || [];
  const marks = q.marks || 0;
  const correctOptions = options
    .map((o, i) => (o.is_correct ? i : -1))
    .filter((i) => i >= 0);

  let score = 0;
  let correctStr = "";

  if (q.question_type === "mcq" || options.length) {
    if (correctOptions.length > 1) {
      // Multi-choice: partial credit
      const selected = userMultiAnswers[index] || [];
      correctStr =
        "Correct Answers: " +
        correctOptions.map((i) => options[i].text).join(", ");
      if (selected.length) {
        const mpp = marks / correctOptions.length;
        const correctSel = selected.filter((i) =>
          correctOptions.includes(i),
        ).length;
        score = mpp * correctSel;
        if (selected.length > correctSel)
          score = Math.max(0, score - mpp * (selected.length - correctSel));
        if (
          selected.length === correctOptions.length &&
          correctOptions.every((i) => selected.includes(i))
        )
          score = marks;
      }
    } else if (correctOptions.length === 1) {
      // Single-choice
      const correct = correctOptions[0];
      correctStr = "Correct Answer: " + options[correct].text;
      if (userSingleAnswers[index] === correct) score = marks;
    }
  } else {
    // Text input (mirrors Android range + text match logic)
    const userAns = (userTextAnswers[index] || "").trim();
    const correctAns = (q.correct_answer_text || "").trim();
    correctStr = "Correct Answer: " + (correctAns || "[Empty]");

    // Range check
    if (q.range_start !== undefined && q.range_start !== null) {
      try {
        const uVal = parseFloat(userAns);
        const rStart = parseFloat(q.range_start);
        if (!isNaN(uVal)) {
          if (q.range_end) {
            if (uVal >= rStart && uVal <= parseFloat(q.range_end))
              score = marks;
          } else {
            if (Math.abs(uVal - rStart) < 0.00001) score = marks;
          }
        }
      } catch (_) {}
    }

    if (score === 0) {
      // Numeric or string match
      try {
        if (Math.abs(parseFloat(userAns) - parseFloat(correctAns)) < 0.00001)
          score = marks;
      } catch (_) {
        if (userAns.toLowerCase() === correctAns.toLowerCase()) score = marks;
      }
    }
  }

  return { score, correctStr };
}

// ─── Save / restore answers ───────────────────────────────────────────────────
function saveCurrentAnswers() {
  const q = questions[currentIndex];
  if (!q || isExtra(q)) return;
  if (q.question_type !== "mcq" && !(q.options && q.options.length)) {
    const inp = document.getElementById("textAnswer");
    if (inp) userTextAnswers[currentIndex] = inp.value.trim();
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function updateNavButtons() {
  // Find first and last actual question indices
  let firstIdx = -1,
    lastIdx = -1,
    smallestNum = Infinity,
    largestNum = -Infinity;
  questions.forEach((q, i) => {
    if (isExtra(q)) return;
    const n = q.question_number || i;
    if (n < smallestNum) {
      smallestNum = n;
      firstIdx = i;
    }
    if (n > largestNum) {
      largestNum = n;
      lastIdx = i;
    }
  });

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn)
    prevBtn.style.display = currentIndex === firstIdx ? "none" : "flex";
  if (nextBtn) {
    if (currentIndex === lastIdx && !isReviewMode)
      nextBtn.textContent = "Submit";
    else nextBtn.textContent = "Next";
  }
}

function updateProgressBar() {
  const q = questions[currentIndex];
  const qNum = !isExtra(q)
    ? q.question_number || currentIndex + 1
    : currentIndex + 1;
  const pct = (qNum / Math.max(totalDisplayQ, 1)) * 100;
  const fill = document.getElementById("quizProgressFill");
  if (fill) fill.style.width = pct + "%";
  const cur = document.getElementById("currentQ");
  const tot = document.getElementById("totalQ");
  if (cur) cur.textContent = isExtra(q) ? "–" : qNum;
  if (tot) tot.textContent = totalDisplayQ;
}

window.nextQuestion = function () {
  saveCurrentAnswers();
  // Check if last actual question
  let lastIdx = -1,
    largestNum = -Infinity;
  questions.forEach((q, i) => {
    if (!isExtra(q)) {
      const n = q.question_number || i;
      if (n > largestNum) {
        largestNum = n;
        lastIdx = i;
      }
    }
  });
  if (currentIndex === lastIdx && !isReviewMode) {
    confirmSubmit();
    return;
  }
  if (currentIndex < questions.length - 1) showQuestion(currentIndex + 1);
};

window.prevQuestion = function () {
  saveCurrentAnswers();
  if (currentIndex > 0) showQuestion(currentIndex - 1);
};

window.confirmQuit = function () {
  if (confirm("Abort this quiz? Your progress will be lost.")) {
    if (countdownInterval) clearInterval(countdownInterval);
    history.back();
  }
};

// ─── Submit flow (mirrors confirmSubmitQuiz → submitQuiz) ─────────────────────
function confirmSubmit() {
  saveCurrentAnswers();
  const modal = document.getElementById("confirmSubmitModal");
  if (modal) modal.classList.add("visible");
}
window.confirmSubmit = confirmSubmit;

window.doSubmit = function () {
  document.getElementById("confirmSubmitModal")?.classList.remove("visible");
  submitQuiz();
};

window.cancelSubmit = function () {
  document.getElementById("confirmSubmitModal")?.classList.remove("visible");
};

function submitQuiz() {
  if (countdownInterval) clearInterval(countdownInterval);
  saveCurrentAnswers();
  calculateAllScores();
  showResults();
  saveSession();
}

function calculateAllScores() {
  userScore = 0;
  questionSummaries.length = 0;
  questions.forEach((q, i) => {
    if (isExtra(q)) {
      questionSummaries.push({ i, isExtra: true });
      return;
    }
    const { score } = calcQuestionScore(i, q);
    questionScores[i] = score;
    userScore += score;
    questionSummaries.push({
      i,
      qNum: q.question_number || i + 1,
      marks: q.marks || 0,
      score,
    });
  });
}

function showResults() {
  const pct = totalMarks > 0 ? (userScore / totalMarks) * 100 : 0;
  setText("rScore", userScore.toFixed(1));
  setText("rTotal", "/" + totalMarks.toFixed(1));
  setText("rPercent", pct.toFixed(1) + "%");
  setText("rFeedback", getFeedback(pct));

  // Question summary list
  const list = document.getElementById("questionSummaryList");
  if (list) {
    list.innerHTML = "";
    questionSummaries.forEach((s) => {
      if (s.isExtra) return;
      const row = document.createElement("div");
      const isCorrect = s.score >= s.marks;
      const isPartial = s.score > 0 && !isCorrect;
      row.className =
        "summary-row " +
        (isCorrect ? "correct" : isPartial ? "partial" : "wrong");
      row.innerHTML = `<span class="summary-qnum">Q${s.qNum}</span><span>${s.score}/${s.marks}</span>`;
      row.onclick = () => {
        isReviewMode = true;
        document.getElementById("resultsModal")?.classList.remove("visible");
        showQuestion(s.i);
      };
      list.appendChild(row);
    });
  }

  document.getElementById("resultsModal")?.classList.add("visible");
}

function getFeedback(pct) {
  if (pct >= 90) return "🏆 Outstanding!";
  if (pct >= 80) return "🌟 Excellent!";
  if (pct >= 70) return "✅ Good Job!";
  if (pct >= 60) return "📖 Above Average";
  if (pct >= 50) return "💪 Keep Going!";
  if (pct >= 40) return "📚 Keep Practising";
  return "🔁 Needs More Work";
}

window.reviewAnswers = function () {
  isReviewMode = true;
  document.getElementById("resultsModal")?.classList.remove("visible");
  hide("checkAnswerBtn");
  showQuestion(0);
};

window.closeToPYQ = function () {
  document.getElementById("resultsModal")?.classList.remove("visible");
  history.back();
};

// ─── Save session ─────────────────────────────────────────────────────────────
async function saveSession() {
  const elapsedMs = Date.now() - pyqStartMs;
  const correct = questionSummaries.filter(
    (s) => !s.isExtra && s.score >= s.marks,
  ).length;
  const wrong = questionSummaries.filter(
    (s) => !s.isExtra && s.score === 0,
  ).length;
  const pct = totalMarks > 0 ? Math.round((userScore / totalMarks) * 100) : 0;

  await Promise.all([
    savePYQSession({
      subject: subjectName,
      quizType,
      correct,
      wrong,
      skipped: 0,
      total: questionSummaries.filter((s) => !s.isExtra).length,
      pct,
      quit: false,
    }).catch(() => {}),
    saveTimeEntry(subjectName, "pyq", elapsedMs, Date.now()).catch(() => {}),
  ]);
}

// ─── Countdown (exam mode) ────────────────────────────────────────────────────
function startCountdown(totalSec) {
  let remaining = totalSec;
  const el = document.getElementById("timerText");
  countdownInterval = setInterval(() => {
    remaining--;
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    if (el) {
      el.textContent = `${m}:${s}`;
      el.className =
        remaining < 60
          ? "timer-danger"
          : remaining < 300
            ? "timer-warning"
            : "";
    }
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      submitQuiz();
    }
  }, 1000);
}

// ─── Extra info dialog FAB ────────────────────────────────────────────────────
window.showExtraInfoDialog = function () {
  const extraIdx = questionToExtraInfo[currentIndex];
  if (extraIdx === undefined) return;
  const q = questions[extraIdx];
  if (!q) return;

  const modal = document.getElementById("extraInfoModal");
  if (!modal) return;
  document.getElementById("extraInfoModalText").innerHTML = (
    q.extra_text || ""
  ).replace(/\n/g, "<br>");
  const img = document.getElementById("extraInfoModalImage");
  if (img) {
    if (q.question_image_url) {
      img.src = q.question_image_url;
      img.style.display = "block";
    } else img.style.display = "none";
  }
  modal.classList.add("visible");
};
window.closeExtraInfoDialog = function () {
  document.getElementById("extraInfoModal")?.classList.remove("visible");
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if (lb && img) {
    img.src = src;
    lb.classList.add("visible");
  }
}
window.closeLightbox = function () {
  document.getElementById("lightbox")?.classList.remove("visible");
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "";
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
