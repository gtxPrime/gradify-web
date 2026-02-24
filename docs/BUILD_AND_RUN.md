# 🔧 Building and Running Gradify Web

This guide will help you set up your development environment and run **Gradify Web** locally.

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Git**: To clone the repository.
- **Node.js**: (Optional but recommended) for running local development servers.
- A Modern Browser (Chrome, Firefox, Edge, Safari).
- A code editor like **Visual Studio Code**.

---

## 🚀 Build Instructions

### Option 1: Using VS Code (Recommended)

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/gtxPrime/gradify-web.git
   cd gradify-web
   ```

2. **Open Project**:

   ```bash
   code .
   ```

3. **Install Live Server Extension**:
   - In VS Code, go to the Extensions tab.
   - Search for and install **Live Server**.

4. **Run**:
   - Right-click on `index.html` and select **"Open with Live Server"**.
   - Your default browser will launch, and any changes you make to the files will auto-reload.

### Option 2: Using Node.js `http-server`

If you prefer a terminal-based local server:

1. **Install `http-server` globally**:

   ```bash
   npm install -g http-server
   ```

2. **Serve the app**:

   ```bash
   cd gradify-web
   http-server -c-1
   ```

   (The `-c-1` flag disables caching so your changes appear immediately).

3. Open `http://localhost:8080` in your browser.

---

## 🔧 Configuring Firebase Local Environment

To enable authentication and database functionality locally, ensure your Firebase config in `js/auth.js` is set correctly.
If testing specific new services locally, you can create a custom Firebase project and replace the keys during development, just remember not to commit your test keys!

---

## 🧪 Deployment Testing

Before pushing to production, verify:

- Navigation links work locally as relative paths.
- Dark mode/Light mode switches efficiently.
- Responsiveness across mobile, tablet, and desktop views.

---

## 🔗 Next Steps

- Read [Architecture Guide](ARCHITECTURE.md) to understand the codebase.
- Check [Key Components](KEY_COMPONENTS.md) for important files.
