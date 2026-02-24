/**
 * notes.js – Notes management page logic
 */
import {
  getAllNotes,
  deleteNote,
  saveNote,
  getStorage,
  setStorage,
} from "./storage.js";

let allNotes = [];
let activeSubject = "all";
let searchQuery = "";
let showImportant = false;

window.addEventListener("DOMContentLoaded", async () => {
  await loadNotes();
  setupSearch();
  setupNewNoteSheet();
  populateSubjectDropdown();
});

async function loadNotes() {
  allNotes = await getAllNotes();
  buildSubjectFilterChips();
  renderNotes();
}

function buildSubjectFilterChips() {
  const bar = document.getElementById("subjectFilterTabs");
  if (!bar) return;
  bar.innerHTML = '<div class="chip active" data-subject="all">All</div>';

  const subjects = [...new Set(allNotes.map((n) => n.subject || "General"))];
  subjects.forEach((sub) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.subject = sub;
    chip.textContent = sub;
    bar.appendChild(chip);
  });

  bar.querySelectorAll(".chip").forEach((c) => {
    c.addEventListener("click", () => {
      bar
        .querySelectorAll(".chip")
        .forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      activeSubject = c.dataset.subject;
      renderNotes();
    });
  });
}

function renderNotes() {
  const list = document.getElementById("notesList");
  const empty = document.getElementById("emptyNotes");
  const count = document.getElementById("notesCount");
  if (!list) return;
  list.innerHTML = "";

  let filtered = allNotes;
  if (activeSubject !== "all")
    filtered = filtered.filter(
      (n) => (n.subject || "General") === activeSubject,
    );
  if (searchQuery)
    filtered = filtered.filter((n) =>
      n.content?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  if (showImportant) filtered = filtered.filter((n) => n.important);

  if (count)
    count.textContent = `${filtered.length} note${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  filtered.forEach((note) => {
    const card = document.createElement("div");
    card.className = "note-card" + (note.important ? " important" : "");

    const date = new Date(note.created || 0).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const hasTs = note.timestamp > 0;
    const m = Math.floor((note.timestamp || 0) / 60),
      s = (note.timestamp || 0) % 60;

    card.innerHTML = `
      <div class="note-card-header">
        <div style="flex:1">
          <span class="note-subject-badge">${note.subject || "General"}${note.important ? " ⭐" : ""}</span>
          <div class="note-text">${note.content}</div>
        </div>
        <button class="note-delete-btn" data-id="${note.id}">🗑</button>
      </div>
      <div class="note-footer">
        <span>${date}</span>
        ${hasTs ? `<span class="note-ts-badge">⏱ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}</span>` : ""}
      </div>
    `;

    card
      .querySelector(".note-delete-btn")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteNote(note.id);
        showToast("Note deleted", "info");
        allNotes = allNotes.filter((n) => n.id !== note.id);
        renderNotes();
      });

    list.appendChild(card);
  });

  // GSAP stagger
  if (typeof gsap !== "undefined") {
    gsap.from(".note-card", {
      opacity: 0,
      y: 16,
      stagger: 0.05,
      duration: 0.3,
      ease: "power2.out",
    });
  }
}

function setupSearch() {
  document.getElementById("notesSearch")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderNotes();
  });
  document
    .getElementById("importantFilterBtn")
    ?.addEventListener("click", (e) => {
      showImportant = !showImportant;
      e.target.classList.toggle("active", showImportant);
      renderNotes();
    });
}

// ─── New note sheet ───────────────────────────────────────────────────────────
function setupNewNoteSheet() {
  const fab = document.getElementById("newNoteFab");
  const sheet = document.getElementById("newNoteSheet");
  const backdrop = document.getElementById("sheetBackdrop");
  const saveBtn = document.getElementById("saveNewNoteBtn");

  const open = () => {
    sheet?.classList.add("open");
    backdrop?.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  window.closeNewNoteSheet = () => {
    sheet?.classList.remove("open");
    backdrop?.classList.remove("open");
    document.body.style.overflow = "";
  };

  fab?.addEventListener("click", open);
  backdrop?.addEventListener("click", closeNewNoteSheet);

  saveBtn?.addEventListener("click", async () => {
    const content = document.getElementById("newNoteText").value.trim();
    if (!content) {
      showToast("Write something first!", "warn");
      return;
    }
    const subject =
      document.getElementById("newNoteSubject").value || "General";
    const important = document.getElementById("newNoteImportant").checked;
    await saveNote({
      subject,
      content,
      important,
      timestamp: 0,
      videoId: null,
      created: Date.now(),
    });
    document.getElementById("newNoteText").value = "";
    document.getElementById("newNoteImportant").checked = false;
    closeNewNoteSheet();
    showToast("Note saved ✅", "success");
    allNotes = await getAllNotes();
    buildSubjectFilterChips();
    renderNotes();
  });
}

function populateSubjectDropdown() {
  const mySubjects = getStorage("mySubjects", []);
  const sel = document.getElementById("newNoteSubject");
  if (!sel) return;
  sel.innerHTML = '<option value="General">General</option>';
  mySubjects.forEach((s) => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  });
}
