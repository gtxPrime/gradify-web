/**
 * auth.js - Firebase Authentication for Gradify Web
 * Handles: Google Sign-In, Anonymous login, logout, auth state
 */

// ─── Production mode ─────────────────────────────────────────────────────────

import { getStorage, setStorage } from "./storage.js";

// Firebase SDK URLs — only fetched when DEV_MODE = false
const FB_APP_URL = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
const FB_AUTH_URL =
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── Firebase config (loaded from storage or env) ────────────────────────────
// The config is stored in localStorage after first setup, or can be embedded
// for production. This approach avoids committing secrets to git.
const DEFAULT_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

function getFirebaseConfig() {
  const saved = getStorage("firebaseConfig", null);
  return saved || DEFAULT_CONFIG;
}

let _app = null;
let _auth = null;
// Lazily loaded Firebase functions (populated on first getFirebase() call)
let _initializeApp,
  _getApps,
  _getAuth,
  _signInWithPopup,
  _GoogleAuthProvider,
  _onAuthStateChanged,
  _signOut;

async function getFirebase() {
  if (_auth) return { app: _app, auth: _auth };

  // Dynamically import Firebase only when needed (skipped in DEV_MODE)
  const [appMod, authMod] = await Promise.all([
    import(FB_APP_URL),
    import(FB_AUTH_URL),
  ]);
  _initializeApp = appMod.initializeApp;
  _getApps = appMod.getApps;
  _getAuth = authMod.getAuth;
  _signInWithPopup = authMod.signInWithPopup;
  _GoogleAuthProvider = authMod.GoogleAuthProvider;
  _onAuthStateChanged = authMod.onAuthStateChanged;
  _signOut = authMod.signOut;

  const config = getFirebaseConfig();
  _app = _getApps().length ? _getApps()[0] : _initializeApp(config);
  _auth = _getAuth(_app);
  return { app: _app, auth: _auth };
}

// ─── Auth State Listener ──────────────────────────────────────────────────────
export async function setupAuthListener(callback) {
  try {
    const { auth } = await getFirebase();
    return _onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        setStorage("avatarSeed", user.displayName || user.email || "user");
      }
      callback(user);
    });
  } catch (e) {
    console.warn("Firebase auth not configured:", e.message);
    callback(null);
    return () => {};
  }
}

// ─── Get current user ─────────────────────────────────────────────────────────
export function getUser() {
  try {
    return _auth?.currentUser ?? null;
  } catch {
    return null;
  }
}

// ─── Allowed student email domains ──────────────────────────────────────────
const STUDENT_DOMAINS = ["ds.study.iitm.ac.in", "study.iitm.ac.in"];

export function isStudentEmail(email) {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return STUDENT_DOMAINS.includes(domain);
}

