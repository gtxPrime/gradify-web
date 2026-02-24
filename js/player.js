/**
 * player.js – YouTube-style lecture player
 * Notes: matches Android NoteEntity fields exactly
 * Chat: per-video, stored to IndexedDB via storage.js
 */

import { fetchLectureData } from "./api.js";
import { requireAuth } from "./auth.js";
import {
  getStorage,
  setStorage,
  saveTimeEntry,
  saveNote,
  getNotesByVideoId,
  deleteNote,
  saveChatMessage,
  getChatByVideoId,
} from "./storage.js";

// ─── URL params ───────────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const subjectName = params.get("subject") || "Unknown";
const jsonUrl = params.get("json") || "";
const targetVidId = params.get("vid") || "";
const targetTs = parseFloat(params.get("ts") || "0");

// ─── State ────────────────────────────────────────────────────────────────────
let lectureData = null;
let weekNames = [];
let currentWeekIdx = 0;
let currentVidIdx = 0;
let currentVideoId = ""; // YouTube video ID
let currentPosition = 0; // seconds, updated by position tracking
let sessionSec = 0;
let sessionInterval = null;
let tsLocked = false;
let lockedTs = 0;
let ytPlayer = null;
let positionInterval = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();

  // Set subject labels
  document.getElementById("navSubjectName").textContent = subjectName;
  document.getElementById("leftSubjectName").textContent = subjectName;

  // Restore position
  const saved = getStorage(`lecture_pos_${subjectName}`, {
    weekIdx: 0,
    vidIdx: 0,
  });
  currentWeekIdx = saved.weekIdx || 0;
  currentVidIdx = saved.vidIdx || 0;

  startSessionTimer();
  setupRightTabs();
  setupSymbolButtons();
  setupNoteActions();
  setupChatInput();

  try {
    lectureData = await fetchLectureData(jsonUrl);
    weekNames = Object.keys(lectureData.weeks || lectureData);
    buildVideoList();
    // Load YouTube IFrame API and init first video
    loadYouTubeAPI();
  } catch (e) {
    console.error(e);
    showToast("Failed to load lecture data", "error");
  }
});

// ─── Session timer ─────────────────────────────────────────────────────────────
function startSessionTimer() {
  const el = document.getElementById("sessionTimer");
  sessionInterval = setInterval(() => {
    sessionSec++;
    const m = String(Math.floor(sessionSec / 60)).padStart(2, "0");
    const s = String(sessionSec % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
  }, 1000);
}

window.addEventListener("beforeunload", () => {
  if (sessionSec > 10 && subjectName) {
    saveTimeEntry(subjectName, "lecture", sessionSec * 1000, Date.now());
  }
});

// ─── YouTube IFrame API ───────────────────────────────────────────────────────
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    initPlayer();
    return;
  }
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  initPlayer();
};

function initPlayer() {
  const weeks = lectureData.weeks || lectureData;
  const vid = getVideoItem(currentWeekIdx, currentVidIdx);
  if (!vid) {
    // Try first available
    if (weekNames.length) {
      currentWeekIdx = 0;
      currentVidIdx = 0;
      const fallback = getVideoItem(0, 0);
      if (!fallback) return;
    } else return;
  }

  const videoId = extractYtId((vid || getVideoItem(0, 0))?.link || "");
  currentVideoId = videoId;

  ytPlayer = new YT.Player("youtubeIframe", {
    videoId,
    width: "100%",
    height: "100%",
    playerVars: {
      start: targetTs || 0,
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      playsinline: 1,
      origin: location.origin,
    },
    events: {
      onReady: (e) => {
        updateCenterUI();
        if (targetTs > 0) e.target.seekTo(targetTs, true);
        e.target.playVideo();
        startPositionTracking();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) playNextVideo();
      },
    },
  });
}

function startPositionTracking() {
  if (positionInterval) clearInterval(positionInterval);
  positionInterval = setInterval(() => {
    if (ytPlayer && ytPlayer.getCurrentTime) {
      currentPosition = Math.floor(ytPlayer.getCurrentTime());
      // Update live timestamp button if not locked
      if (!tsLocked) {
        updateTimestampBtn(false);
      }
    }
  }, 1000);
}

