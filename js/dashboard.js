/**
 * dashboard.js – Gradify Web Dashboard Logic
 * Greeting, exam countdown, study time, continue-watching, recent notes
 */

import {
  fetchDates,
  getRunningWeek,
  getNextExam,
  getCountdownText,
  getGreeting,
} from "./api.js";
import {
  getAllTimeEntries,
  getAllNotes,
  formatDuration,
  todayDateStr,
  getStorage,
} from "./storage.js";

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  renderGreeting();
  await loadDashboardData();
  loadContinueWatching();
  loadRecentNotes();
  startExamTimers();
});

// ─── Greeting ─────────────────────────────────────────────────────────────────
function renderGreeting() {
  const greetEl = document.getElementById("greetText");
  const nameEl = document.getElementById("greetName");
  if (greetEl) greetEl.textContent = getGreeting();

  const saved = getStorage("mySubjects", []);
  const subBadge = document.getElementById("subjectBadge");
  if (subBadge) {
    const hasDiploma = saved.some((s) =>
      [
        "BDM",
        "DBMS",
        "Java",
        "MAD 1",
        "MAD 2",
        "MLF",
        "MLP",
        "MLT",
        "PDSA",
        "Business Analytics",
        "System Commands",
      ].includes(s),
    );
    subBadge.textContent = hasDiploma ? "Diploma" : "Foundation";
  }
}

// ─── Main data load ───────────────────────────────────────────────────────────
async function loadDashboardData() {
  try {
    const [dates, timeEntries] = await Promise.all([
      fetchDates(),
      getAllTimeEntries(),
    ]);

    // Today study time
    const today = todayDateStr();
    const todayMs = timeEntries
      .filter((e) => e.date === today)
      .reduce((sum, e) => sum + (e.durationMs || 0), 0);
    const todayFormatted = formatDuration(todayMs);

    const todayBadge = document.getElementById("todayStudyTime");
    const totalStudyToday = document.getElementById("totalStudyToday");
    if (todayBadge) todayBadge.textContent = todayFormatted;
    if (totalStudyToday) totalStudyToday.textContent = todayFormatted;

    // Next exam
    const next = getNextExam(dates);
    const examNameEl = document.getElementById("nextExamName");
    const examDaysEl = document.getElementById("nextExamDays");
    if (examNameEl) examNameEl.textContent = next ? next.name : "All Done!";
    if (examDaysEl)
      examDaysEl.textContent = next ? getCountdownText(next.date) : "Relax 🎉";

    // Current week
    const weekEl = document.getElementById("weekNum");
    if (weekEl && dates?.start_date) {
      const w = getRunningWeek(dates.start_date);
      weekEl.textContent = w < 1 ? "Soon" : w > 12 ? "12+" : `W${w}`;
    }

    // Update lectures subtitle with week
    const lecSub = document.getElementById("lecSub");
    if (lecSub && dates?.start_date) {
      const w = getRunningWeek(dates.start_date);
      lecSub.textContent =
        w < 1 ? "Starting soon" : `Week ${w > 12 ? "12+" : w}`;
    }

    // Sidebar countdown
    updateSidebarCountdown(dates);

    // PYQ subtitle: count sessions
    const pyqSub = document.getElementById("pyqSub");
    if (pyqSub) {
      const { getAllPYQSessions } = await import("./storage.js");
      const sessions = await getAllPYQSessions();
      pyqSub.textContent = sessions.length
        ? `${sessions.length} session${sessions.length > 1 ? "s" : ""} done`
        : "Start practising";
    }

    // Stats subtitle
    const statsSub = document.getElementById("statsSub");
    if (statsSub) {
      const totalMs = timeEntries.reduce(
        (sum, e) => sum + (e.durationMs || 0),
        0,
      );
      statsSub.textContent = totalMs
        ? formatDuration(totalMs) + " total"
        : "No data yet";
    }

    // Notes subtitle
    const notesSub = document.getElementById("notesSub");
    if (notesSub) {
      const notes = await getAllNotes();
      notesSub.textContent = notes.length
        ? `${notes.length} note${notes.length > 1 ? "s" : ""}`
        : "No notes yet";
    }
  } catch (e) {
    console.warn("Dashboard data error:", e);
  }
}

// ─── Sidebar countdown chip ──────────────────────────────────────────────────
function updateSidebarCountdown(dates) {
  if (!dates) return;
  const q1 = document.getElementById("q1Timer");
  const q2 = document.getElementById("q2Timer");
  const et = document.getElementById("etTimer");
  if (q1) q1.textContent = getCountdownText(dates.quiz_1);
  if (q2) q2.textContent = getCountdownText(dates.quiz_2);
  if (et) et.textContent = getCountdownText(dates.end_term);
}

// ─── Live exam timers (update every min) ────────────────────────────────────
let timerInterval = null;
function startExamTimers() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    try {
      const dates = await fetchDates();
      const next = getNextExam(dates);
      const examDaysEl = document.getElementById("nextExamDays");
      if (examDaysEl && next)
        examDaysEl.textContent = getCountdownText(next.date);
      updateSidebarCountdown(dates);
    } catch {}
  }, 60_000);
}

// ─── Continue Watching ───────────────────────────────────────────────────────
function loadContinueWatching() {
  const lastVideo = getStorage("lastVideo", null);
  const section = document.getElementById("continueSection");
  if (!lastVideo || !section) return;

  section.style.display = "block";
  const el = document.getElementById("continueCard");
  if (!el) return;

  const thumb = `https://img.youtube.com/vi/${lastVideo.videoId}/mqdefault.jpg`;
  document.getElementById("continueThumbnail").src = thumb;
  document.getElementById("continueTitle").textContent =
    lastVideo.title || "Continue watching";
  document.getElementById("continueSub").textContent =
    `${lastVideo.subject} · ${lastVideo.weekName || ""}`;

  const pct = lastVideo.totalDuration
    ? Math.round((lastVideo.position / lastVideo.totalDuration) * 100)
    : 0;
  document.getElementById("continueProgress").style.width = `${pct}%`;

  el.onclick = () =>
    navigate(
      `player.html?subject=${encodeURIComponent(lastVideo.subject)}&json=${encodeURIComponent(lastVideo.jsonUrl)}&vid=${lastVideo.videoId}&ts=${Math.floor(lastVideo.position)}`,
    );

  if (typeof gsap !== "undefined") {
    gsap.from(section, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      delay: 0.6,
      ease: "power2.out",
    });
  }
}

// ─── Recent Notes Preview ────────────────────────────────────────────────────
async function loadRecentNotes() {
  try {
    const notes = await getAllNotes();
    const section = document.getElementById("recentNotesSection");
    if (!notes.length || !section) return;

    section.style.display = "block";
    const list = document.getElementById("recentNotesList");
    const recent = notes.slice(0, 3);

    recent.forEach((note) => {
      const div = document.createElement("div");
      div.style.cssText =
        "background:var(--color-card-bg);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;border-left:3px solid " +
        (note.important ? "var(--color-hero-cards)" : "transparent");
      div.innerHTML = `
        <div style="font-size:11px;opacity:0.5;margin-bottom:4px">${note.subject || "General"} ${note.important ? "⭐" : ""}</div>
        <div style="font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${note.content}</div>
      `;
      div.onclick = () => navigate("notes.html");
      list.appendChild(div);
    });

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.from(section, {
        scrollTrigger: { trigger: section, start: "top 85%", once: true },
        y: 20,
        opacity: 0,
        duration: 0.5,
      });
    }
  } catch (e) {
    console.warn("Recent notes error:", e);
  }
}
