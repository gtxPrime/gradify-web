/**
 * app.js - Gradify Web Core Application Init
 * Handles: sidebar, theme, GSAP animations, nav setup, toast system
 */

import { getStorage, setStorage } from "./storage.js";
import { getUser, setupAuthListener, logout } from "./auth.js";

// ─── Global navigate helper ──────────────────────────────────────────────────
window.navigate = function (url) {
  window.location.href = url;
};

// ─── Toast System ────────────────────────────────────────────────────────────
window.showToast = function (message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = { success: "✅", error: "❌", info: "ℹ️", warn: "⚠️" };
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

// Theme toggle removed — app uses single fixed color scheme

// ─── Sidebar System ───────────────────────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");
  if (!sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (menuBtn) menuBtn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Swipe to open/close
  let touchStartX = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true },
  );
  document.addEventListener(
    "touchend",
    (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (touchStartX < 30 && diff > 70) openSidebar();
      if (diff < -70 && sidebar.classList.contains("open")) closeSidebar();
    },
    { passive: true },
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────
function hideLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add("done");
    setTimeout(() => loader.remove(), 500);
  }, 400);
}

// ─── User Info in Sidebar/Nav ─────────────────────────────────────────────────
function updateNavUser(user) {
  const name = document.getElementById("sidebarName");
  const email = document.getElementById("sidebarEmail");
  const sAvatar = document.getElementById("sidebarAvatar");
  const nAvatar = document.getElementById("navAvatar");
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutBtnText = document.getElementById("logoutBtnText");

  if (!user) {
    if (name) name.textContent = "Hello!";
    if (email) email.textContent = "Tap to login";
    const seed = getStorage("avatarSeed", "gradify-guest");
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/png?seed=${seed}&backgroundColor=DDE89D`;
    if (sAvatar) sAvatar.src = avatarUrl;
    if (nAvatar) nAvatar.src = avatarUrl;
    if (logoutBtnText) {
      logoutBtnText.textContent = "Login / Sign Up";
    }
    if (logoutBtn) {
      logoutBtn.onclick = () => navigate("profile.html");
    }
    return;
  }

  const displayName = user.displayName || "User";
  const words = displayName.split(" ");
  const firstName = words.length > 1 ? words[1] : words[0];

  if (name) name.textContent = firstName;
  if (email) email.textContent = user.email || "";

  const photoURL = user.photoURL
    ? user.photoURL.replace("=s96-c", "=s200")
    : `https://api.dicebear.com/7.x/notionists/png?seed=${displayName}&backgroundColor=DDE89D`;

  if (sAvatar) sAvatar.src = photoURL;
  if (nAvatar) nAvatar.src = photoURL;

  if (logoutBtnText) logoutBtnText.textContent = "Logout";
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await logout();
      navigate("profile.html");
    };
  }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
window.getGreeting = function () {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning!";
  if (h < 17) return "Good Afternoon!";
  if (h < 21) return "Good Evening!";
  return "Good Night!";
};

// ─── Force nav elements visible (safety net) ─────────────────────────────────
function forceNavVisible() {
  document.querySelectorAll(".nav-avatar, .nav-icon-btn").forEach((el) => {
    el.style.transform = "none";
    el.style.opacity = "1";
    el.style.visibility = "visible";
  });
}

// ─── GSAP Entrance Animations ────────────────────────────────────────────────
function initGSAPAnimations() {
  if (typeof gsap === "undefined") {
    forceNavVisible();
    return;
  }

  // Safety fallback: force nav elements visible after 2s no matter what
  setTimeout(forceNavVisible, 2000);

  try {
    if (typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  } catch (e) {
    console.warn("ScrollTrigger not available:", e);
  }

  try {
    // Stagger animate all cards on page
    gsap.from(".card, .dash-card", {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.07,
      ease: "power2.out",
      delay: 0.3,
      clearProps: "all",
    });

    // Animate greeting
    gsap.from(".greeting-section", {
      y: -20,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      delay: 0.1,
      clearProps: "all",
    });

    // Animate focus card
    gsap.from(".focus-card", {
      scaleY: 0.9,
      opacity: 0,
      duration: 0.5,
      ease: "back.out(1.4)",
      delay: 0.2,
      clearProps: "all",
    });
  } catch (e) {
    console.warn("GSAP card animation error:", e);
  }

  try {
    // Scroll-triggered animations for all cards present
    if (typeof ScrollTrigger !== "undefined") {
      gsap.utils
        .toArray(
          ".chart-card, .section-block, .stat-hero-card, .note-card, .subject-card, .question-card",
        )
        .forEach((el) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            y: 24,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
          });
        });
    }
  } catch (e) {
    console.warn("GSAP scroll animation error:", e);
  }

  try {
    // Bounce nav avatar
    gsap.from(".nav-avatar, .nav-icon-btn", {
      scale: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: "back.out(2)",
      delay: 0.15,
      clearProps: "all",
      onComplete: forceNavVisible,
    });
  } catch (e) {
    console.warn("GSAP nav animation error:", e);
    forceNavVisible();
  }

  // Float animation on FAB
  try {
    const fab = document.querySelector(".new-note-fab");
    if (fab) {
      gsap.from(fab, {
        scale: 0,
        duration: 0.5,
        ease: "back.out(2)",
        delay: 0.6,
      });
    }
  } catch (e) {
    console.warn("GSAP FAB animation error:", e);
  }
}

// ─── Sidebar Exam Countdown ───────────────────────────────────────────────────
async function initSidebarCountdown() {
  // Only run if the countdown block is present on this page
  const q1 = document.getElementById("q1Timer");
  const q2 = document.getElementById("q2Timer");
  const et = document.getElementById("etTimer");
  if (!q1 && !q2 && !et) return;

  async function refresh() {
    try {
      const { fetchDates, getCountdownText } = await import("./api.js");
      const dates = await fetchDates();
      if (q1) q1.textContent = getCountdownText(dates.quiz_1);
      if (q2) q2.textContent = getCountdownText(dates.quiz_2);
      if (et) et.textContent = getCountdownText(dates.end_term);
    } catch {
      if (q1) q1.textContent = "–";
      if (q2) q2.textContent = "–";
      if (et) et.textContent = "–";
    }
  }

  await refresh();
  setInterval(refresh, 60_000); // refresh every minute
}

// ─── Main init ────────────────────────────────────────────────────────────────
export async function initApp(page) {
  // Sidebar
  initSidebar();

  // Auth listener — also exposes user globally for profile.js
  setupAuthListener((user) => {
    window.__gradify_user = user;
    updateNavUser(user);
    document.dispatchEvent(
      new CustomEvent("gradify:authChanged", { detail: user }),
    );
  });

  // Run GSAP after DOM fully loaded
  window.addEventListener("load", () => {
    hideLoader();
    initGSAPAnimations();
    initSidebarCountdown(); // ← runs on every page that has the countdown HTML
  });

  return { page };
}