// ─── Video list builder ───────────────────────────────────────────────────────
function buildVideoList() {
  const container = document.getElementById("videoListContainer");
  container.innerHTML = "";
  const weeks = lectureData.weeks || lectureData;
  let totalCount = 0;

  weekNames.forEach((weekName, wIdx) => {
    const videos = weeks[weekName];
    if (!Array.isArray(videos) || !videos.length) return;

    const header = document.createElement("div");
    header.className = "week-header";
    header.textContent = weekName;
    container.appendChild(header);

    videos.forEach((vid, vIdx) => {
      totalCount++;
      const ytId = extractYtId(vid.link || vid.url || "");
      const isPlaying = wIdx === currentWeekIdx && vIdx === currentVidIdx;

      const item = document.createElement("div");
      item.className = "video-item" + (isPlaying ? " playing" : "");
      item.dataset.w = wIdx;
      item.dataset.v = vIdx;
      item.innerHTML = `
        <img class="video-thumb" src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg"
             loading="lazy" alt="" onerror="this.style.background='var(--color-divider)'" />
        <div class="video-item-info">
          <div class="video-item-title">${vid.title || `Video ${vIdx + 1}`}</div>
          <div class="video-item-meta">${weekName} · #${vIdx + 1}</div>
        </div>
        <div class="video-playing-dot"></div>
      `;
      item.addEventListener("click", () => selectVideo(wIdx, vIdx));
      container.appendChild(item);
    });
  });

  document.getElementById("leftLecCount").textContent =
    `${totalCount} videos · ${weekNames.length} weeks`;

  // Load notes count for current video
  refreshNotesBadge();
  loadChatForCurrentVideo();
}

// ─── Select video ─────────────────────────────────────────────────────────────
function selectVideo(wIdx, vIdx) {
  savePositionToStorage();

  // Remove playing class from all
  document
    .querySelectorAll(".video-item")
    .forEach((el) => el.classList.remove("playing"));
  const newEl = document.querySelector(
    `.video-item[data-w="${wIdx}"][data-v="${vIdx}"]`,
  );
  if (newEl) newEl.classList.add("playing");

  currentWeekIdx = wIdx;
  currentVidIdx = vIdx;

  const vid = getVideoItem(wIdx, vIdx);
  if (!vid) return;

  const videoId = extractYtId(vid.link || vid.url || "");
  currentVideoId = videoId;

  // Reset timestamp lock
  tsLocked = false;
  lockedTs = 0;
  currentPosition = 0;
  updateTimestampBtn(false);

  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(videoId, 0);
  }

  updateCenterUI();
  savePositionToStorage();

  // Load notes and chat for new video
  loadNotesForCurrentVideo();
  loadChatForCurrentVideo();
  refreshNotesBadge();
}

