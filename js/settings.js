/**
 * settings.js – Settings page logic
 */
import {
  getStorage,
  setStorage,
  getStorageSize,
  clearAllStorage,
  clearAllDB,
  exportAllNotes,
} from "./storage.js";
import {
  triggerSync,
  loadSettingsFromServer,
  applySettings,
  syncSettingsToServer,
  compileSettings,
} from "./auth.js";

window.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  setupHandlers();

  const sz = document.getElementById("cacheSize");
  if (sz) sz.textContent = `Cache: ${getStorageSize()}`;

  const key = getStorage("geminiApiKey", "");
  const keyStatus = document.getElementById("apiKeyStatus");
  if (keyStatus)
    keyStatus.textContent = key
      ? "✅ API key configured"
      : "Not configured – tap to add";
});

const SETTINGS_KEYS = {
  studyTimer: {
    id: "studyTimerToggle",
    key: "studyTimer",
    map: (v) => v,
    rmap: (v) => v ?? true,
  },
  autoSave: {
    id: "autoSaveToggle",
    key: "autoSaveNotes",
    map: (v) => v,
    rmap: (v) => v ?? true,
  },
  autoPlay: {
    id: "autoPlayToggle",
    key: "autoPlayNext",
    map: (v) => v,
    rmap: (v) => v ?? true,
  },
  resumeLec: {
    id: "resumeToggle",
    key: "resumeLectures",
    map: (v) => v,
    rmap: (v) => v ?? true,
  },
  sendWholeHistory: {
    id: "sendWholeHistoryToggle",
    key: "SendWholeHistory",
    map: (v) => v,
    rmap: (v) => v ?? false,
  },
  useCaptions: {
    id: "useCaptionsToggle",
    key: "useCaptionsContext",
    map: (v) => v,
    rmap: (v) => v ?? true,
  },
  syncMode: {
    id: "cloudSyncToggle",
    key: "syncMode",
    map: (v) => (v ? "server" : "local"),
    rmap: (v) => v === "server",
  },
};

function loadSettings() {
  Object.values(SETTINGS_KEYS).forEach(({ id, key, rmap }) => {
    const el = document.getElementById(id);
    if (el) el.checked = rmap(getStorage(key, null));
  });

  const historySlider = document.getElementById("messageHistorySlider");
  const historyValue = document.getElementById("messageHistoryValue");
  const wholeHistoryBtn = document.getElementById("sendWholeHistoryToggle");

  if (historySlider && historyValue) {
    const count = getStorage("MessageHistoryCount", 3);
    historySlider.value = count;
    historyValue.textContent = count;

    if (wholeHistoryBtn?.checked) {
      historySlider.disabled = true;
      historyValue.style.opacity = "0.5";
    }
  }
}

function setupHandlers() {
  // Auto-save all toggles
  Object.values(SETTINGS_KEYS).forEach(({ id, key, map }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      const val = map(el.checked);
      setStorage(key, val);
      // Apply dark mode immediately
      if (id === "darkModeToggle") {
        document.documentElement.setAttribute("data-theme", val);
        const icon = document.getElementById("themeIcon");
        if (icon) icon.textContent = val === "dark" ? "☀️" : "🌙";
      }

      // Handle slider disability for whole history toggle
      if (id === "sendWholeHistoryToggle") {
        const historySlider = document.getElementById("messageHistorySlider");
        const historyValue = document.getElementById("messageHistoryValue");
        if (historySlider && historyValue) {
          if (val) {
            historySlider.disabled = true;
            historyValue.style.opacity = "0.5";
          } else {
            historySlider.disabled = false;
            historyValue.style.opacity = "1";
          }
        }
      }

      showToast("Saved ✅", "success");
      triggerSync();
    });
  });

  // AI Model Select
  const aiModelSelect = document.getElementById("aiModelSelect");
  if (aiModelSelect) {
    aiModelSelect.value = getStorage("geminiModel", "gemini-2.5-flash");
    aiModelSelect.addEventListener("change", (e) => {
      setStorage("geminiModel", e.target.value);
      showToast("Model updated ✅", "success");
      triggerSync();
    });
  }

  // Message History Slider
  const historySlider = document.getElementById("messageHistorySlider");
  const historyValue = document.getElementById("messageHistoryValue");
  const wholeHistoryBtn = document.getElementById("sendWholeHistoryToggle");

  if (historySlider && historyValue) {
    historySlider.addEventListener("input", (e) => {
      const val = e.target.value;
      historyValue.textContent = val;
    });

    historySlider.addEventListener("change", (e) => {
      const val = parseInt(e.target.value, 10);
      setStorage("MessageHistoryCount", val);
      if (wholeHistoryBtn && wholeHistoryBtn.checked) {
        wholeHistoryBtn.checked = false;
        setStorage("SendWholeHistory", false);
        historySlider.disabled = false;
        historyValue.style.opacity = "1";
      }
      showToast("Saved ✅", "success");
      triggerSync();
    });
  }

  // Cloud Sync
  const syncToggle = document.getElementById("cloudSyncToggle");
  if (syncToggle) {
    // If the toggle is toggled MANUALLY by user
    syncToggle.addEventListener("change", async (e) => {
      const isServer = e.target.checked;
      setStorage("syncMode", isServer ? "server" : "local");

      if (isServer) {
        showToast("Fetching cloud settings...");
        const serverSettings = await loadSettingsFromServer();

        if (serverSettings && Object.keys(serverSettings).length > 0) {
          applySettings(serverSettings);
          showToast("Settings synced from cloud! Refreshing...", "success");
          setTimeout(() => location.reload(), 1500);
        } else {
          // No settings on server yet, but we want cloud sync
          // Let's push our current local settings to become the baseline
          await syncSettingsToServer(compileSettings());
          showToast("Settings backed up to cloud!", "success");
        }
      } else {
        showToast("Cloud sync disabled (local only)", "info");
      }
    });
  }

  // Clear cache
  document.getElementById("clearCacheRow")?.addEventListener("click", () => {
    if (!confirm("Clear all cached lecture and quiz data?")) return;
    sessionStorage.clear();
    const sz = document.getElementById("cacheSize");
    if (sz) sz.textContent = "Cache cleared";
    showToast("Cache cleared", "info");
  });

  // Export notes
  document
    .getElementById("exportDataRow")
    ?.addEventListener("click", async () => {
      try {
        await exportAllNotes();
        showToast("Notes exported", "success");
      } catch (e) {
        showToast("Export failed: " + e.message, "error");
      }
    });

  // Import notes
  document.getElementById("importDataRow")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const { importNotes } = await import("./storage.js");
      const count = await importNotes(text);
      showToast(`Imported ${count} notes ✅`, "success");
    };
    input.click();
  });

  // API key row
  document.getElementById("apiKeyRow")?.addEventListener("click", () => {
    const section = document.getElementById("apiKeySection");
    if (section)
      section.style.display =
        section.style.display === "none" ? "block" : "none";
  });

  document.getElementById("saveApiKeyBtn")?.addEventListener("click", () => {
    const val = document.getElementById("apiKeyInput").value.trim();
    if (!val) return;
    setStorage("geminiApiKey", val);
    const keyStatus = document.getElementById("apiKeyStatus");
    if (keyStatus) keyStatus.textContent = "✅ API key configured";
    document.getElementById("apiKeySection").style.display = "none";
    showToast("API key saved ✅", "success");
    triggerSync();
  });
}
