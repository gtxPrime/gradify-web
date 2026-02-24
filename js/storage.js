/**
 * storage.js - Gradify Web Storage abstraction
 * Wraps localStorage + IndexedDB for structured data
 * Provides: simple KV (localStorage) + notes/time-tracking (IndexedDB)
 */

const DB_NAME = "GradifyDB";
const DB_VERSION = 4; // bumped: aligned chat + time schemas to Android entity fields

let _db = null;

// ─── localStorage helpers ────────────────────────────────────────────────────
export function getStorage(key, defaultVal = null) {
  try {
    const val = localStorage.getItem(`gradify_${key}`);
    if (val === null) return defaultVal;
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}

export function setStorage(key, value) {
  try {
    localStorage.setItem(`gradify_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed", e);
  }
}

export function removeStorage(key) {
  localStorage.removeItem(`gradify_${key}`);
}

export function clearAllStorage() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("gradify_")) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ─── Estimate localStorage usage ─────────────────────────────────────────────
export function getStorageSize() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    bytes += k.length + (localStorage.getItem(k) || "").length;
  }
  const kb = (bytes * 2) / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// ─── IndexedDB initialization ─────────────────────────────────────────────────
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Notes store
      if (!db.objectStoreNames.contains("notes")) {
        const notes = db.createObjectStore("notes", {
          keyPath: "id",
          autoIncrement: true,
        });
        notes.createIndex("subject", "subject", { unique: false });
        notes.createIndex("videoId", "videoId", { unique: false });
        notes.createIndex("important", "important", { unique: false });
        notes.createIndex("created", "created", { unique: false });
      }

      // Time tracking store — matches Android TimeTrackingDbHelper exactly
      // Fields: subject_name, activity_type, date (epoch ms), duration_millis
      if (!db.objectStoreNames.contains("timeTrack")) {
        const tt = db.createObjectStore("timeTrack", {
          keyPath: "_id",
          autoIncrement: true,
        });
        tt.createIndex("date", "date", { unique: false });
        tt.createIndex("activity_type", "activity_type", { unique: false });
        tt.createIndex("subject_name", "subject_name", { unique: false });
      }

      // PYQ sessions store
      if (!db.objectStoreNames.contains("pyqSessions")) {
        const pyq = db.createObjectStore("pyqSessions", {
          keyPath: "id",
          autoIncrement: true,
        });
        pyq.createIndex("subject", "subject", { unique: false });
        pyq.createIndex("date", "date", { unique: false });
      }

      // Chat history store — matches Android ChatMessageEntity exactly
      // Fields: videoId, messageText, isUserMessage, timestamp
      if (!db.objectStoreNames.contains("chatHistory")) {
        const chat = db.createObjectStore("chatHistory", {
          keyPath: "id",
          autoIncrement: true,
        });
        chat.createIndex("videoId", "videoId", { unique: false });
        chat.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Note CRUD ────────────────────────────────────────────────────────────────
export async function saveNote(note) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");
    const req = note.id
      ? store.put(note)
      : store.add({ created: Date.now(), ...note });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const req = tx.objectStore("notes").getAll();
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => b.created - a.created));
    req.onerror = () => reject(req.error);
  });
}

export async function getNotesByVideoId(videoId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const idx = tx.objectStore("notes").index("videoId");
    const req = idx.getAll(videoId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNote(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const req = tx.objectStore("notes").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Time Tracking ────────────────────────────────────────────────────────────
/**
 * Save a time entry — matches Android TimeTrackingDbHelper.addTimeEntry:
 * @param {string} subjectName
 * @param {string} activityType — 'lecture' | 'pyq'
 * @param {number} durationMillis — duration in milliseconds
 * @param {number} [dateMillis] — epoch ms for the session date (defaults to now)
 */
export async function saveTimeEntry(
  subjectName,
  activityType,
  durationMillis,
  dateMillis,
) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("timeTrack", "readwrite");
    const store = tx.objectStore("timeTrack");
    const req = store.add({
      subject_name: subjectName,
      activity_type: activityType,
      date: dateMillis || Date.now(),
      duration_millis: durationMillis,
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getTimeEntries(fromDate, toDate) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("timeTrack", "readonly");
    const req = tx.objectStore("timeTrack").getAll();
    req.onsuccess = () => {
      const from = new Date(fromDate).getTime();
      const to = new Date(toDate).getTime();
      const filtered = req.result.filter((e) => {
        const d = new Date(e.date).getTime();
        return d >= from && d <= to;
      });
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllTimeEntries() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("timeTrack", "readonly");
    const req = tx.objectStore("timeTrack").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get aggregated lecture + PYQ time per subject (mirrors Android getAggregatedSubjectStats)
 * Returns: [{ subject_name, lectureMs, pyqMs }]
 */
export async function getAggregatedSubjectStats(startMs, endMs) {
  const all = await getAllTimeEntries();
  const filtered = all.filter((e) => e.date >= startMs && e.date <= endMs);
  const map = {};
  filtered.forEach((e) => {
    if (!map[e.subject_name])
      map[e.subject_name] = {
        subject_name: e.subject_name,
        lectureMs: 0,
        pyqMs: 0,
      };
    if (e.activity_type === "lecture")
      map[e.subject_name].lectureMs += e.duration_millis;
    else if (e.activity_type === "pyq")
      map[e.subject_name].pyqMs += e.duration_millis;
  });
  return Object.values(map);
}

/**
 * Total ms studied per day (mirrors Android getDailyTotalStudyTime)
 */
export async function getDailyTotals(startMs, endMs) {
  const all = await getAllTimeEntries();
  const filtered = all.filter((e) => e.date >= startMs && e.date <= endMs);
  const map = {};
  filtered.forEach((e) => {
    const day = new Date(e.date).toISOString().split("T")[0];
    map[day] = (map[day] || 0) + e.duration_millis;
  });
  return map; // { 'YYYY-MM-DD': totalMs }
}

// ─── PYQ Sessions ─────────────────────────────────────────────────────────────
export async function savePYQSession(session) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pyqSessions", "readwrite");
    const req = tx
      .objectStore("pyqSessions")
      .add({ ...session, date: todayDateStr(), created: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPYQSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pyqSessions", "readonly");
    const req = tx.objectStore("pyqSessions").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Chat History — matches Android ChatMessageEntity exactly ─────────────────
// Fields: videoId, messageText (not 'content'), isUserMessage (bool), timestamp (epoch ms)

/**
 * Save a chat message matching Android ChatMessageEntity:
 * @param {string} videoId
 * @param {string} messageText
 * @param {boolean} isUserMessage
 * @param {number} [timestamp] — defaults to Date.now()
 */
export async function saveChatMessage(
  videoId,
  messageText,
  isUserMessage,
  timestamp,
) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chatHistory", "readwrite");
    const req = tx.objectStore("chatHistory").add({
      videoId,
      messageText,
      isUserMessage,
      timestamp: timestamp || Date.now(),
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getChatByVideoId(videoId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chatHistory", "readonly");
    const idx = tx.objectStore("chatHistory").index("videoId");
    const req = idx.getAll(videoId);
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = () => reject(req.error);
  });
}

export async function clearChatForVideo(videoId) {
  const db = await openDB();
  const messages = await getChatByVideoId(videoId);
  return new Promise((resolve) => {
    const tx = db.transaction("chatHistory", "readwrite");
    const store = tx.objectStore("chatHistory");
    messages.forEach((m) => store.delete(m.id));
    tx.oncomplete = () => resolve();
  });
}

export async function clearAllChat() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("chatHistory", "readwrite");
    tx.objectStore("chatHistory").clear();
    tx.oncomplete = () => resolve();
  });
}

// ─── Export / Import ──────────────────────────────────────────────────────────
export async function exportAllNotes() {
  const notes = await getAllNotes();
  const data = JSON.stringify(
    { version: 1, exported: new Date().toISOString(), notes },
    null,
    2,
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gradify-notes-${todayDateStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importNotes(jsonText) {
  const parsed = JSON.parse(jsonText);
  const notes = parsed.notes || parsed;
  for (const note of notes) {
    const { id: _, ...n } = note;
    await saveNote(n);
  }
  return notes.length;
}

// ─── Note helpers (mirrors Android NoteDao queries) ────────────────────────────

/** Get all notes sorted by subject, weekIndex, videoIndex, timestamp (lecture order) */
export async function getNotesBySubjectLecture(subjectName) {
  const notes = await getAllNotes();
  return notes
    .filter((n) => n.subject === subjectName)
    .sort(
      (a, b) =>
        a.weekIndex - b.weekIndex ||
        a.videoIndex - b.videoIndex ||
        a.timestamp - b.timestamp,
    );
}

/** Get all notes for a subject, important ones first */
export async function getNotesBySubjectImportant(subjectName) {
  const notes = await getAllNotes();
  return notes
    .filter((n) => n.subject === subjectName)
    .sort(
      (a, b) =>
        (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0) ||
        b.createdAt - a.createdAt,
    );
}

/** Count of notes per subject — matches Android getSubjectNoteCounts() */
export async function getSubjectNoteCounts() {
  const notes = await getAllNotes();
  const map = {};
  notes.forEach((n) => {
    map[n.subject] = (map[n.subject] || 0) + 1;
  });
  return map; // { 'English 1': 5, 'CT': 2, ... }
}

export async function clearAllDB() {
  const db = await openDB();
  const stores = ["notes", "timeTrack", "pyqSessions", "chatHistory"];
  return new Promise((resolve) => {
    const tx = db.transaction(stores, "readwrite");
    stores.forEach((s) => tx.objectStore(s).clear());
    tx.oncomplete = () => resolve();
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────
export function todayDateStr() {
  return new Date().toISOString().split("T")[0];
}

export function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatDurationLong(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