function playNextVideo() {
  const weeks = lectureData.weeks || lectureData;
  const videos = weeks[weekNames[currentWeekIdx]];
  if (currentVidIdx + 1 < videos.length) {
    selectVideo(currentWeekIdx, currentVidIdx + 1);
  } else if (currentWeekIdx + 1 < weekNames.length) {
    selectVideo(currentWeekIdx + 1, 0);
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function updateCenterUI() {
  const vid = getVideoItem(currentWeekIdx, currentVidIdx);
  if (!vid) return;

  const title = vid.title || `Video ${currentVidIdx + 1}`;
  const weekName = weekNames[currentWeekIdx] || "–";
  const total = (lectureData.weeks || lectureData)[weekName]?.length || 0;

  document.getElementById("videoTitle").textContent = title;
  document.getElementById("navVideoTitle").textContent = title;
  document.getElementById("weekBadgeLabel").textContent = weekName;
  document.getElementById("vidPositionLabel").textContent =
    `Video ${currentVidIdx + 1} of ${total}`;
}

function getVideoItem(wIdx, vIdx) {
  const weeks = lectureData?.weeks || lectureData;
  if (!weeks) return null;
  const key = weekNames[wIdx];
  if (!key) return null;
  const videos = weeks[key];
  return Array.isArray(videos) ? videos[vIdx] || null : null;
}

function savePositionToStorage() {
  setStorage(`lecture_pos_${subjectName}`, {
    weekIdx: currentWeekIdx,
    vidIdx: currentVidIdx,
  });
}

function extractYtId(url) {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}

// ─── Right panel tabs ─────────────────────────────────────────────────────────
function setupRightTabs() {
  document.getElementById("rightTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".yt-tab");
    if (!tab) return;
    const name = tab.dataset.tab;

    document
      .querySelectorAll(".yt-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".yt-tab-panel")
      .forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    document
      .getElementById(`panel${name.charAt(0).toUpperCase() + name.slice(1)}`)
      .classList.add("active");

    if (name === "notes") loadNotesForCurrentVideo();
    if (name === "ai") loadChatForCurrentVideo();
  });
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function setupSymbolButtons() {
  document.getElementById("symbolsRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".sym-btn");
    if (!btn) return;
    const ta = document.getElementById("noteTextarea");
    const sym = btn.dataset.sym;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    ta.value = val.slice(0, start) + sym + val.slice(end);
    ta.setSelectionRange(start + sym.length, start + sym.length);
    ta.focus();
  });
}

function updateTimestampBtn(locked) {
  const btn = document.getElementById("timestampBtn");
  const label = document.getElementById("timestampLabel");
  const ts = locked ? lockedTs : currentPosition;
  const m = String(Math.floor(ts / 60)).padStart(2, "0");
  const s = String(ts % 60).padStart(2, "0");

  if (locked) {
    btn.classList.add("locked");
    label.textContent = `${m}:${s} ✓`;
  } else {
    btn.classList.remove("locked");
    label.textContent = currentPosition > 0 ? `${m}:${s}` : "Link time";
  }
}

function setupNoteActions() {
  // Timestamp lock toggle
  document.getElementById("timestampBtn").addEventListener("click", () => {
    tsLocked = !tsLocked;
    if (tsLocked) {
      lockedTs = currentPosition;
    }
    updateTimestampBtn(tsLocked);
  });

  // Save note
  document.getElementById("saveNoteBtn").addEventListener("click", () => {
    const content = document.getElementById("noteTextarea").value.trim();
    if (!content) {
      showToast("Write something first", "warning");
      return;
    }

    const isImportant = document.getElementById("importantCheck").checked;
    const ts = tsLocked ? lockedTs : currentPosition;
    const vid = getVideoItem(currentWeekIdx, currentVidIdx);
    const weekName = weekNames[currentWeekIdx] || "Unknown";

    // Match Android NoteEntity exactly
    const note = {
      subject: subjectName,
      content,
      videoId: currentVideoId,
      timestamp: ts, // seconds (video position)
      isImportant,
      videoTitle: vid?.title || "Unknown",
      weekName,
      weekIndex: currentWeekIdx,
      videoIndex: currentVidIdx,
      createdAt: Date.now(),
    };

    saveNote(note).then(() => {
      showToast("Note saved ✓", "success");
      // Reset form
      document.getElementById("noteTextarea").value = "";
      document.getElementById("importantCheck").checked = false;
      tsLocked = false;
      lockedTs = 0;
      updateTimestampBtn(false);
      loadNotesForCurrentVideo();
    });
  });
}

async function loadNotesForCurrentVideo() {
  const list = document.getElementById("savedNotesList");
  const label = document.getElementById("notesListLabel");
  const notes = await getNotesByVideoId(currentVideoId);

  // Update badge
  const badge = document.getElementById("notesBadge");
  if (notes.length > 0) {
    badge.textContent = notes.length;
    badge.style.display = "flex";
    label.style.display = "block";
  } else {
    badge.style.display = "none";
    label.style.display = "none";
  }

  if (!notes.length) {
    list.innerHTML =
      '<div style="font-size:12px;opacity:0.45;text-align:center;padding:8px">No notes for this video yet.</div>';
    return;
  }

  list.innerHTML = "";
  notes
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((note) => {
      const div = document.createElement("div");
      div.className = "saved-note" + (note.isImportant ? " important" : "");
      const m = String(Math.floor(note.timestamp / 60)).padStart(2, "0");
      const s = String(note.timestamp % 60).padStart(2, "0");
      div.innerHTML = `
      <div class="saved-note-text">${escapeHtml(note.content)}</div>
      <div class="saved-note-footer">
        <span class="saved-note-ts-badge" title="Seek to ${m}:${s}">⏱ ${m}:${s}</span>
        ${note.isImportant ? '<span style="font-size:11px">⭐</span>' : ""}
        <button class="saved-note-delete" title="Delete">🗑</button>
      </div>
    `;
      // Click timestamp → seek player
      div
        .querySelector(".saved-note-ts-badge")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          if (ytPlayer && ytPlayer.seekTo)
            ytPlayer.seekTo(note.timestamp, true);
          showToast(`Seeking to ${m}:${s}`, "info");
        });
      // Delete
      div.querySelector(".saved-note-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteNote(note.id).then(() => loadNotesForCurrentVideo());
      });
      list.appendChild(div);
    });
}

