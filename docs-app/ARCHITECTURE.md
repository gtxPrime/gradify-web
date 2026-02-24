# 🏛️ Gradify Architecture & Code Structure

Welcome to the architectural deep dive of **Gradify**. This document outlines how the codebase is structured, the design patterns used, and how data flows through the application.

---

## 🏗️ Architecture Overview

Gradify follows a **Standard Android Architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │
│  Activities, Fragments, Adapters    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Business Logic Layer           │
│   Utils, Managers, Services         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Data Layer                  │
│  Firebase, Room, SharedPreferences  │
└─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
app/src/main/java/com/gxdevs/gradify/
├── activities/          # UI screens
│   ├── MainActivity.java
│   ├── LectureActivity.java
│   ├── NotesActivity.java
│   ├── SubjectsActivity.java
│   └── ...
├── adapters/           # RecyclerView adapters
├── fragments/          # UI fragments
├── models/            # Data models
└── Utils/             # Utility classes
    └── Utils.java     # Core utilities
```

---

## 🔑 Key Components

### Activities

| File                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `MainActivity.java`     | Home dashboard and navigation |
| `LectureActivity.java`  | Video lecture player          |
| `NotesActivity.java`    | Notes and PDF viewer          |
| `SubjectsActivity.java` | Subject selection             |

### Utils

- **`Utils.java`**: Core utility functions including:
  - AES encryption/decryption
  - URL handling and CDN link processing
  - JSON data fetching
  - Network operations

---

## 🔄 Data Flow

### Lecture Loading Flow

1. User selects subject → `SubjectsActivity`
2. App fetches `index.json` from GitHub
3. Extracts lecture URL for selected subject
4. Decrypts URL if needed
5. Loads lecture data → `LectureActivity`
6. Displays YouTube video player

### Quiz Flow

1. User selects quiz → `NotesActivity`
2. Fetches encrypted quiz JSON
3. Decrypts using AES with SECRET_KEY
4. Parses questions
5. Displays quiz interface

---

## 💾 Data Storage

- **Remote**: GitHub-hosted JSON files
- **Local**: SharedPreferences for settings
- **Cache**: Glide for image caching
- **Firebase**: User authentication and analytics

---

See [Key Components](KEY_COMPONENTS.md) for detailed component information.