// ─── Google Sign-In (student email only) ─────────────────────────────────────
export async function loginWithGoogle() {
  const { auth } = await getFirebase();
  const provider = new _GoogleAuthProvider();
  provider.setCustomParameters({ hd: "ds.study.iitm.ac.in" });
  provider.addScope("email");
  provider.addScope("profile");
  try {
    const result = await _signInWithPopup(auth, provider);
    const user = result.user;
    if (user.email && !isStudentEmail(user.email)) {
      await _signOut(auth);
      throw Object.assign(
        new Error(
          "Only IITM student emails (@ds.study.iitm.ac.in) are allowed.",
        ),
        { code: "auth/domain-not-allowed" },
      );
    }
    return user;
  } catch (e) {
    if (e.code !== "auth/popup-closed-by-user") throw e;
    return null;
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout() {
  try {
    const { auth } = await getFirebase();
    await _signOut(auth);
  } catch (e) {
    console.warn("Logout error:", e);
  }
}

// ─── Profile Page Init ────────────────────────────────────────────────────────
// This function is called when profile.html loads
async function initProfilePage() {
  const FOUNDATION_SUBJECTS = [
    "CT",
    "English 1",
    "English 2",
    "Maths 1",
    "Maths 2",
    "Python",
    "Stats 1",
    "Stats 2",
  ];
  const DIPLOMA_SUBJECTS = [
    "Business Analytics",
    "BDM",
    "DBMS",
    "Java",
    "MAD 1",
    "MAD 2",
    "MLF",
    "MLP",
    "MLT",
    "PDSA",
    "System Commands",
  ];

  const loggedOut = document.getElementById("loggedOutView");
  const loggedIn = document.getElementById("loggedInView");
  const googleBtn = document.getElementById("googleSignInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const saveSubBtn = document.getElementById("saveSubjectsBtn");
  const clearData = document.getElementById("clearDataBtn");

  function buildSubjectPills(containerId, subjects) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const saved = getStorage("mySubjects", []);
    subjects.forEach((sub) => {
      const pill = document.createElement("div");
      pill.className =
        "subject-pill" + (saved.includes(sub) ? " selected" : "");
      pill.textContent = sub;
      pill.addEventListener("click", () => pill.classList.toggle("selected"));
      container.appendChild(pill);
    });
  }

  function showLoggedIn(user) {
    if (loggedOut) loggedOut.style.display = "none";
    if (loggedIn) loggedIn.style.display = "block";

    const name = user.displayName || "User";
    const email = user.email || "–";

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmailDisplay").textContent = email;
    document.getElementById("profileUid").textContent = user.uid;
    document.getElementById("profileAvatar").src = user.photoURL
      ? user.photoURL.replace("=s96-c", "=s200")
      : `https://api.dicebear.com/7.x/notionists/png?seed=${name}&backgroundColor=DDE89D`;

    document.getElementById("accName").textContent = name;
    document.getElementById("accEmail").textContent = email;
    document.getElementById("accProvider").textContent =
      user.providerData?.[0]?.providerId || "google.com";
    const accJoined = document.getElementById("accJoined");
    if (accJoined) {
      accJoined.textContent = user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN")
        : "–";
    }

    // Build subject pills if not already built
    const fs = document.getElementById("foundationSubjects");
    if (fs && fs.children.length === 0) {
      buildSubjectPills("foundationSubjects", FOUNDATION_SUBJECTS);
      buildSubjectPills("diplomaSubjects", DIPLOMA_SUBJECTS);
    }
  }

  function showLoggedOut() {
    if (loggedOut) loggedOut.style.display = "block";
    if (loggedIn) loggedIn.style.display = "none";
  }

  setupAuthListener((user) => {
    if (user) showLoggedIn(user);
    else showLoggedOut();
  });

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        googleBtn.disabled = true;
        googleBtn.textContent = "Signing in…";
        await loginWithGoogle();
        showToast("Signed in with Google!", "success");
      } catch (e) {
        showToast("Sign-in failed: " + e.message, "error");
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google`;
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await logout();
      showToast("Signed out", "info");
    });
  }

  if (saveSubBtn) {
    saveSubBtn.addEventListener("click", () => {
      const selected = [
        ...document.querySelectorAll(".subject-pill.selected"),
      ].map((p) => p.textContent);
      setStorage("mySubjects", selected);
      showToast(`Saved ${selected.length} subjects ✅`, "success");
    });
  }

  if (clearData) {
    clearData.addEventListener("click", () => {
      if (
        !confirm(
          "Clear ALL local notes, time tracking, and chat data? This cannot be undone!",
        )
      )
        return;
      import("./storage.js").then((s) => {
        s.clearAllStorage();
        s.clearAllDB();
        showToast("All local data cleared", "info");
      });
    });
  }
}

// Auto-run profile page init if on profile.html
if (window.location.pathname.includes("profile")) {
  window.addEventListener("DOMContentLoaded", initProfilePage);
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
/**
 * requireAuth() — call at the top of a protected page's DOMContentLoaded.
 * Resolves with the signed-in user, or redirects to profile.html?next=<current>.
 * Anonymous users are treated as NOT logged in.
 *
 * @returns {Promise<import("firebase/auth").User>}
 */
export function requireAuth() {
  return new Promise(async (resolve) => {
    try {
      const { auth } = await getFirebase();
      const unsub = _onAuthStateChanged(auth, (user) => {
        unsub();
        if (user && !user.isAnonymous) {
          resolve(user);
        } else {
          const next = encodeURIComponent(location.pathname + location.search);
          location.href = `profile.html?next=${next}`;
        }
      });
    } catch {
      location.href = "profile.html";
    }
  });
}

// ─── Server-side settings sync ────────────────────────────────────────────────
const API_BASE = "/api"; // relative path on shared hosting

export async function syncSettingsToServer(settings) {
  const syncMode = getStorage("syncMode", "local");
  if (syncMode !== "server") return;

  const user = getUser();
  if (!user || user.isAnonymous) return;

  try {
    const { auth } = await getFirebase();
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/sync-settings.php`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.warn("Settings sync failed:", err.error);
    }
  } catch (e) {
    console.warn("Settings sync error:", e.message);
  }
}

export async function loadSettingsFromServer() {
  const syncMode = getStorage("syncMode", "local");
  if (syncMode !== "server") return null;

  const user = getUser();
  if (!user || user.isAnonymous) return null;

  try {
    const { auth } = await getFirebase();
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/get-settings.php`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || null;
  } catch {
    return null;
  }
}

export function compileSettings() {
  return {
    syncMode: getStorage("syncMode", "local"),
    theme: getStorage("theme", "light"),
    selectedSubjects: getStorage("selectedSubjects", "[]"),
    studyTimer: getStorage("studyTimer", true),
    autoSaveNotes: getStorage("autoSaveNotes", true),
    autoPlayNext: getStorage("autoPlayNext", true),
    resumeLectures: getStorage("resumeLectures", true),
    aiChatHistory: getStorage("MessageHistoryCount", 3),
    avatarSeed: getStorage("avatarSeed", "gradify-guest"),
    geminiApiKey: getStorage("geminiApiKey", ""),
    geminiModel: getStorage("geminiModel", "gemini-2.5-flash"),
  };
}

export function applySettings(settings) {
  if (!settings) return;
  if (settings.syncMode !== undefined)
    setStorage("syncMode", settings.syncMode);
  if (settings.theme !== undefined) setStorage("theme", settings.theme);
  if (settings.selectedSubjects !== undefined)
    setStorage("selectedSubjects", settings.selectedSubjects);
  if (settings.studyTimer !== undefined)
    setStorage("studyTimer", settings.studyTimer);
  if (settings.autoSaveNotes !== undefined)
    setStorage("autoSaveNotes", settings.autoSaveNotes);
  if (settings.autoPlayNext !== undefined)
    setStorage("autoPlayNext", settings.autoPlayNext);
  if (settings.resumeLectures !== undefined)
    setStorage("resumeLectures", settings.resumeLectures);
  if (settings.aiChatHistory !== undefined)
    setStorage("MessageHistoryCount", settings.aiChatHistory);
  if (settings.avatarSeed !== undefined)
    setStorage("avatarSeed", settings.avatarSeed);
  if (settings.geminiApiKey !== undefined)
    setStorage("geminiApiKey", settings.geminiApiKey);
  if (settings.geminiModel !== undefined)
    setStorage("geminiModel", settings.geminiModel);
}

let syncTimeout = null;
export function triggerSync() {
  const syncMode = getStorage("syncMode", "local");
  if (syncMode !== "server") return;

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncSettingsToServer(compileSettings());
  }, 2000);
}
