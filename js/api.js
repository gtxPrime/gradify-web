/**
 * api.js - Gradify Web Data Layer
 * Mirrors Utils.java exactly: jsDelivr CDN, AES-CBC decryption, index caching
 * All methods match the Android app data flow
 */

// ─── Constants (from Utils.java) ─────────────────────────────────────────────
export const INDEX_URL =
  "https://cdn.jsdelivr.net/gh/gtxPrime/gradify@main/data/index.json";
export const QUIZ_TYPES = ["Quiz 1", "Quiz 2", "End Term"];

// ─── Subject map (from Utils.java:getSubjectsByLevel) ───────────────────────
export const SUBJECTS_BY_LEVEL = {
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

// ─── Subject type map (from Utils.java static block) ─────────────────────────
export const SUBJECT_TYPE = {
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

// ─── Drawable ↔ SVG icon map (uses Android app's drawable names) ─────────────
export const SUBJECT_ICON = {
  Maths: "assets/drawables/ic_maths.svg",
  CS: "assets/drawables/ic_binary.svg",
  PCS: "assets/drawables/ic_computer.xml_converted.svg",
  AI: "assets/drawables/ic_bot.svg",
  DB: "assets/drawables/ic_database.svg",
  App: "assets/drawables/ic_code.svg",
  Lang: "assets/drawables/ic_languages.svg",
  Res: "assets/drawables/ic_business.svg",
};

// ─── URL conversion: GitHub blob → jsDelivr CDN (from Utils.java:githubToJsDelivr) ──
export function githubToJsDelivr(url) {
  if (!url || !url.includes("github.com") || !url.includes("/blob/"))
    return url;
  return url
    .replace("github.com", "cdn.jsdelivr.net/gh")
    .replace("/blob/", "@");
}

// ─── AES-CBC Decryption (from Utils.java:decryptUrl) ─────────────────────────
// Encrypts PYQ download links with prefix "youarenoob.gradify/"
// Key must be set via Settings page → stored in localStorage as 'secretKey'
const ENCRYPTED_PREFIX = "youarenoob.gradify/";

export async function decryptUrl(url) {
  if (!url || !url.startsWith(ENCRYPTED_PREFIX)) return url;

  const secretKeyHex = window._gradifySecretKey || "";

  if (!secretKeyHex) {
    console.warn("Encrypted URL found but no secret key configured");
    return null;
  }

  try {
    const b64 = url
      .slice(ENCRYPTED_PREFIX.length)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const encData = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    if (encData.length < 16) return url;

    const iv = encData.slice(0, 16);
    const ciphertext = encData.slice(16);

    // Convert hex key string to bytes
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 64; i += 2) {
      keyBytes[i / 2] = parseInt(secretKeyHex.slice(i, i + 2), 16);
    }

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      ciphertext,
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

// ─── Session-level cache (like indexCache in Utils.java) ─────────────────────
let indexCache = null;

const _sessionCache = {};
async function cachedFetch(url, key) {
  if (_sessionCache[key]) return _sessionCache[key];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const data = await res.json();
  _sessionCache[key] = data;
  return data;
}

// ─── fetchIndexData (mirrors Utils.java:fetchIndexData) ──────────────────────
const INDEX_FALLBACK_URL =
  "https://raw.githubusercontent.com/gtxPrime/gradify/main/data/index.json";

export async function fetchIndexData() {
  if (indexCache) return indexCache;
  try {
    indexCache = await cachedFetch(INDEX_URL, "index");
  } catch (primaryErr) {
    console.warn(
      "Primary index fetch failed, trying fallback:",
      primaryErr.message,
    );
    try {
      indexCache = await cachedFetch(INDEX_FALLBACK_URL, "index");
    } catch (fallbackErr) {
      console.error("Both index fetch attempts failed:", fallbackErr.message);
      throw fallbackErr;
    }
  }
  return indexCache;
}

// ─── fetchDates ───────────────────────────────────────────────────────────────
export async function fetchDates() {
  const index = await fetchIndexData();
  if (!index.dates) throw new Error("Dates not found in index");
  return index.dates;
}

// ─── fetchLectures (mirrors Utils.java:fetchLectures — flattens levels) ───────
export async function fetchLectureMap() {
  const index = await fetchIndexData();
  if (!index.lectures) throw new Error("Lectures not found in index");
  // Return as-is (nested by level), player.html uses level info
  return index.lectures;
}

// ─── fetchLectureData (fetch & cache individual subject JSON) ────────────────
// Lecture JSON shape: { subject: "CT", weeks: { "Week 1": [{ id, title, link }] } }
export async function fetchLectureData(githubUrl) {
  const url = githubToJsDelivr(githubUrl);
  const key = url.split("/").pop();
  return cachedFetch(url, `lec_${key}`);
}

// ─── fetchSubjectQuizData (mirrors Utils.java:fetchSubjectQuizData) ──────────
// Quiz JSON shape: { papers: { Subject: { QuizType: { Year: { Session: encryptedUrl } } } } }
export async function fetchSubjectQuizData(subject) {
  const index = await fetchIndexData();
  if (!index.quizzes?.[subject])
    throw new Error(`Subject ${subject} not in quizzes index`);
  const url = githubToJsDelivr(index.quizzes[subject]);
  const key = subject.replace(/\s+/g, "_").toLowerCase();
  return cachedFetch(url, `quiz_${key}`);
}

// ─── getQuizObject: navigate papers > subject > quizType ─────────────────────
async function getQuizObject(subject, quizType) {
  const db = await fetchSubjectQuizData(subject);
  const papers = db.papers || db;
  const subObj = papers[subject];
  if (!subObj) throw new Error("Subject not found in papers");
  if (!subObj[quizType]) throw new Error("Quiz type not found");
  return subObj[quizType];
}

// ─── fetchQuizYears (mirrors Utils.java:fetchData when year==null) ────────────
// Returns years sorted: latest first (e.g. "Oct, 2024" > "Feb, 2024")
export async function fetchQuizYears(subject, quizType) {
  const quizObj = await getQuizObject(subject, quizType);
  const years = Object.keys(quizObj);

  years.sort((a, b) => {
    try {
      const [ma, ya] = a.split(", ");
      const [mb, yb] = b.split(", ");
      const MONTHS = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      if (ya !== yb) return parseInt(yb) - parseInt(ya);
      return (
        (MONTHS[mb?.toLowerCase().slice(0, 3)] ?? 0) -
        (MONTHS[ma?.toLowerCase().slice(0, 3)] ?? 0)
      );
    } catch {
      return b.localeCompare(a);
    }
  });

  return years;
}

// ─── fetchQuizSessions (mirrors Utils.java:fetchData when year!=null) ─────────
export async function fetchQuizSessions(subject, quizType, year) {
  const quizObj = await getQuizObject(subject, quizType);
  if (!quizObj[year]) throw new Error("Year not found");
  return Object.keys(quizObj[year]).sort();
}

// ─── Dropbox URL conversion (share link → direct download) ───────────────────
export function dropboxDirectUrl(url) {
  if (!url) return url;
  // Convert www.dropbox.com share links to dl.dropboxusercontent.com
  if (url.includes("www.dropbox.com")) {
    url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    // Remove dl=0/dl=1 params that prevent direct access
    url = url.replace(/[?&]dl=[01]/, "");
  }
  return url;
}

// ─── fetchQuizLink: returns DECRYPTED url (mirrors fetchExamJsonLink + decryptUrl + githubToJsDelivr)
export async function fetchQuizLink(subject, quizType, year, session) {
  const quizObj = await getQuizObject(subject, quizType);
  const link = quizObj?.[year]?.[session];
  if (!link)
    throw new Error(`No data for ${subject}/${quizType}/${year}/${session}`);

  const decrypted = await decryptUrl(link);
  if (decrypted === null)
    throw new Error("Quiz link is encrypted — add the secret key in Settings.");

  // Apply both GitHub→jsDelivr and Dropbox→direct conversions
  let finalUrl = githubToJsDelivr(decrypted);
  finalUrl = dropboxDirectUrl(finalUrl);
  return finalUrl;
}

// ─── fetchFormulas ─────────────────────────────────────────────────────────────
export async function fetchFormulas() {
  const index = await fetchIndexData();
  if (!index.formulas) throw new Error("Formulas link not found in index");
  const url = githubToJsDelivr(index.formulas);
  return cachedFetch(url, "formulas");
}

// ─── Date helpers (mirrors Utils.java:getRunningWeek) ────────────────────────
export function getRunningWeek(startDateStr) {
  if (!startDateStr) return 1;
  try {
    const start = new Date(startDateStr);
    const diff = Date.now() - start.getTime();
    if (diff < 0) return 0;
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  } catch {
    return 1;
  }
}

export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return diff > 0 ? Math.ceil(diff / 86400000) : null;
}

export function getCountdownText(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return "Done";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days}d left`;
}

export function getNextExam(dates) {
  const exams = [
    { name: "Quiz 1", date: dates?.quiz_1 },
    { name: "Quiz 2", date: dates?.quiz_2 },
    { name: "End Term", date: dates?.end_term },
  ];
  const now = Date.now();
  const upcoming = exams.filter((e) => e.date && new Date(e.date) > now);
  if (!upcoming.length) return null;
  return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
}

// ─── Greeting (mirrors Utils.java:getGreeting) ────────────────────────────────
export function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─── Firebase Announcement (new feature) ─────────────────────────────────────
// Reads from Firebase Realtime DB: /announcements/latest
// Shape: { message: string, badge: string, color: string, link?: string, dismissId: string }
export async function fetchAnnouncement(firebaseDbUrl) {
  try {
    const url = `${firebaseDbUrl}/announcements/latest.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchChangelog(firebaseDbUrl) {
  try {
    const url = `${firebaseDbUrl}/changelog.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json(); // { "v1.2": { date, items: [] }, ... }
  } catch {
    return null;
  }
}
