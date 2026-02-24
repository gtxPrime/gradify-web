/**
 * pyq.js – PYQ subject/quiz/year/session selector
 */
import { fetchQuizYears, fetchQuizSessions, fetchQuizLink } from "./api.js";
import { getStorage } from "./storage.js";
import { requireAuth } from "./auth.js";

let selectedSubject = "",
  selectedQuiz = "",
  selectedYear = "",
  selectedSession = "";
let quizLinkCache = null;
let step = 1;

const QUIZ_TYPES = ["Quiz 1", "Quiz 2", "End Term"];

// Degree-level subjects do NOT have PYQ data yet
const DEGREE_SUBJECTS = [
  "Software Testing",
  "Software Engineering",
  "SPG",
  "Deep Learning",
  "A.I.",
  "Introduction to Big Data",
  "Programming in C",
  "Deep Learning for CV",
  "Managerial Economics",
  "ATB",
  "LLM",
  "Speech Technology",
  "DT for App Development",
  "Market Research",
  "Statistical Computing",
  "Advanced Algorithms",
  "Game Theory and Strategy",
  "Computer System Design",
  "Deep Learning Practice",
  "Generative AI",
  "ADS",
  "MLOPS",
];

window.addEventListener("DOMContentLoaded", async () => {
  await requireAuth(); // 🔒 Redirect to login if not signed in
  await initSubjects();
  wireSelects();
  updateStep(1);
});

async function initSubjects() {
  // Read saved subjects — handle both old double-encoded string and new array format
  let mySubjects = [];
  try {
    const raw = getStorage("selectedSubjects", null);
    if (raw) {
      if (Array.isArray(raw)) {
        mySubjects = raw;
      } else if (typeof raw === "string") {
        mySubjects = JSON.parse(raw);
      }
    }
  } catch (_) {}

  const select = document.getElementById("subjectSelect");
  if (!select) return;

  select.innerHTML = '<option value="">– Select subject –</option>';

  const empty = document.getElementById("emptyPyqView");
  const form = document.getElementById("pyqFormView");

  if (!mySubjects.length) {
    if (empty) empty.style.display = "block";
    if (form) form.style.display = "none";
    return;
  }
  if (empty) empty.style.display = "none";
  if (form) form.style.display = "block";

  // Only offer subjects that actually have PYQ data (Foundation & Diploma)
  const available = mySubjects.filter((s) => !DEGREE_SUBJECTS.includes(s));

  if (!available.length) {
    showComingSoonBanner(
      "subjectComingSoon",
      "PYQ data for Degree-level subjects is coming soon! Foundation & Diploma PYQs are available now.",
    );
    if (form) form.style.display = "none";
    return;
  }

  available.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

function wireSelects() {
  // ── Subject change ──
  document.getElementById("subjectSelect")?.addEventListener("change", (e) => {
    selectedSubject = e.target.value;
    if (!selectedSubject) return;
    resetFrom("quiz");
    hideComingSoonBanner("quizComingSoon");
    updateStep(2);
    animateIn(document.getElementById("quizContainer"));

    const quizSel = document.getElementById("quizSelect");
    quizSel.innerHTML = '<option value="">– Select quiz type –</option>';
    QUIZ_TYPES.forEach((q) => {
      const o = document.createElement("option");
      o.value = q;
      o.textContent = q;
      quizSel.appendChild(o);
    });
  });

  // ── Quiz type change ──
  document
    .getElementById("quizSelect")
    ?.addEventListener("change", async (e) => {
      selectedQuiz = e.target.value;
      if (!selectedQuiz) return;
      resetFrom("year");
      hideComingSoonBanner("quizComingSoon");
      showLoader("yearLoader");

      try {
        const years = await fetchQuizYears(selectedSubject, selectedQuiz);
        const yearSel = document.getElementById("yearSelect");
        yearSel.innerHTML = '<option value="">– Select year –</option>';

        if (!years.length) {
          showComingSoonBanner(
            "quizComingSoon",
            `No ${selectedQuiz} PYQs for ${selectedSubject} yet — will be updated soon!`,
          );
          hideLoader("yearLoader");
          return;
        }

        years.forEach((y) => {
          const o = document.createElement("option");
          o.value = y;
          o.textContent = y;
          yearSel.appendChild(o);
        });
        animateIn(document.getElementById("yearContainer"));
        updateStep(3);
      } catch (_err) {
        // Subject not in quiz index at all
        showComingSoonBanner(
          "quizComingSoon",
          `${selectedSubject} / ${selectedQuiz} PYQs are not available yet — coming soon!`,
        );
      } finally {
        hideLoader("yearLoader");
      }
    });

  // ── Year change ──
  document
    .getElementById("yearSelect")
    ?.addEventListener("change", async (e) => {
      selectedYear = e.target.value;
      if (!selectedYear) return;
      resetFrom("session");
      showLoader("sessionLoader");

      try {
        const sessions = await fetchQuizSessions(
          selectedSubject,
          selectedQuiz,
          selectedYear,
        );
        const sesSel = document.getElementById("sessionSelect");
        sesSel.innerHTML = '<option value="">– Select session –</option>';

        if (!sessions.length) {
          showComingSoonBanner(
            "quizComingSoon",
            `No sessions found for ${selectedYear} yet — coming soon!`,
          );
          hideLoader("sessionLoader");
          return;
        }

        sessions.forEach((s) => {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          sesSel.appendChild(o);
        });
        animateIn(document.getElementById("sessionContainer"));
        updateStep(4);
      } catch (_err) {
        showComingSoonBanner(
          "quizComingSoon",
          `Session data not available yet — coming soon!`,
        );
      } finally {
        hideLoader("sessionLoader");
      }
    });

  // ── Session change ──
  document
    .getElementById("sessionSelect")
    ?.addEventListener("change", async (e) => {
      selectedSession = e.target.value;
      if (!selectedSession) return;
      showLoader("sessionLoader");

      try {
        // Just validate the link exists — don't expose it in URL
        quizLinkCache = await fetchQuizLink(
          selectedSubject,
          selectedQuiz,
          selectedYear,
          selectedSession,
        );
        animateIn(document.getElementById("modeContainer"));
        const startBtn = document.getElementById("startQuizBtn");
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.style.display = "flex";
          animateIn(startBtn);
        }
      } catch (err) {
        showComingSoonBanner(
          "quizComingSoon",
          "Quiz link not available yet — coming soon!",
        );
        quizLinkCache = null;
      } finally {
        hideLoader("sessionLoader");
      }
    });

  document.getElementById("startQuizBtn")?.addEventListener("click", () => {
    if (!quizLinkCache) return;
    const examMode = document.getElementById("examModeToggle")?.checked
      ? "1"
      : "0";
    // Pass subject/quiz/year/session — NOT the raw link (keeps Dropbox URL hidden)
    navigate(
      `pyq-quiz.html?subject=${encodeURIComponent(selectedSubject)}&quiz=${encodeURIComponent(selectedQuiz)}&year=${encodeURIComponent(selectedYear)}&session=${encodeURIComponent(selectedSession)}&exam=${examMode}`,
    );
  });
}

