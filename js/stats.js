/**
 * stats.js – Study Stats page
 * Matches Android Stats.java:
 *   - Daily / Weekly / Monthly toggle with prev / next navigation
 *   - Donut pie chart per-subject (Chart.js doughnut, hole shows total studied)
 *   - Per-subject breakdown: lecture% vs pyq% progress bars
 *   - Clicking a subject highlights its slice (like onItemClick in SubjectStatsAdapter)
 * Uses new storage.js field names: subject_name, activity_type, date (epoch ms), duration_millis
 */
import {
  getAllTimeEntries,
  getAllPYQSessions,
  formatDuration,
} from "./storage.js";

// ─── Palette (mirrors Android default_pie_chart_colors) ──────────────────────
const PIE_COLORS = [
  "#DDE89D",
  "#A8C66C",
  "#739E4D",
  "#22333B",
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
  "#E9C46A",
  "#264653",
  "#457B9D",
  "#A8DADC",
  "#F1FAEE",
];

// ─── State (mirrors Android ViewMode enum + currentSelectedDate) ──────────────
let allEntries = [];
let allPYQ = [];
let studyChart = null; // bar chart
let pieChart = null; // donut
let viewMode = "DAILY"; // DAILY | WEEKLY | MONTHLY
let currentDate = new Date(); // mirrors currentSelectedDate
let selectedSubject = null; // mirrors currentlySelectedSubjectName

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  [allEntries, allPYQ] = await Promise.all([
    getAllTimeEntries(),
    getAllPYQSessions(),
  ]);
  renderHeroStats();
  renderHeatmap();
  renderBarChart("week");
  setupBarPeriodTabs();
  setupViewModeButtons();
  setupNavButtons();
  loadCurrentView();
  renderPYQStats();
});

// ─── View mode buttons (Daily / Weekly / Monthly) ─────────────────────────────
function setupViewModeButtons() {
  document.getElementById("btnDaily")?.addEventListener("click", () => {
    viewMode = "DAILY";
    currentDate = new Date();
    loadCurrentView();
  });
  document.getElementById("btnWeekly")?.addEventListener("click", () => {
    viewMode = "WEEKLY";
    currentDate = new Date();
    loadCurrentView();
  });
  document.getElementById("btnMonthly")?.addEventListener("click", () => {
    viewMode = "MONTHLY";
    currentDate = new Date();
    loadCurrentView();
  });
}

function setupNavButtons() {
  document.getElementById("btnPrev")?.addEventListener("click", () => {
    if (viewMode === "DAILY") currentDate.setDate(currentDate.getDate() - 1);
    else if (viewMode === "WEEKLY")
      currentDate.setDate(currentDate.getDate() - 7);
    else currentDate.setMonth(currentDate.getMonth() - 1);
    loadCurrentView();
  });
  document.getElementById("btnNext")?.addEventListener("click", () => {
    if (viewMode === "DAILY") currentDate.setDate(currentDate.getDate() + 1);
    else if (viewMode === "WEEKLY")
      currentDate.setDate(currentDate.getDate() + 7);
    else currentDate.setMonth(currentDate.getMonth() + 1);
    loadCurrentView();
  });
}

// ─── Main data loader (mirrors processAndDisplayStats) ────────────────────────
function loadCurrentView() {
  selectedSubject = null;
  updateViewModeUI();
  updateDateLabel();

  const { startMs, endMs } = getRange();
  const filtered = allEntries.filter(
    (e) => e.date >= startMs && e.date <= endMs,
  );

  // Aggregate per-subject (like getDailySubjectTotals + getAggregatedSubjectStats)
  const subjectMap = {};
  filtered.forEach((e) => {
    const s = e.subject_name || "Unknown";
    if (!subjectMap[s])
      subjectMap[s] = { subject_name: s, lectureMs: 0, pyqMs: 0 };
    if (e.activity_type === "lecture")
      subjectMap[s].lectureMs += e.duration_millis || 0;
    else if (e.activity_type === "pyq")
      subjectMap[s].pyqMs += e.duration_millis || 0;
  });

  const subjects = Object.values(subjectMap);
  renderDonut(subjects);
  renderSubjectList(subjects);
}

