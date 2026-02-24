# 🔑 Key Components Deep Dive

This document provides a detailed look at the most critical files in the **Gradify** codebase.

---

## 🧠 Core Utilities

### `Utils.java`

**Location**: `app/src/main/java/com/gxdevs/gradify/Utils/`

**Role**: The Swiss Army knife of Gradify. Handles all core operations.

**Key Methods**:

- `decryptUrl(String encryptedUrl)`: Decrypts AES-encrypted URLs
- `fetchIndexData()`: Fetches main index.json from GitHub
- `getLectureUrl(String subject)`: Gets lecture URL for a subject
- `getQuizUrl(String subject)`: Gets quiz URL for a subject

**Encryption Logic**:

```java
// Uses AES/CBC/PKCS5Padding
// SECRET_KEY from BuildConfig
// Decodes base64 encrypted data
```

---

## 📱 Activities

### `LectureActivity.java`

**Purpose**: Video lecture player with YouTube integration

**Features**:

- YouTube player integration
- Progress tracking
- Custom controls
- Fullscreen support

### `NotesActivity.java`

**Purpose**: Notes and quiz viewer

**Features**:

- PDF viewing
- Image display
- Quiz rendering
- Offline support

### `SubjectsActivity.java`

**Purpose**: Subject selection interface

**Features**:

- Foundation/Diploma level selection
- Subject grid display
- Navigation to lectures/quizzes

---

## 🔐 Security

### Encryption System

- **Algorithm**: AES-256-CBC
- **Key Storage**: BuildConfig (not in VCS)
- **Use Case**: Protecting quiz URLs and content

### Firebase Integration

- **Authentication**: User login/signup
- **Firestore**: User progress data
- **Crashlytics**: Error reporting

---

For architecture overview, see [Architecture Guide](ARCHITECTURE.md).
