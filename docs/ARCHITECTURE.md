# 🏛️ Gradify Web Architecture & Code Structure

Welcome to the architectural overview of **Gradify Web**. This document outlines how the web codebase is structured, the design patterns used, and the integration of various services.

---

## 🏗️ Architecture Overview

Gradify Web follows a lightweight, static, frontend-heavy architecture relying on backend-as-a-service (BaaS) through Firebase:

```
┌─────────────────────────────────────┐
│          Presentation (UI)          │
│       HTML, CSS, GSAP, Tailwind     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Business Logic Layer         │
│     Vanilla JS modules, AI Services │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Backend & Storage           │
│    Firebase Auth, Firestore Db      │
└─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
gradify-web/
├── docs/               # Web documentation
├── docs-app/           # Android companion app docs
├── api/                # Backend API integration files (Node.js/Python if any)
├── assets/             # Images, SVGs, and other media
├── css/                # Stylesheets (Vanilla + custom components)
├── js/                 # JavaScript modules (app.js, auth.js, format.js, player.js)
├── *.html              # Page templates (index, player, profile, etc.)
```

---

## 🔑 Key Components

### HTML Pages

| File                         | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `index.html`                 | Dashboard, entry point, and navigation                    |
| `player.html`                | Custom YouTube video lecture player with integrated notes |
| `profile.html`               | User profile, settings, and stats                         |
| `pyq.html` / `pyq-quiz.html` | Previous year question papers and quiz interfaces         |
| `notes.html`                 | Access to PDFs and text notes                             |
| `tools.html`                 | Interactive tools like the Grade Calculator               |

### JavaScript Modules (`js/`)

- **`app.js`**: Universal site logic (sidebar, global state, API hooks)
- **`auth.js`**: Firebase Authentication configuration and user state
- **`player.js`**: YouTube IFrame API management and tracking
- **`ui.js` / `gsap` utils**: Handles smooth page transitions and micro-animations.

---

## 🔄 Data Flow

### Authentication Flow

1. User clicks login in UI.
2. `auth.js` uses Firebase Auth (Google Provider) to authenticate.
3. Upon success, UI updates headers and fetches user stats from Firestore.

### Video Playback & Sync

1. `player.html` receives a video ID.
2. The YouTube Player API initializes the video.
3. Custom progress trackers log watched duration.
4. Data is synced back to Firebase under the user's profile to track course progress.

---

## 💾 Data Storage & Services

- **Firebase Auth**: Secure Google Login and user management.
- **Firestore DB**: Real-time database for sync, preferences, and progress tracking.
- **Gemini AI**: Generative AI integration for the study assistant feature.
- **GitHub / JSON**: Hosted raw data containing indexes for videos, quizzes, and notes.