async function refreshNotesBadge() {
  if (!currentVideoId) return;
  const notes = await getNotesByVideoId(currentVideoId);
  const badge = document.getElementById("notesBadge");
  if (notes.length > 0) {
    badge.textContent = notes.length;
    badge.style.display = "flex";
  } else badge.style.display = "none";
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
const GEMINI_ENDPOINT = (key, model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

function setupChatInput() {
  // Chip buttons
  document.getElementById("chatChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chat-chip");
    if (!chip) return;
    sendChatMessage(chip.dataset.msg);
  });

  // Send button & Enter key
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const doSend = () => {
    const msg = input.value.trim();
    if (msg) {
      sendChatMessage(msg);
      input.value = "";
    }
  };
  sendBtn.addEventListener("click", doSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSend();
  });
}

async function loadChatForCurrentVideo() {
  const wrap = document.getElementById("chatMessages");
  wrap.innerHTML = "";

  const apiKey = getStorage("geminiApiKey", "");
  if (!apiKey) {
    document.getElementById("noApiKeyMsg").style.display = "block";
    document.getElementById("chatSendBtn").disabled = true;
  } else {
    document.getElementById("noApiKeyMsg").style.display = "none";
    document.getElementById("chatSendBtn").disabled = false;
  }

  if (!currentVideoId) return;
  const history = await getChatByVideoId(currentVideoId);

  history.forEach((msg) => {
    // Map Android fields: messageText + isUserMessage → display
    appendChatBubble(msg.isUserMessage ? "user" : "ai", msg.messageText, false);
  });
  scrollChatToBottom();

  // Update badge
  const badge = document.getElementById("chatBadge");
  const userCount = history.filter((m) => m.isUserMessage).length;
  if (userCount > 0) {
    badge.textContent = userCount;
    badge.style.display = "flex";
  } else badge.style.display = "none";
}

