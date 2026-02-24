/**
 * lectures.js – Subject selection page logic
 */
import { fetchLectureMap } from "./api.js";
import { requireAuth } from "./auth.js";
import { getStorage } from "./storage.js";

const SUBJECT_COLORS = {
  CT: "#DDE89D",
  "English 1": "#A8C66C",
  "English 2": "#739E4D",
  "Maths 1": "#0BE5C1",
  "Maths 2": "#09C5A5",
  Python: "#F4A261",
  "Stats 1": "#E76F51",
  "Stats 2": "#E9C46A",
  BDM: "#264653",
  DBMS: "#2A9D8F",
  Java: "#E63946",
  "MAD 1": "#457B9D",
  "MAD 2": "#1D3557",
  MLF: "#6D6875",
  MLP: "#B5838D",
  MLT: "#E5989B",
  PDSA: "#FFCDB2",
  "Business Analytics": "#FFB4A2",
  "System Commands": "#22333B",
};

const SUBJECT_ICONS = {
  CT: "💻",
  "English 1": "📖",
  "English 2": "📚",
  "Maths 1": "➕",
  "Maths 2": "🔢",
  Python: "🐍",
  "Stats 1": "📊",
  "Stats 2": "📈",
  BDM: "💼",
  DBMS: "🗄️",
  Java: "☕",
  "MAD 1": "📱",
  "MAD 2": "📲",
  MLF: "🤖",
  MLP: "🧠",
  MLT: "🔬",
  PDSA: "🏗️",
  "Business Analytics": "📉",
  "System Commands": "⌨️",
};

let allSubjects = {};
let currentLevel = "all";
let searchQuery = "";

window.addEventListener("DOMContentLoaded", async () => {
  await requireAuth(); // 🔒 Redirect to login if not signed in
  await loadSubjects();
  setupFilters();
  setupSearch();
});

async function loadSubjects() {
  const container = document.getElementById("subjectsContainer");
  try {
    const lectureMap = await fetchLectureMap();
    allSubjects = lectureMap;
    renderSubjects();
  } catch (e) {
    console.error("Lectures load failed:", e);
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Failed to Load</h3><p class="empty-state-sub">${e.message || "Check your connection and try again."}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
  }
}

function renderSubjects() {
  const container = document.getElementById("subjectsContainer");
  container.innerHTML = "";

  // Read selected subjects — handle both old double-encoded string and new array format
  let mySubjects = [];
  const saved = getStorage("selectedSubjects", null);
  if (saved) {
    if (Array.isArray(saved)) {
      mySubjects = saved;
    } else if (typeof saved === "string") {
      try {
        mySubjects = JSON.parse(saved);
      } catch (_) {}
    }
  }
  mySubjects = mySubjects.filter(
    (s) => s && s !== "Select subjects in profile",
  );

  const levels = Object.keys(allSubjects).filter(
    (l) => currentLevel === "all" || l === currentLevel,
  );

  let totalShown = 0;

  levels.forEach((level) => {
    // Filter to only subjects the user has selected (if any saved)
    const subjects = Object.entries(allSubjects[level]).filter(([name]) => {
      const matchesSearch =
        !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSaved = mySubjects.includes(name);
      return matchesSearch && matchesSaved;
    });
    if (!subjects.length) return;
    totalShown += subjects.length;

    const section = document.createElement("div");
    section.className = "subject-level";
    section.innerHTML = `<div class="level-badge">${level === "Foundation" ? "🎓" : "📐"} ${level}</div>`;

    const grid = document.createElement("div");
    grid.className = "subjects-grid";

    subjects.forEach(([name, jsonUrl]) => {
      const color = SUBJECT_COLORS[name] || "#DDE89D";
      const icon = SUBJECT_ICONS[name] || "📚";

      const card = document.createElement("div");
      card.className = "subject-card";
      card.innerHTML = `
        <div class="subject-initial" style="background:${color}">${icon}</div>
        <div class="subject-name">${name}</div>
        <div class="subject-meta">${level} Level</div>
      `;
      card.addEventListener("click", () => {
        navigate(
          `player.html?subject=${encodeURIComponent(name)}&json=${encodeURIComponent(jsonUrl)}&level=${encodeURIComponent(level)}`,
        );
      });
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  if (!totalShown) {
    if (!mySubjects.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No Subjects Selected</h3>
        <p class="empty-state-sub">Go to your profile and pick your subjects first.</p>
        <button class="btn btn-primary" onclick="navigate('profile.html')">Go to Profile</button>
      </div>`;
    } else {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3 class="empty-state-title">No Subjects Found</h3><p class="empty-state-sub">Try a different search or filter.</p></div>`;
    }
  }

  // GSAP stagger on subject cards
  if (typeof gsap !== "undefined") {
    gsap.from(".subject-card", {
      opacity: 0,
      y: 20,
      stagger: 0.04,
      duration: 0.4,
      ease: "power2.out",
      delay: 0.1,
      clearProps: "all",
    });
  }
}

function setupFilters() {
  document
    .getElementById("levelFilter")
    ?.querySelectorAll(".chip")
    .forEach((chip) => {
      chip.addEventListener("click", () => {
        document
          .querySelectorAll("#levelFilter .chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentLevel = chip.dataset.level;
        renderSubjects();
      });
    });
}

function setupSearch() {
  document.getElementById("searchBar")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderSubjects();
  });
}