// ─── Reset cascading selects ──────────────────────────────────────────────────
function resetFrom(level) {
  const order = ["quiz", "year", "session"];
  const idx = order.indexOf(level);
  if (idx <= 0) setHidden("quizContainer");
  if (idx <= 1) setHidden("yearContainer");
  if (idx <= 2) {
    setHidden("sessionContainer");
    setHidden("modeContainer");
    const sb = document.getElementById("startQuizBtn");
    if (sb) sb.style.display = "none";
  }
  quizLinkCache = null;
}

function setHidden(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "none";
    el.classList.remove("visible");
  }
}

function updateStep(n) {
  step = n;
  document.querySelectorAll(".step-dot").forEach((d, i) => {
    if (i + 1 < n) d.className = "step-dot done";
    else if (i + 1 === n) d.className = "step-dot active";
    else d.className = "step-dot";
  });
}

function animateIn(el) {
  if (!el) return;
  el.style.display = "block";
  el.classList.add("visible");
  if (typeof gsap !== "undefined")
    gsap.from(el, { y: 10, opacity: 0, duration: 0.3, ease: "power2.out" });
}

// ─── Coming Soon banner ───────────────────────────────────────────────────────
function showComingSoonBanner(id, message) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:10px",
      "background:var(--color-hero-cards,#DDE89D)",
      "color:var(--color-text-icons,#22333B)",
      "border-radius:14px",
      "padding:14px 16px",
      "font-size:13px",
      "font-weight:600",
      "margin-top:14px",
      "opacity:0",
      "transition:opacity 0.3s",
    ].join(";");
    // Insert right after the quiz type dropdown container
    const quizContainer = document.getElementById("quizContainer");
    if (quizContainer) quizContainer.after(el);
    else document.getElementById("pyqFormView")?.appendChild(el);
  }
  el.innerHTML = `
    <span style="font-size:20px">🔒</span>
    <span style="flex:1">${message}</span>
    <span style="font-size:11px;opacity:0.6;white-space:nowrap;padding-left:8px">Coming Soon</span>
  `;
  el.style.display = "flex";
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });
}

function hideComingSoonBanner(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
    }, 300);
  }
}

// ─── Loader helpers ───────────────────────────────────────────────────────────
function showLoader(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "flex";
}
function hideLoader(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