// ─── Date range helpers ───────────────────────────────────────────────────────
function getRange() {
  const d = new Date(currentDate);
  let startMs, endMs;

  if (viewMode === "DAILY") {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    startMs = start.getTime();
    endMs = end.getTime();
  } else if (viewMode === "WEEKLY") {
    // Start of week (Sunday)
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    startMs = start.getTime();
    endMs = end.getTime();
  } else {
    // Monthly
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    startMs = start.getTime();
    endMs = end.getTime();
  }
  return { startMs, endMs };
}

function updateDateLabel() {
  const el = document.getElementById("statsDateLabel");
  if (!el) return;
  if (viewMode === "DAILY") {
    el.textContent = currentDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } else if (viewMode === "WEEKLY") {
    const weekNum = getWeekNumber(currentDate);
    el.textContent = `Week ${weekNum}`;
  } else {
    el.textContent = currentDate.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }
}

function updateViewModeUI() {
  ["btnDaily", "btnWeekly", "btnMonthly"].forEach((id) => {
    document.getElementById(id)?.classList.remove("active");
  });
  const map = { DAILY: "btnDaily", WEEKLY: "btnWeekly", MONTHLY: "btnMonthly" };
  document.getElementById(map[viewMode])?.classList.add("active");
}

function getWeekNumber(d) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
}

// ─── Donut pie chart (mirrors Android PieChart setup) ─────────────────────────
function renderDonut(subjects) {
  const canvas = document.getElementById("donutChart");
  if (!canvas) return;

  const totalMs = subjects.reduce((s, x) => s + x.lectureMs + x.pyqMs, 0);
  const centerEl = document.getElementById("donutCenter");
  const emptyEl = document.getElementById("donutEmpty");

  if (!subjects.length || totalMs === 0) {
    canvas.style.display = "none";
    if (centerEl) centerEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    return;
  }

  canvas.style.display = "block";
  if (emptyEl) emptyEl.style.display = "none";
  if (centerEl) {
    centerEl.style.display = "flex";
    document.getElementById("donutCenterTitle").textContent = "Studied";
    document.getElementById("donutCenterValue").textContent = formatMinutes(
      totalMs / 60000,
    );
  }

  const labels = subjects.map((s) => s.subject_name);
  const data = subjects.map((s) => Math.round((s.lectureMs + s.pyqMs) / 60000));
  const colors = subjects.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 12 },
      ],
    },
    options: {
      cutout: "82%",
      animation: { duration: 900, easing: "easeInOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}m` },
          backgroundColor: "#22333B",
          titleColor: "#DDE89D",
          bodyColor: "#FAF6E9",
        },
      },
      onClick: (evt, elements) => {
        if (!elements.length) {
          // Clicked background — deselect
          selectedSubject = null;
          updateDonutCenter(subjects, null, totalMs);
          document
            .querySelectorAll(".subj-stat-row")
            .forEach((r) => r.classList.remove("selected"));
          return;
        }
        const idx = elements[0].index;
        const sub = subjects[idx];
        if (selectedSubject === sub.subject_name) {
          selectedSubject = null;
          updateDonutCenter(subjects, null, totalMs);
          document
            .querySelectorAll(".subj-stat-row")
            .forEach((r) => r.classList.remove("selected"));
        } else {
          selectedSubject = sub.subject_name;
          updateDonutCenter(subjects, sub, totalMs);
          document.querySelectorAll(".subj-stat-row").forEach((r) => {
            r.classList.toggle(
              "selected",
              r.dataset.subject === sub.subject_name,
            );
          });
        }
      },
    },
  });

  // assign colors for list sync
  subjects.forEach((s, i) => {
    s._color = colors[i];
  });
}

function updateDonutCenter(subjects, sub, totalMs) {
  const titleEl = document.getElementById("donutCenterTitle");
  const valEl = document.getElementById("donutCenterValue");
  if (!titleEl || !valEl) return;
  if (sub) {
    const ms = sub.lectureMs + sub.pyqMs;
    valEl.textContent = formatMinutes(ms / 60000);
    titleEl.textContent = sub.subject_name;
  } else {
    valEl.textContent = formatMinutes(totalMs / 60000);
    titleEl.textContent = "Studied";
  }
}

