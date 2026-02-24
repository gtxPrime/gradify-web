<div align="center">

<img src="app/src/main/ic_launcher-playstore.png" alt="Gradify Logo" width="120"/>

# Gradify

**IIT-M BS in Data Science: Your Complete Academic Companion**

[![License](https://img.shields.io/badge/License-Modified%20MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-green.svg)](https://www.android.com/)
[![Version](https://img.shields.io/badge/Version-Mark%207-orange.svg)](https://github.com/gtxPrime/gradify/releases)
[![IIT Madras](https://img.shields.io/badge/IIT%20Madras-BS%20Data%20Science-red.svg)](https://study.iitm.ac.in/)

[![GitHub stars](https://img.shields.io/github/stars/gtxPrime/gradify?style=social)](https://github.com/gtxPrime/gradify/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/gtxPrime/gradify?style=social)](https://github.com/gtxPrime/gradify/network/members)
[![GitHub issues](https://img.shields.io/github/issues/gtxPrime/gradify)](https://github.com/gtxPrime/gradify/issues)

### [Features](#-features) | [Installation](#-installation) | [Documentation](#-documentation) | [Contributing](#-contributing)

</div>

---

## 🌐 Web Platform (Coming Soon)

> **🚀 We are building a full-featured web version of Gradify!**
>
> Soon you'll be able to access your seamless study experience from any device—Desktop, Tablet, or Mobile Web.

**What to expect:**

- 📊 **Advanced Analytics Dashboard** - Visualize your learning progress
- 💻 **Cross-Device Sync** - Start on mobile, continue on web
- 🌍 **Universal Access** - No installation required
- 🔄 **Real-time Synchronization** - Always up to date

_Stay tuned for the launch announcement!_

## 📱 About Gradify

**Gradify** is a comprehensive mobile learning platform designed exclusively for **IIT Madras BS in Data Science** students. From Foundation to Diploma levels, Gradify brings together video lectures, interactive quizzes, formula sheets, AI assistance, and study materials - all in one beautifully designed Android application.

> "The beautiful thing about learning is that no one can take it away from you." - B.B. King

Whether you're tackling Statistics, mastering Python, or diving into Machine Learning, Gradify is your trusted companion throughout your IIT-M journey.

---

## ✨ Features

### 📚 **Comprehensive Video Lectures**

- **Foundation Level**: Computational Thinking, English, Mathematics, Python, Statistics
- **Diploma Level**: Business Analytics, BDM, DBMS, Java, MAD, Machine Learning, PDSA, System Commands
- Seamless YouTube integration with custom player
- Progress tracking and bookmarking
- Offline download support (coming soon)

### 🎯 **Interactive Quizzes**

- Subject-specific question banks for all courses
- Instant feedback and explanations
- Performance analytics and progress tracking
- Encrypted content delivery for security
- Practice mode and exam simulation

### 🧮 **Grade Calculation & Formulas**

- **Dynamic Grade Predictor**: Comprehensive database of marking schemes for all IITM BS subjects.
- **Subject-Specific Inputs**: Automatically generates input fields (GAA, Quizzes, End Term, etc.) based on the subject's specific criteria.
- **Real-time Prediction**: Uses `mXparser` to calculate total scores and predict final grades (S, A, B, etc.) instantly.
- **Extensible Database**: Easily update marking schemes as they change each term via `formulas.json`.
- **Visual Formatting**: Formulas are presented clearly with proper mathematical notation.

### 🤖 **AI-Powered Study Assistant**

- Powered by Google Gemini AI
- 24/7 availability
- Context-aware responses

### 📖 **Smart Notes System**

- Cloud-synced study materials
- Rich media support (PDFs, images, formatted text)
- Quick search functionality
- Organized by subject and topic
- Offline access

### 🎨 **Beautiful Material Design**

- Modern Material Design 3 interface
- Dark mode support
- Smooth animations and transitions
- Customizable themes
- Responsive design for all screen sizes

### 🔐 **Secure & Private**

- AES encryption for content delivery
- Firebase authentication
- Encrypted URL handling
- Privacy-first approach

---

## 📸 Screenshots

|                                            |                                            |                                            |                                            |
| :----------------------------------------: | :----------------------------------------: | :----------------------------------------: | :----------------------------------------: |
| <img src="screenshots/1.png" width="160"/> | <img src="screenshots/2.png" width="160"/> | <img src="screenshots/3.png" width="160"/> | <img src="screenshots/4.png" width="160"/> |
| <img src="screenshots/5.png" width="160"/> | <img src="screenshots/6.png" width="160"/> | <img src="screenshots/7.png" width="160"/> | <img src="screenshots/8.png" width="160"/> |

---

## 🛠 Tech Stack

**Core Technologies:**

```
• Java (Android)
• Firebase (Auth, Firestore, Crashlytics)
• Material Design 3
• Google Gemini AI
```

**Key Libraries:**

- **UI/UX**: Material Components, ConstraintLayout, BlurView
- **Networking**: Retrofit, OkHttp, Volley
- **Media**: Glide, PhotoView, YouTube Player
- **AI**: Google Generative AI SDK
- **Security**: AndroidX Security Crypto
- **Utilities**: MathParser, Markwon, ColorPicker

For complete dependency list, see [`app/build.gradle`](app/build.gradle)

---

## 📥 Installation

### Option 1: Download APK (Recommended)

1. Go to [Releases](https://github.com/gtxPrime/gradify/releases)
2. Download the latest APK
3. Install on your Android device (Enable "Install from Unknown Sources")

### Option 2: Build from Source

See our detailed [Build & Run Guide](docs/BUILD_AND_RUN.md) for complete instructions.

**Quick Start:**

```bash
git clone https://github.com/gtxprime/gradify.git
cd gradify
./gradlew assembleDebug
```

---

## 📚 Documentation

We have comprehensive documentation to help you understand, build, and contribute:

- **[⚡ Quick Start](docs/QUICK_START.md)**: Get the app running in 5 minutes
- **[🔧 Build & Run](docs/BUILD_AND_RUN.md)**: Detailed setup and troubleshooting
- **[🏛️ Architecture](docs/ARCHITECTURE.md)**: Code structure and design patterns
- **[🔑 Key Components](docs/KEY_COMPONENTS.md)**: Deep dive into critical files
- **[🤝 Contributing Guide](docs/CONTRIBUTING.md)**: How to contribute content and code
- **[📂 Documentation Index](docs/SUMMARY.md)**: Full documentation list

---

## 🗺 Roadmap

We're constantly improving Gradify. Here's what's coming:

- [ ] **🌐 Web Platform**: Access Gradify from any browser (Coming Soon!)
- [ ] **🔄 Cross-Device Sync**: Seamless sync between mobile app and website
- [ ] **📚 PYQs Topic-wise Sorting**: Previous Year Questions organized by topics
- [ ] **📥 Offline Mode**: Download lectures and quizzes for offline access
- [ ] **🃏 Flashcards**: Spaced repetition learning system
- [ ] **🏆 Achievement System**: Earn badges for learning milestones
- [ ] **🔥 Streak System**: Daily learning streaks and rewards
- [ ] **📊 Advanced Analytics**: Detailed insights into learning patterns
- [ ] **👥 Community Features**: Study groups and peer discussions
- [ ] **📦 Quiz Paper Downloads**: Downloadable ZIP files of all quizzes

---

## 🤝 Contributing

We love contributions! Whether you're adding content, fixing bugs, or improving features - your help is appreciated.

### Ways to Contribute:

#### 📝 **Content Contribution**

- **Add Lectures**: Submit new video lecture links
- **Create Quizzes**: Add questions for any subject
- **Update Grade Formulas**: Contribute to the `formulas.json` database to keep marking schemes up-to-date.
- **Improve Notes**: Share study materials and notes

#### 📐 **Updating Grade Calculation Formulas**

The app uses `data/formulas.json` to calculate grades. For detailed instructions on adding or updating formulas, please see our [Contributing Guide](docs/CONTRIBUTING.md#updating-grade-calculation-formulas).

#### 💻 **Code Contribution**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

#### 🎯 **Areas We Need Help**

- UI/UX improvements
- Content creation (lectures, quizzes, notes)
- Bug fixes and optimization
- Documentation improvements
- Translations

---

## 🚀 Setup Your Own Instance

Want to create your own version of Gradify for your institution?

1. **Fork the repository**
2. **Update content files** in the `data/` directory:
   - `data/index.json` - Main content index
   - `data/lectures/` - Lecture JSON files
   - `data/quizzes/` - Quiz JSON files
   - `data/formulas.json` - Formula database
3. **Configure Firebase**:
   - Create a Firebase project
   - Download `google-services.json`
   - Place in `app/` directory
4. **Set up encryption**:
   - Generate a secret key
   - Add to `local.properties`: `SECRET_KEY=your_key_here`
5. **Build and deploy**

See [Setup Guide](docs/SETUP_YOUR_OWN.md) for detailed instructions.

---

## 📊 Repository Stats

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/gtxPrime/gradify)
![GitHub code size](https://img.shields.io/github/languages/code-size/gtxPrime/gradify)
![GitHub last commit](https://img.shields.io/github/last-commit/gtxPrime/gradify)
![GitHub contributors](https://img.shields.io/github/contributors/gtxPrime/gradify)

### ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=gtxPrime/gradify&type=Date)](https://star-history.com/#gtxPrime/gradify&Date)

</div>

---

## 📄 License

Distributed under a **Modified MIT License** with mandatory credit requirement.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software, provided that visible credit is given to **Gradify** when publicly distributed.

See [LICENSE](LICENSE) for more information.

---

## 👨‍💻 Developer

**Developed by gtxPrime**

- GitHub: [@gtxPrime](https://github.com/gtxprime)
- Project: [Gradify](https://github.com/gtxPrime/gradify)

---

## 🙏 Acknowledgments

- Thanks to all IIT-M BS Data Science students using Gradify
- Special thanks to the open-source community
- Inspired by the need for better educational tools for online learners

---

## 📞 Support

Need help? Have questions?

- 📧 Email: [Contact via GitHub](https://github.com/gtxprime)
- 🐛 Issues: [GitHub Issues](https://github.com/gtxPrime/gradify/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/gtxPrime/gradify/discussions)

---

<div align="center">

**Made with ❤️ for IIT-M students, by an IIT-M student**

⭐ Star this repo if Gradify helps you ace your exams!

[Report Bug](https://github.com/gtxPrime/gradify/issues) · [Request Feature](https://github.com/gtxPrime/gradify/issues) · [Contribute](https://github.com/gtxPrime/gradify/pulls)

</div>
