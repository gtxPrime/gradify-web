# 🔧 Setup Your Own Instance of Gradify

Want to create your own version of Gradify for your institution? Follow this guide!

---

## 📋 Prerequisites

- GitHub account
- Firebase account (free tier works)
- Android Studio
- Basic knowledge of JSON

---

## 🚀 Step-by-Step Setup

### 1. Fork the Repository

Click "Fork" on [GitHub](https://github.com/gtxPrime/Gradify-App)

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/gradify.git
cd gradify
```

### 3. Update Content

#### Update `data/index.json`:

```json
{
  "formulas": "https://github.com/YOUR_USERNAME/gradify/blob/main/data/formulas.json",
  "lectures": {
    "YourLevel": {
      "Subject1": "URL_to_subject1.json",
      "Subject2": "URL_to_subject2.json"
    }
  },
  "quizzes": {
    "Subject1": "URL_to_quiz1.json"
  }
}
```

#### Add Your Lectures:

Create files in `data/lectures/YourLevel/subject.json`

#### Add Your Quizzes:

Create files in `data/quizzes/quiz_Subject.json`

### 4. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Add Android app with package name: `com.gxdevs.gradify` (or change in code)
4. Download `google-services.json`
5. Place in `app/` directory

### 5. Setup Encryption

Generate SECRET_KEY:

```bash
openssl rand -hex 32
```

Add to `local.properties`:

```properties
SECRET_KEY=your_generated_key_here
```

### 6. Customize Branding

- Replace app icon in `app/src/main/res/mipmap-*/`
- Update app name in `app/src/main/res/values/strings.xml`
- Change colors in `app/src/main/res/values/colors.xml`

### 7. Build and Test

```bash
./gradlew assembleDebug
./gradlew installDebug
```

### 8. Deploy

#### Option A: GitHub Releases

- Build release APK
- Create GitHub release
- Upload APK

#### Option B: Play Store

- Create developer account
- Build app bundle
- Upload to Play Console

---

## 📦 Content Package Download

Soon we'll provide a ZIP file containing:

- Sample lecture JSONs
- Sample quiz JSONs
- Formula database template
- Setup scripts

Stay tuned!

---

## 🆘 Need Help?

Open an issue on [GitHub](https://github.com/gtxPrime/Gradify-App/issues)

---

Good luck with your instance! 🚀