// ─── Subject list (mirrors SubjectStatsAdapter) ───────────────────────────────
function renderSubjectList(subjects) {
  const container = document.getElementById("subjectStatsList");
  if (!container) return;
  container.innerHTML = "";

  if (!subjects.length) {
    container.innerHTML =
      '<div style="opacity:0.4;font-size:13px;text-align:center;padding:16px">No study data for this period.</div>';
    return;
  }

  subjects.forEach((s, i) => {
    const totalMs = s.lectureMs + s.pyqMs;
    const lecturePct = totalMs ? Math.round((s.lectureMs / totalMs) * 100) : 0;
    const pyqPct = totalMs ? Math.round((s.pyqMs / totalMs) * 100) : 0;
    const color = s._color || PIE_COLORS[i % PIE_COLORS.length];

    const row = document.createElement("div");
    row.className = "subj-stat-row";
    row.dataset.subject = s.subject_name;
    row.innerHTML = `
      <div class="subj-stat-header">
        <div class="subj-color-dot" style="background:${color}"></div>
        <span class="subj-name">${s.subject_name}</span>
        <span class="subj-total-time">${formatMinutes(totalMs / 60000)}</span>
      </div>
      <div class="subj-bar-row">
        <span class="subj-bar-label">Lecture</span>
        <div class="subj-bar-track">
          <div class="subj-bar-fill" style="width:0%;background:${color}" data-pct="${lecturePct}"></div>
        </div>
        <span class="subj-bar-pct">${lecturePct}%</span>
      </div>
      <div class="subj-bar-row">
        <span class="subj-bar-label">PYQ</span>
        <div class="subj-bar-track">
          <div class="subj-bar-fill" style="width:0%;background:#739E4D" data-pct="${pyqPct}"></div>
        </div>
        <span class="subj-bar-pct">${pyqPct}%</span>
      </div>
      <div class="subj-times-row">
        <span>📖 ${formatDuration(s.lectureMs)}</span>
        <span>📝 ${formatDuration(s.pyqMs)}</span>
      </div>
    `;

    // Click → highlight pie slice (mirrors onItemClick)
    row.addEventListener("click", () => {
      if (selectedSubject === s.subject_name) {
        selectedSubject = null;
        pieChart?.setDatasetVisibility(0, true);
        pieChart?.update();
        document
          .querySelectorAll(".subj-stat-row")
          .forEach((r) => r.classList.remove("selected"));
        const totalMs2 = subjects.reduce(
          (a, x) => a + x.lectureMs + x.pyqMs,
          0,
        );
        updateDonutCenter(subjects, null, totalMs2);
      } else {
        selectedSubject = s.subject_name;
        container
          .querySelectorAll(".subj-stat-row")
          .forEach((r) =>
            r.classList.toggle(
              "selected",
              r.dataset.subject === s.subject_name,
            ),
          );
        if (pieChart) {
          // highlight by triggering tooltip / active element
          const meta = pieChart.getDatasetMeta(0);
          pieChart.setActiveElements([{ datasetIndex: 0, index: i }]);
          pieChart.update();
        }
        updateDonutCenter(subjects, s, totalMs);
      }
    });

    container.appendChild(row);
  });

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll(".subj-bar-fill").forEach((fill) => {
      const pct = fill.dataset.pct;
      if (typeof gsap !== "undefined")
        gsap.to(fill, { width: `${pct}%`, duration: 0.7, ease: "power2.out" });
      else fill.style.width = `${pct}%`;
    });
  }, 200);
}

// ─── Hero summary numbers ─────────────────────────────────────────────────────
function renderHeroStats() {
  const now = Date.now();
  const todayStart = startOfDay(new Date()).getTime();
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return startOfDay(d).getTime();
  })();
  const monthStart = (() => {
    const d = new Date();
    d.setDate(1);
    return startOfDay(d).getTime();
  })();

  const todayMs = allEntries
    .filter((e) => e.date >= todayStart && e.date <= now)
    .reduce((s, e) => s + (e.duration_millis || 0), 0);
  const weekMs = allEntries
    .filter((e) => e.date >= weekStart && e.date <= now)
    .reduce((s, e) => s + (e.duration_millis || 0), 0);
  const monthMs = allEntries
    .filter((e) => e.date >= monthStart && e.date <= now)
    .reduce((s, e) => s + (e.duration_millis || 0), 0);
  const allMs = allEntries.reduce((s, e) => s + (e.duration_millis || 0), 0);

  setText("todayTotal", formatDuration(todayMs));
  setText("weekTotal", formatDuration(weekMs));
  setText("monthTotal", formatDuration(monthMs));
  setText("allTimeTotal", formatDuration(allMs));
}

