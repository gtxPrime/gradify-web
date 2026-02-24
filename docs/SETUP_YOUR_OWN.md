# 🚀 Setup Your Own Instance of Gradify Web

Want to host your own instance of Gradify Web or customize it for an alternative study program? Follow these steps.

---

## 📋 Prerequisites

- GitHub Account
- Firebase Account
- Valid Web Hosting (Vercel, Firebase Hosting, Netlify, or Shared Hosting)

---

## 🚀 Step-by-Step Setup

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/gradify-web.git
cd gradify-web
```

### 2. Configure Firebase Environment

You must provide your own Firebase configuration since production keys belong to the official instance.

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web App** to your project.
3. Enable **Google Authentication**.
4. Enable **Firestore**.
5. Copy your config object and update it inside `js/auth.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
   };
   ```

### 3. Supply Your Own Content Data

Gradify fetches video indexes, quiz links, and formulas from external JSON files to stay dynamic. If you want custom content:

1. Update pointers in `js/app.js` or respective files to point to your new raw JSONs.
2. Structure your JSONs identically to the expected schema (refer to `ARCHITECTURE.md`).

### 4. Deploy

#### Using Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### Using any simple static hosting:

Upload all files directly through cPanel OR push to **GitHub Pages / Vercel**! Because it is static, it can be hosted absolutely anywhere.
