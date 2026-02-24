/**
 * profile.js — Matches Android ProfileActivity.java
 * Features:
 *  - Foundation / Diploma / Degree level tab (mirrors level_selector_container)
 *  - Subject chips grouped by type (Maths, CS, AI, DB, App, Lang, Res, PCS)
 *  - Max 4 subjects enforced (MAX_SELECTED_SUBJECTS)
 *  - Bottom slide-up selection tray with removable chips (mirrors selection_tray)
 *  - DiceBear notionists avatar (same URL pattern as Android)
 *  - Google sign-in (Firebase, restricted to ds.study.iitm.ac.in)
 *  - Preferences persisted to localStorage (mirrors SharedPreferences)
 */

import { getStorage, setStorage } from "./storage.js";
import { triggerSync } from "./auth.js";

const MAX_SELECTED = 4;

// ─── Subject data (mirrors Utils.getSubjectsByLevel + subjectToType) ─────────
const SUBJECTS_BY_LEVEL = {
  Foundation: [
    "Maths 1",
    "Stats 1",
    "English 1",
    "CT",
    "Python",
    "Maths 2",
    "Stats 2",
    "English 2",
  ],
  Diploma: [
    "MLF",
    "MLT",
    "MLP",
    "BDM",
    "Business Analytics",
    "TDS",
    "PDSA",
    "DBMS",
    "MAD 1",
    "Java",
    "System Commands",
    "MAD 2",
  ],
  Degree: [
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
  ],
};

const SUBJECT_TYPE = {
  "Maths 1": "Maths",
  "Stats 1": "Maths",
  "Maths 2": "Maths",
  "Stats 2": "Maths",
  "Game Theory and Strategy": "Maths",
  "Statistical Computing": "Maths",
  Python: "CS",
  Java: "CS",
  "Programming in C": "CS",
  PDSA: "CS",
  TDS: "CS",
  "Advanced Algorithms": "CS",
  CT: "PCS",
  MLF: "AI",
  MLT: "AI",
  MLP: "AI",
  "Deep Learning": "AI",
  "A.I.": "AI",
  "Generative AI": "AI",
  "Deep Learning for CV": "AI",
  "Deep Learning Practice": "AI",
  MLOPS: "AI",
  BDM: "DB",
  DBMS: "DB",
  ADS: "DB",
  "Introduction to Big Data": "DB",
  "MAD 1": "App",
  "MAD 2": "App",
  "DT for App Development": "App",
  "Software Testing": "App",
  "Software Engineering": "App",
  "Computer System Design": "App",
  "English 1": "Lang",
  "English 2": "Lang",
  "Speech Technology": "Lang",
  "Market Research": "Res",
  "Business Analytics": "Res",
  "Managerial Economics": "Res",
  "System Commands": "Res",
  SPG: "Res",
  LLM: "Res",
  ATB: "Res",
};

const TYPE_ICONS = {
  Maths: "📐",
  CS: "💻",
  PCS: "🧩",
  AI: "🤖",
  DB: "🗃️",
  App: "📱",
  Lang: "📖",
  Res: "📊",
};

// ─── State ─────────────────────────────────────────────────────────────────────
let currentLevel = "Foundation";
let selectedSubjects = new Set();

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadPreferences();
  setupLevelButtons();
  setupAuthButtons();
  renderSubjectList();
  updateSelectionTray();
  updateUI();
});

// ─── Preferences (mirrors SharedPreferences) ──────────────────────────────────
function loadPreferences() {
  const saved = getStorage("selectedSubjects", null);
  if (saved) {
    try {
      // Handle both old double-encoded string and new array format
      if (Array.isArray(saved)) {
        selectedSubjects = new Set(saved);
      } else if (typeof saved === "string") {
        selectedSubjects = new Set(JSON.parse(saved));
      }
    } catch (_) {}
  }
  currentLevel = getStorage("studyLevel", "Foundation");

  // Auto-detect level from saved subjects
  if (selectedSubjects.size > 0) {
    for (const level of Object.keys(SUBJECTS_BY_LEVEL)) {
      if (
        [...selectedSubjects].some((s) => SUBJECTS_BY_LEVEL[level].includes(s))
      ) {
        currentLevel = level;
        break;
      }
    }
  }
}

