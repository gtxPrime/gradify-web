# 🔧 Building and Running Gradify

This guide will help you set up your development environment and build the **Gradify** application from source.

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **[Android Studio](https://developer.android.com/studio)** (Ladybug or newer recommended)
- **Java Development Kit (JDK)**: Version 17 or 21 (Android Studio usually bundles this).
- **Git**: To clone the repository.
- **Android Device or Emulator**: Running Android 7.0 (Nougat, API 24) or higher.

---

## 🚀 Build Instructions

### Option 1: Using Android Studio (Recommended)

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/gtxPrime/Gradify-App.git
   ```

2. **Open Project**:
   - Launch Android Studio → `Open`.
   - Navigate to the cloned folder and select it.

3. **Configure local.properties**:
   Create a `local.properties` file in the root directory:

   ```properties
   sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
   SECRET_KEY=your_32_character_hex_key_here
   ```

   Generate a SECRET_KEY:

   ```bash
   openssl rand -hex 32
   ```

4. **Add Firebase Configuration** (Optional):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing
   - Download `google-services.json`
   - Place it in the `app/` directory

5. **Configure Signing** (For Release Builds):
   Update `gradle.properties`:

   ```properties
   KEYSTORE_FILE=path/to/your/keystore.jks
   KEYSTORE_PASSWORD=your_keystore_password
   KEY_ALIAS=your_key_alias
   KEY_PASSWORD=your_key_password
   ```

6. **Sync Gradle**:
   - Android Studio should automatically start syncing.
   - If not, click `File` → `Sync Project with Gradle Files`.
   - _Wait for the sync to complete (this may take a few minutes first time)._

7. **Run**:
   - Connect your device or start an emulator.
   - Click the green **Run** ▶️ button in the toolbar.

### Option 2: Command Line

You can build the APK directly using the Gradle Wrapper included in the project.

**Windows:**

```powershell
./gradlew assembleDebug
```

**Mac/Linux:**

```bash
./gradlew assembleDebug
```

The output APK will be located at:
`app/build/outputs/apk/debug/app-debug.apk`

**Install on Device:**

```bash
./gradlew installDebug
```

---

## 🐛 Troubleshooting

### "SDK location not found"

- Create a file named `local.properties` in the root directory.
- Add the path to your SDK:
  - **Windows**: `sdk.dir=C\\:\\\\Users\\\\YourName\\\\AppData\\\\Local\\\\Android\\\\Sdk`
  - **Mac**: `sdk.dir=/Users/YourName/Library/Android/sdk`
  - **Linux**: `sdk.dir=/home/YourName/Android/Sdk`

### "Could not resolve dependencies"

- Ensure you have an active internet connection.
- Try running `File` → `Invalidate Caches / Restart` in Android Studio.
- Check if you're behind a proxy and configure it in `gradle.properties`:
  ```properties
  systemProp.http.proxyHost=proxy.company.com
  systemProp.http.proxyPort=8080
  systemProp.https.proxyHost=proxy.company.com
  systemProp.https.proxyPort=8080
  ```

### "Permission Denied" (Linux/Mac)

- Run the following to make the wrapper executable:
  ```bash
  chmod +x gradlew
  ```

### "Keystore not found" (Release Builds)

- Make sure the keystore path in `gradle.properties` is correct.
- Use absolute paths or paths relative to the project root.
- For development, you can comment out the signing config in `app/build.gradle`.

### "SECRET_KEY not found"

- Ensure `local.properties` contains the `SECRET_KEY` property.
- The key should be a 64-character hexadecimal string (32 bytes).
- Generate one using: `openssl rand -hex 32`

### Firebase Errors

- Ensure `google-services.json` is in the `app/` directory.
- Check that the package name in Firebase matches `com.gxdevs.gradify`.
- For development without Firebase, you can disable it by commenting out Firebase dependencies in `app/build.gradle`.

---

## 🧪 Testing

To run the automated tests:

**Unit Tests:**

```bash
./gradlew test
```

**Instrumented (UI) Tests:**

```bash
./gradlew connectedAndroidTest
```

---

## 📦 Building for Production

### Generate Release APK

1. **Configure Signing** (see above)

2. **Build Release APK**:

   ```bash
   ./gradlew assembleRelease
   ```

3. **Output Location**:
   `app/build/outputs/apk/release/app-release.apk`

### Generate App Bundle (for Play Store)

```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

---

## 🔧 Development Tips

### Enable Build Cache

Add to `gradle.properties`:

```properties
org.gradle.caching=true
org.gradle.parallel=true
```

### Increase Build Performance

In Android Studio:

- `File` → `Settings` → `Build, Execution, Deployment` → `Compiler`
- Increase "Command-line Options": `--max-workers=4`

### Debug Network Calls

Enable OkHttp logging in `Utils.java`:

```java
HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
logging.setLevel(HttpLoggingInterceptor.Level.BODY);
```

---

## 🔗 Next Steps

- Read [Architecture Guide](ARCHITECTURE.md) to understand the codebase.
- Check [Key Components](KEY_COMPONENTS.md) for important files.
- See [Contributing Guide](CONTRIBUTING.md) to start contributing.