async function sendChatMessage(text) {
  const apiKey = getStorage("geminiApiKey", "");
  if (!apiKey) {
    showToast("Add Gemini API key in Settings", "warning");
    return;
  }
  if (!text.trim()) return;

  const vid = getVideoItem(currentWeekIdx, currentVidIdx);

  // Save user message — matches Android ChatMessageEntity
  await saveChatMessage(currentVideoId, text, true, Date.now());
  appendChatBubble("user", text, true);
  scrollChatToBottom();

  // Badge
  const badge = document.getElementById("chatBadge");
  badge.textContent = (parseInt(badge.textContent) || 0) + 1;
  badge.style.display = "flex";

  // Typing indicator
  const typingEl = appendChatBubble("ai", "Thinking…", false, true);
  document.getElementById("chatSendBtn").disabled = true;

  try {
    const sendWholeHistory = getStorage("SendWholeHistory", false) === true;
    const messageHistoryCount = Number(getStorage("MessageHistoryCount", 3));
    const useCaptions = getStorage("useCaptionsContext", true);

    // Build conversation history for Gemini
    const allHistory = await getChatByVideoId(currentVideoId);
    const apiHistory = [];

    if (sendWholeHistory) {
      allHistory.forEach((m) => {
        apiHistory.push({
          role: m.isUserMessage ? "user" : "model",
          parts: [{ text: m.messageText }],
        });
      });
    } else {
      let userCount = 0;
      let modelCount = 0;
      for (let i = allHistory.length - 1; i >= 0; i--) {
        const m = allHistory[i];
        if (m.isUserMessage) {
          if (userCount < messageHistoryCount) {
            apiHistory.unshift({
              role: "user",
              parts: [{ text: m.messageText }],
            });
            userCount++;
          }
        } else {
          if (modelCount < messageHistoryCount) {
            apiHistory.unshift({
              role: "model",
              parts: [{ text: m.messageText }],
            });
            modelCount++;
          }
        }
      }
    }

    const contents = [...apiHistory];

    if (useCaptions) {
      const fetchMsgEl = appendChatBubble(
        "ai",
        "[DEV] Initializing YoutubeTranscript...",
        false,
        true,
      );

      const transcript = await extractYouTubeCaptions(
        currentVideoId,
        (logMsg) => {
          fetchMsgEl.innerHTML += "<br/>" + escapeHtml(logMsg);
          scrollChatToBottom();
        },
      );

      if (transcript) {
        fetchMsgEl.innerHTML += "<br/>[DEV] Proceeding to Gemini AI...";
        scrollChatToBottom();

        contents.push({
          role: "user",
          parts: [
            {
              text: `Video Transcript Context: ${transcript}\n\nAnswer this using the transcript context only: ${text}`,
            },
          ],
        });

        // Remove the dev log after a small delay so it doesn't clutter forever,
        // or just let it be immediately replaced by the server response.
        fetchMsgEl.remove();
      } else {
        fetchMsgEl.innerHTML +=
          "<br/><span style='color:var(--color-error)'>[DEV] Captions failed, falling back to URL</span>";
        scrollChatToBottom();
        contents.push({
          role: "user",
          parts: [
            { text: `Answer this using the video context only: ${text}` },
            { file_data: { file_uri: vid?.link || "" } },
          ],
        });
        setTimeout(() => fetchMsgEl.remove(), 2500);
      }
    } else {
      // Add current user prompt using REST API format for YouTube URLs
      contents.push({
        role: "user",
        parts: [
          { text: `Answer this using the video context only: ${text}` },
          { file_data: { file_uri: vid?.link || "" } },
        ],
      });
    }

    const selectedModel = getStorage("geminiModel", "gemini-2.5-flash");
    const res = await fetch(GEMINI_ENDPOINT(apiKey, selectedModel), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

    // Remove typing indicator
    typingEl.remove();

    // Save AI reply — matches Android ChatMessageEntity
    await saveChatMessage(currentVideoId, reply, false, Date.now());
    appendChatBubble("ai", reply, true);
    scrollChatToBottom();
  } catch (err) {
    typingEl.remove();
    appendChatBubble(
      "ai",
      `Error: ${err.message}. Check your API key in Settings.`,
      true,
    );
    scrollChatToBottom();
  }

  document.getElementById("chatSendBtn").disabled = false;
}

function appendChatBubble(role, text, animate = false, isTyping = false) {
  const wrap = document.getElementById("chatMessages");
  const el = document.createElement("div");
  el.className = `chat-msg ${role === "user" ? "user" : "ai"}${isTyping ? " typing" : ""}`;
  el.textContent = text;
  if (animate) el.style.opacity = "0";
  wrap.appendChild(el);
  if (animate) {
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "1";
    });
  }
  return el;
}

function scrollChatToBottom() {
  const wrap = document.getElementById("chatMessages");
  setTimeout(() => {
    wrap.scrollTop = wrap.scrollHeight;
  }, 50);
}

// ─── Utility ──────────────────────────────────────────────────────────────────
async function extractYouTubeCaptions(videoId, onLog = () => {}) {
  try {
    onLog(`[DEV] Fetching via allorigins proxy...`);
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`,
    );
    const data = await res.json();
    const html = data.contents;

    onLog(`[DEV] Parsing player response...`);
    // Match player response string
    const match = html.match(/"captions":({.*?}),"videoDetails"/);
    if (!match) throw new Error("Captions not found in HTML");

    const captionsData = JSON.parse(match[1]);
    const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0)
      throw new Error("No caption tracks available");

    // Prefer English
    let track =
      tracks.find((t) => t.languageCode.startsWith("en")) || tracks[0];

    onLog(`[DEV] Fetching XML track...`);
    const xmlRes = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(track.baseUrl)}`,
    );
    const xmlData = await xmlRes.json();
    const xmlResult = xmlData.contents;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResult, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");

    if (!textNodes || textNodes.length === 0)
      throw new Error("Could not parse XML");

    let transcript = "";
    for (let i = 0; i < textNodes.length; i++) {
      transcript += textNodes[i].textContent + " ";
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = transcript;

    const finalTranscript = tempDiv.textContent || tempDiv.innerText || "";

    onLog(`[DEV] Extracted ${finalTranscript.length} characters.`);
    return finalTranscript;
  } catch (err) {
    onLog(`[DEV] Error: ${err.message}`);
    console.error("Caption extraction error:", err);
    return null;
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// showToast imported from app.js via initApp — fall back if not ready
function showToast(msg, type = "info") {
  if (window._gradifyToast) {
    window._gradifyToast(msg, type);
    return;
  }
  console.log(`[${type}] ${msg}`);
}
