# 🌱 CarbonSense - Carbon Footprint Awareness Platform

**CarbonSense** is a premium, highly accessible, and gamified carbon footprint tracking application. It empowers users to monitor, analyze, and offset their daily emissions through interactive route mapping, AI-driven daily tips, streak rewards, and detailed visual analysis.

---

## ✨ Features

- 📊 **Dynamic Carbon Dashboard:** Live analytics tracking carbon savings, active streaks, and eco-points. Includes a Google Charts pie chart showing sources of historical emission reductions.
- 🗺️ **Interactive Route Planner:** An accessible daily logging form integrated with **Leaflet Maps (OpenStreetMap)**. Click starting and ending locations to dynamically calculate geodesic distances and compute transport emissions.
- 🤖 **AI Eco-Action Challenges:** Connects to **Gemini 2.5 Flash** using the official `@google/genai` SDK to generate custom eco-challenges based on recent user activities.
- 📅 **Google Workspace Integration:**
  - **Google Calendar Sync:** Schedule your Gemini eco-action challenge directly to your calendar with a single click.
  - **Google Sheets Backup:** Export historical daily emission log subcollections directly to a new spreadsheet in Google Sheets.
- 🏆 **Gamified Milestones & Streaks:** Tracks daily logging consistency and awards badges (like *Commute Champion* upon reaching 500 points) with engaging high-performance confetti animations.

---

## 🛠️ Tech Stack & Services

- **Frontend Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (configured with native Vite plugins)
- **Database & Auth:** Firebase Auth (Google Sign-In only) & Cloud Firestore (Spark plan/Free Tier)
- **AI Model:** Gemini 2.5 Flash via `@google/genai` SDK (Google AI Studio Free Tier API key)
- **Maps:** Leaflet & React-Leaflet (using OpenStreetMap)
- **Data Visualization:** Google Charts via `react-google-charts`
- **Testing Suite:** Vitest (unit tests for math & streak tracking logic)

---

## 🔒 Security Architecture

Strict Firestore access control is enforced via the `firebase.rules` file in the root folder:
- **User Privacy:** Users can only read and write their own `/users/{uid}` profile and `/users/{uid}/dailyLogs` documents.
- **Cheating Protection:** The global `/leaderboard` collection is configured as **strictly read-only** for clients, protecting the platform from client-side score tampering.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js (version 20+ recommended) and npm installed:
```bash
node -v
npm -v
```

### 2. Installation
Clone the repository, navigate to the folder, and install all dependencies:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root folder (use `.env.example` as a template) and add your project configurations:
```ini
# Firebase Config
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini API Key
VITE_GEMINI_API_KEY=your_google_ai_studio_api_key

# Google OAuth (for sheets and calendar sync)
VITE_GOOGLE_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com
```

### 4. Running Locally
Run the development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 5. Running Tests
Run unit tests for calculations and streak tracking via Vitest:
```bash
npm run test
```

### 6. Production Build
Generate a bundle optimized for production with tree-shaken assets:
```bash
npm run build
```