function savePreferences() {
  setStorage("studyLevel", currentLevel);
  setStorage("selectedSubjects", [...selectedSubjects]);
  triggerSync();
}

// ─── Level selector (mirrors level_selector_container) ────────────────────────
function setupLevelButtons() {
  ["Foundation", "Diploma", "Degree"].forEach((level) => {
    document.getElementById(`btn${level}`)?.addEventListener("click", () => {
      currentLevel = level;
      savePreferences();
      updateLevelUI();
      renderSubjectList();
      updateSelectionTray();
    });
  });
}

function updateLevelUI() {
  ["Foundation", "Diploma", "Degree"].forEach((l) => {
    const btn = document.getElementById(`btn${l}`);
    btn?.classList.toggle("active", l === currentLevel);
  });
}

// ─── Subject chip list (mirrors updateSubjectChipsByLevel) ────────────────────
function renderSubjectList() {
  const container = document.getElementById("subjectsContainer");
  if (!container) return;
  container.innerHTML = "";

  const subjects = SUBJECTS_BY_LEVEL[currentLevel] || [];

  // Group by type (preserving insertion order)
  const groups = {};
  subjects.forEach((s) => {
    const type = SUBJECT_TYPE[s] || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(s);
  });

  Object.entries(groups).forEach(([type, list]) => {
    // Header
    const header = document.createElement("div");
    header.className = "chip-group-header";
    header.innerHTML = `<span class="chip-group-dot"></span><span>${TYPE_ICONS[type] || "●"} ${type.toUpperCase()}</span>`;
    container.appendChild(header);

    // Chip row
    const chipWrap = document.createElement("div");
    chipWrap.className = "chip-group-row";

    list.forEach((subject) => {
      const chip = document.createElement("button");
      const isSel = selectedSubjects.has(subject);
      chip.className = "subject-chip" + (isSel ? " selected" : "");
      chip.textContent = subject;
      if (isSel) chip.innerHTML += '<span class="chip-check">✓</span>';

      chip.addEventListener("click", () => toggleSubject(subject, chip));
      chipWrap.appendChild(chip);
    });

    container.appendChild(chipWrap);
  });

  updateSelectionTray();
}

function toggleSubject(subject, chip) {
  if (!isLoggedIn()) {
    showToast("Sign in to select subjects", "warning");
    return;
  }

  if (selectedSubjects.has(subject)) {
    selectedSubjects.delete(subject);
    chip.classList.remove("selected");
    chip.querySelector(".chip-check")?.remove();
  } else {
    if (selectedSubjects.size >= MAX_SELECTED) {
      showToast(`Max ${MAX_SELECTED} subjects allowed`, "warning");
      return;
    }
    selectedSubjects.add(subject);
    chip.classList.add("selected");
    const check = document.createElement("span");
    check.className = "chip-check";
    check.textContent = "✓";
    chip.appendChild(check);
  }
  savePreferences();
  updateSelectionTray();
}

// ─── Selection tray (mirrors selection_tray slide-up) ─────────────────────────
function updateSelectionTray() {
  const tray = document.getElementById("selectionTray");
  const count = document.getElementById("trayCount");
  const chips = document.getElementById("trayChips");
  const counter = document.getElementById("subjectCounter");

  if (!tray) return;

  const sel = [...selectedSubjects];

  if (counter)
    counter.textContent = `${sel.length} / ${MAX_SELECTED} SUBJECTS SELECTED`;
  if (count) count.textContent = `${sel.length} / ${MAX_SELECTED}`;

  if (chips) {
    chips.innerHTML = "";
    sel.forEach((s) => {
      const pill = document.createElement("div");
      pill.className = "tray-pill";
      pill.innerHTML = `<span>${s}</span><button class="tray-remove" aria-label="Remove ${s}">✕</button>`;
      pill.querySelector(".tray-remove").addEventListener("click", () => {
        selectedSubjects.delete(s);
        savePreferences();
        renderSubjectList(); // re-render chips
        updateSelectionTray();
      });
      chips.appendChild(pill);
    });
  }

  // Slide in / out (mirrors show/hideSelectionTray)
  if (sel.length > 0 && isLoggedIn()) {
    tray.classList.add("visible");
  } else {
    tray.classList.remove("visible");
  }
}

