# 🔑 Key Components Deep Dive (Web)

This document provides a detailed look at the most critical files in the **Gradify Web** codebase.

---

## 🧠 Core JavaScript Logic

### `js/app.js`

**Role**: Handles global UI interactions, routing adjustments, sidebar states, and overarching site data fetching.

**Features**:

- Initialize sidebar navigation toggles.
- Listen for system or user theme preference.
- Global fetch functions for JSON data schemas.

### `js/auth.js`

**Role**: Authentication provider via Firebase.

**Features**:

- Setup Google Provider sign in.
- Monitor `onAuthStateChanged`.
- Redirect users upon successful or failed logins.

### `js/player.js`

**Role**: Custom wrapper for the YouTube IFrame API to play video lectures seamlessly within the app's branded layout.

**Features**:

- Timestamp tracking.
- Synced note saving alongside specific video points.
- Progress percentage calculator.

---

## 📱 Interactive View Templates

### `index.html`

**Purpose**: The main dashboard.
**Features**:

- Displays recent progress.
- Quick links to recent lectures, notes, or tools.
- Animated GSAP entry points for an engaging intro.

### `player.html`

**Purpose**: The core learning environment.
**Features**:

- Embeds the standard lecture video.
- Provides a side-panel for active note taking.
- Automatically adjusts to screen resizing.

---

## 🔐 Security & Database

- **Firebase Realtime/Firestore rules**: Web client enforces read/write permissions via Firebase Security Rules. Users can only modify their own study records.
