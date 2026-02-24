/**
 * notifications.js – Announcements & Changelog from Firebase Realtime DB
 *
 * Firebase DB structure expected:
 *
 * /announcements/latest: {
 *   message: "New PYQs for CT added!",
 *   badge: "New",           // optional label on pill
 *   color: "#DDE89D",       // optional accent color
 *   link: "pyq.html",       // optional tap action
 *   dismissId: "ann_2026_02_23",  // unique ID to track dismissal
 *   enabled: true
 * }
 *
 * /changelog: {
 *   "v1.2.0": { date: "2026-02-23", items: ["Added PYQ encryption", "Bug fixes"] },
 *   "v1.1.0": { date: "2026-02-10", items: ["Initial web launch"] }
 * }
 */

import { getStorage, setStorage } from "./storage.js";

// Set this in settings.js or hard-code (structure: https://PROJECT.firebaseio.com)
function getDbUrl() {
  return getStorage("firebaseDbUrl", "");
}

// ─── Load & render announcement banner ───────────────────────────────────────
export async function initAnnouncementBanner() {
  const banner = document.getElementById("announcementBanner");
  const msgEl = document.getElementById("announcementMsg");
  const badgeEl = document.getElementById("announcementBadge");
  const linkEl = document.getElementById("announcementLink");
  const closeEl = document.getElementById("announcementClose");
  if (!banner || !msgEl) return;

  const dbUrl = getDbUrl();
  if (!dbUrl) return;

  try {
    const res = await fetch(`${dbUrl}/announcements/latest.json`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.enabled || !data.message) return;

    // Check if already dismissed
    const dismissed = getStorage("dismissedAnnouncements", []);
    if (data.dismissId && dismissed.includes(data.dismissId)) return;

    // Render
    msgEl.textContent = data.message;
    if (badgeEl && data.badge) {
      badgeEl.textContent = data.badge;
      badgeEl.style.display = "";
    }
    if (data.color) banner.style.setProperty("--banner-color", data.color);
    if (linkEl && data.link) {
      linkEl.href = data.link;
      linkEl.style.display = "";
    }

    banner.style.display = "flex";

    if (typeof gsap !== "undefined") {
      gsap.from(banner, {
        y: -40,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.4)",
        delay: 0.8,
      });
    }

    // Close button
    if (closeEl) {
      closeEl.addEventListener("click", () => {
        if (typeof gsap !== "undefined") {
          gsap.to(banner, {
            y: -40,
            opacity: 0,
            duration: 0.3,
            onComplete: () => banner.remove(),
          });
        } else {
          banner.remove();
        }
        if (data.dismissId) {
          const list = getStorage("dismissedAnnouncements", []);
          list.push(data.dismissId);
          setStorage("dismissedAnnouncements", list.slice(-20)); // keep last 20
        }
      });
    }
  } catch (e) {
    console.warn("Announcement fetch failed:", e);
  }
}

// ─── Load & render changelog modal ───────────────────────────────────────────
export async function initChangelog() {
  const btn = document.getElementById("changelogBtn");
  const modal = document.getElementById("changelogModal");
  const list = document.getElementById("changelogList");
  const close = document.getElementById("changelogClose");
  if (!btn || !modal || !list) return;

  // Indicate new version badge
  const lastSeen = getStorage("lastSeenVersion", "");
  const CURRENT_VER = "1.0.0";
  if (lastSeen !== CURRENT_VER) {
    btn.classList.add("has-badge");
  }

  btn.addEventListener("click", async () => {
    setStorage("lastSeenVersion", CURRENT_VER);
    btn.classList.remove("has-badge");

    if (list.children.length === 0) {
      // Lazy load from Firebase
      const dbUrl = getDbUrl();
      let changelog = null;

      if (dbUrl) {
        try {
          const res = await fetch(`${dbUrl}/changelog.json`);
          if (res.ok) changelog = await res.json();
        } catch {}
      }

      // Fallback built-in changelog
      if (!changelog) {
        changelog = {
          "v1.0.0": {
            date: "2026-02-23",
            items: [
              "Initial web launch of Gradify",
              "Dashboard with exam countdown & study time",
              "Lectures with YouTube player, AI chat, and notes",
              "PYQ practice with exam mode and timer",
              "Study stats with Chart.js and activity heatmap",
              "Offline-first: IndexedDB for notes, time tracking, chat history",
            ],
          },
        };
      }

      const entries = Object.entries(changelog).sort((a, b) =>
        b[0].localeCompare(a[0]),
      );
      entries.forEach(([version, entry]) => {
        const section = document.createElement("div");
        section.className = "changelog-section";
        section.innerHTML = `
          <div class="changelog-version">
            <span class="version-tag">${version}</span>
            <span class="version-date">${entry.date || ""}</span>
          </div>
          <ul class="changelog-items">
            ${(entry.items || []).map((i) => `<li>${i}</li>`).join("")}
          </ul>
        `;
        list.appendChild(section);
      });
    }

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    if (typeof gsap !== "undefined") {
      gsap.from(".changelog-modal-inner", {
        y: 60,
        opacity: 0,
        duration: 0.4,
        ease: "power3.out",
      });
    }
  });

  const closeModal = () => {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  };
  if (close) close.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}
