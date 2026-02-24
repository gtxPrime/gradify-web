# ⚡ Quick Start Guide - Gradify

Just cloned the repo and want to see it run? You're in the right place.

---

## 🔒 Safety Check: ✅ SAFE TO RUN

This project contains:

- Standard Android patterns and best practices.
- **No malicious payloads**.
- **No hidden network calls** (only standard API calls to fetch lectures and quizzes).
- Firebase integration for authentication and analytics.
- Secure AES encryption for content delivery.

---

## 🚀 Get Started in 3 Steps

### Step 1: Verify Prerequisites

Open your terminal/command prompt and run:

```bash
java -version
```

_You should see Java 17 or higher._

### Step 2: Configure the Project

1. **Create `local.properties`** in the root directory:

   ```properties
   sdk.dir=YOUR_ANDROID_SDK_PATH
   SECRET_KEY=your_secret_key_here
   ```

2. **Add Firebase** (optional for basic functionality):
   - Download `google-services.json` from your Firebase console
   - Place it in the `app/` directory

### Step 3: Build the Project

Run the wrapper command from the project root:

**Windows:**

```powershell
./gradlew assembleDebug
```

**Mac/Linux:**

```bash
./gradlew assembleDebug
```

_This will download all dependencies automatically._

### Step 4: Run on Device

1. Connect your Android phone via USB.
2. Enable **USB Debugging** in Developer Options.
3. Run:
   ```bash
   ./gradlew installDebug
   ```
4. Launch "Gradify" on your phone!

---

## 🛠️ Common Tasks

| To do this...                      | Run this...                     |
| :--------------------------------- | :------------------------------ |
| **Clean Build** (Fix weird errors) | `./gradlew clean`               |
| **Run Unit Tests**                 | `./gradlew test`                |
| **Check Dependencies**             | `./gradlew androidDependencies` |
| **Generate Release APK**           | `./gradlew assembleRelease`     |

---

## ❓ FAQ

**Q: Do I need Firebase to run the app?**
A: Firebase is optional for basic functionality. The app will work without it, but authentication and analytics features will be disabled.

**Q: Where do I get the SECRET_KEY?**
A: The SECRET_KEY is used for AES encryption of quiz URLs. You can generate one using:

```bash
openssl rand -hex 32
```

**Q: Can I use this on an Emulator?**
A: Yes! It works perfectly on the Android Studio emulator.

**Q: Where is the content stored?**
A: All lectures, quizzes, and formulas are stored in JSON files in the `data/` directory. The app fetches them from GitHub URLs specified in `data/index.json`.

**Q: How do I add my own lectures/quizzes?**
A: See the [Contributing Guide](CONTRIBUTING.md) for detailed instructions on adding content.

---

## 🔗 Next Steps

- Want to understand the code? Read [Key Components](KEY_COMPONENTS.md).
- Want to see the architecture? Read [Architecture Guide](ARCHITECTURE.md).
- Want to contribute? Read [Contributing Guide](CONTRIBUTING.md).