// ─── PYQ Performance ──────────────────────────────────────────────────────────
function renderPYQStats() {
  const correct = allPYQ.reduce((s, x) => s + (x.correct || 0), 0);
  const wrong = allPYQ.reduce((s, x) => s + (x.wrong || 0), 0);
  const total = correct + wrong;
  const acc = total ? Math.round((correct / total) * 100) : 0;

  setText("pyqCorrect", correct || "–");
  setText("pyqWrong", wrong || "–");
  setText("pyqAccuracy", total ? `${acc}%` : "–%");
  setText(
    "pyqSessions",
    `${allPYQ.length} session${allPYQ.length !== 1 ? "s" : ""}`,
  );

  const fill = document.getElementById("pyqAccFill");
  if (fill) {
    if (typeof gsap !== "undefined")
      gsap.to(fill, {
        width: `${acc}%`,
        duration: 1,
        ease: "power2.out",
        delay: 0.4,
      });
    else fill.style.width = `${acc}%`;
  }
}

// ─── Heatmap (last 35 days) ───────────────────────────────────────────────────
function renderHeatmap() {
  const grid = document.getElementById("heatmapGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const byDay = {};
  allEntries.forEach((e) => {
    const day = new Date(e.date).toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + (e.duration_millis || 0);
  });
  const max = Math.max(...Object.values(byDay), 1);

  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const ms = byDay[key] || 0;
    const pct = ms / max;
    const cell = document.createElement("div");
    cell.className =
      "heatmap-cell" +
      (pct > 0.75
        ? " l4"
        : pct > 0.5
          ? " l3"
          : pct > 0.2
            ? " l2"
            : pct > 0
              ? " l1"
              : "");
    cell.title = `${key}: ${formatDuration(ms)}`;
    grid.appendChild(cell);
  }
}

// ─── Bar chart (7-day / 30-day) ───────────────────────────────────────────────
function setupBarPeriodTabs() {
  document
    .getElementById("periodTabs")
    ?.querySelectorAll(".period-tab")
    .forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".period-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderBarChart(tab.dataset.period);
      });
    });
}

function renderBarChart(period = "week") {
  const days = period === "week" ? 7 : 30;
  const labels = [],
    data = [];
  const byDay = {};
  allEntries.forEach((e) => {
    const day = new Date(e.date).toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + (e.duration_millis || 0);
  });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    labels.push(label);
    data.push(Math.round((byDay[key] || 0) / 60000));
  }

  const canvas = document.getElementById("studyChart");
  if (!canvas) return;

  if (studyChart) studyChart.destroy();
  studyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: "rgba(221,232,157,0.75)",
          borderColor: "#739E4D",
          borderWidth: 1.5,
          borderRadius: 8,
          hoverBackgroundColor: "#DDE89D",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.raw} min` },
          backgroundColor: "#22333B",
          titleColor: "#DDE89D",
          bodyColor: "#FAF6E9",
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(34,51,59,0.05)" },
          ticks: {
            color: "rgba(34,51,59,0.5)",
            font: { size: 10 },
            maxRotation: 45,
          },
        },
        y: {
          grid: { color: "rgba(34,51,59,0.05)" },
          ticks: {
            color: "rgba(34,51,59,0.5)",
            font: { size: 11 },
            callback: (v) => `${v}m`,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Format minutes to Android-style: "0.1h", "1h", "1.5h" */
function formatMinutes(totalMin) {
  if (totalMin <= 0) return "0m";
  if (totalMin < 60) return `${Math.round(totalMin)}m`;
  const h = totalMin / 60;
  if (h < 0.1 && totalMin > 0) return "0.1h";
  if (h === Math.floor(h)) return `${Math.floor(h)}h`;
  return `${h.toFixed(1)}h`;
}