// ─── Auth buttons ─────────────────────────────────────────────────────────────
// ─── Auth buttons ─────────────────────────────────────────────────────────────
function setupAuthButtons() {
  document
    .getElementById("googleSignInBtn")
    ?.addEventListener("click", handleGoogleSignIn);
  document
    .getElementById("signOutBtn")
    ?.addEventListener("click", handleSignOut);
  document
    .getElementById("clearDataBtn")
    ?.addEventListener("click", handleClearData);
  document.getElementById("saveTrayBtn")?.addEventListener("click", () => {
    savePreferences();
    showToast("Preferences saved!", "success");
  });
}

function handleGoogleSignIn() {
  // Falls through to Firebase in auth.js / app.js — just redirect to the standard flow
  // which is already wired by initApp('profile') calling initAuth
  const btn = document.getElementById("googleSignInBtn");
  if (btn) btn.click(); // app.js handles this via the logoutBtn toggle
}

function handleSignOut() {
  import("./auth.js")
    .then((mod) => {
      if (mod.signOut) mod.signOut();
      else window.location.reload();
    })
    .catch(() => window.location.reload());
}

function handleClearData() {
  if (
    !confirm(
      "Clear all local study data (notes, history, time tracking)? This cannot be undone.",
    )
  )
    return;
  import("./storage.js").then(async (mod) => {
    if (mod.clearAllDB) await mod.clearAllDB();
    showToast("All local data cleared", "success");
  });
}

// ─── UI update on auth change ──────────────────────────────────────────────────
function isLoggedIn() {
  const user = window.__gradify_user;
  return user && !user.isAnonymous;
}

function updateUI() {
  // This is called on DOMContentLoaded; actual auth state fires via app.js callbacks
  // Listen for the custom event that app.js dispatches
  document.addEventListener("gradify:authChanged", (e) => {
    const user = e.detail;
    renderUserInfo(user);
    updateLevelUI();
    renderSubjectList();
    updateSelectionTray();
  });

  // Also check immediately if already set
  if (window.__gradify_user !== undefined) {
    renderUserInfo(window.__gradify_user);
  }
}

function renderUserInfo(user) {
  const loggedInView = document.getElementById("loggedInView");
  const loggedOutView = document.getElementById("loggedOutView");
  const levelSection = document.getElementById("levelSection");

  if (user) {
    loggedInView?.style && (loggedInView.style.display = "block");
    loggedOutView?.style && (loggedOutView.style.display = "none");
    if (levelSection) levelSection.style.display = "block";

    // Avatar (mirrors Android DiceBear logic)
    const seed = user.displayName || user.email || "user";
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/png?seed=${encodeURIComponent(seed)}&backgroundColor=DDE89D`;
    const photoUrl = user.photoURL
      ? user.photoURL.replace("=s96-c", "=s500")
      : null;

    const img = document.getElementById("profileAvatar");
    if (img) {
      img.src = photoUrl || avatarUrl;
      img.onerror = () => {
        img.src = avatarUrl;
      };
    }

    // Name (Android strips first word if name has space: e.g. "24F2001234 Riya" → "Riya")
    let displayName = user.displayName || "User";
    if (displayName.includes(" "))
      displayName = displayName.substring(displayName.indexOf(" ")).trim();
    setText("profileName", displayName);
    setText("profileEmailDisplay", user.email || "–");
    setText("profileUid", user.uid ? `UID: ${user.uid.slice(0, 16)}…` : "");
    setText("accName", displayName);
    setText("accEmail", user.email || "–");
    setText("accProvider", "Google");

    // Sign-out icon
    document.getElementById("profileSignOutIcon")?.style &&
      (document.getElementById("profileSignOutIcon").style.display = "flex");
  } else {
    loggedInView?.style && (loggedInView.style.display = "none");
    loggedOutView?.style && (loggedOutView.style.display = "block");
    if (levelSection) levelSection.style.display = "none";
    document.getElementById("profileSignOutIcon")?.style &&
      (document.getElementById("profileSignOutIcon").style.display = "none");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add("visible"), 10);
  setTimeout(() => {
    t.classList.remove("visible");
    setTimeout(() => t.remove(), 300);
  }, 2500);
}
