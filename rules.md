1. Project Context & Master Constraints
Project Name: CarbonSense
Goal: Build a Carbon Footprint Awareness Platform that helps users track, understand, and reduce their emissions through gamification and AI-driven insights.
Constraint 1 (Zero-Cost): You must strictly use 100% free services. Do not implement any Google Cloud Platform (GCP) APIs that require an active billing account or credit card.
Constraint 2 (Evaluation Rubric): Every line of code must be optimized for Code Quality, Security, Efficiency, Testing, Accessibility, and Problem Statement Alignment.

2. Technical Architecture & Stack
Frontend: React.js initialized via Vite. Use Tailwind CSS for all styling.

Backend & Auth: Firebase Spark Plan (Free Tier). Implement Firebase Authentication (Google Sign-In only) and Cloud Firestore (NoSQL).

AI Integration: @google/genai SDK using an API key generated from Google AI Studio (Free Tier).

Workspace Integrations: Google Calendar API and Google Sheets API using standard OAuth 2.0 Client IDs (no billing required).

Visualizations: react-leaflet with OpenStreetMap for map routes (Zero API key required) and Google Charts for data visualization.

Testing: Vitest and React Testing Library.

3. Mandatory Coding Standards (Evaluation Parameters)
Security: Implement strict Firebase Security Rules. Users can only read/write their own /users and /dailyLogs documents. The /leaderboard collection must be read-only for clients. Validate all inputs on the frontend to prevent injection.

Accessibility: All HTML must be WCAG 2.1 AA compliant. Enforce semantic HTML (<main>, <nav>, <article>). Every form input must have a linked <label>. Ensure the entire application is fully navigable using only the Tab and Enter keys. Ensure a color contrast ratio of at least 4.5:1.

Code Quality: Enforce ESLint and Prettier formatting. Use modular functional components. Add JSDoc comments to all utility functions and API calls.

Efficiency: Implement lazy loading (React.lazy) for the tab routes. Optimize state management using React Context API to prevent unnecessary re-renders.

4. Firestore Database Schema
Implement the following NoSQL structure:

/users/{uid}: { displayName: string, email: string, totalPoints: number, currentStreak: number, highestStreak: number, lastLoggedDate: string (YYYY-MM-DD), unlockedBadges: array[string] }

/users/{uid}/dailyLogs/{logId}: { timestamp: ISOString, transportKms: number, transportType: string, dietType: string, energyKwh: number, carbonSavedKg: number }

/leaderboard/{uid}: { displayName: string, totalPoints: number, rank: number }

5. Execution Flow & Agent Prompts
Instruct the Antigravity agents to execute the project in the following sequential phases.

Phase 1: Infrastructure & Security setup
Prompt the Agent:

"Initialize a Vite + React project with Tailwind CSS. Set up Firebase Authentication (Google Sign-In) and initialize a Firestore database. Create a firebase.rules file that strictly restricts read/write access so users can only access documents where request.auth.uid == userId. Implement a global Authentication Context provider to manage the user session."

Phase 2: Core UI & Gamification Engine
Prompt the Agent:

"Build a modular Tab Navigation system (Dashboard, Log, Leaderboard, Profile). Create a highly accessible Daily Log form for users to input transport, diet, and energy data. Implement a utility function that calculates 'carbonSavedKg' and updates the user's currentStreak and totalPoints in Firestore. If totalPoints crosses 500, trigger a canvas-confetti animation and add a 'Commute Champion' badge to their profile."

Phase 3: AI Ecosystem Integrations
Prompt the Agent:

"Integrate the @google/genai SDK using a free Google AI Studio API key. Create a service that feeds the user's latest dailyLog to the Gemini 2.5 Flash model. Set a strict system instruction requiring the AI to return a JSON object with a personalized eco-action tip and estimated savings. Display this tip on the Dashboard."

Phase 4: Workspace APIs & Visualizations
Prompt the Agent:

"Implement a 'Sync to Google Calendar' button next to the Gemini tip using standard OAuth 2.0. When clicked, it should schedule the AI's suggested action as a calendar event. On the Profile tab, implement an 'Export to Sheets' button that writes the user's dailyLogs subcollection to a new Google Sheet. Use Google Charts on the Dashboard to render a pie chart of the user's historical emission sources."

Phase 5: Testing & Final Optimization
Prompt the Agent:

"Write comprehensive Vitest unit tests for the streak calculation logic and the carbon conversion formulas. Ensure all components pass an automated accessibility audit. Generate a Lighthouse-optimized build, stripping any unused Tailwind classes or dead code."

By feeding this exact structure into Google Antigravity, the AI will understand not just what to code, but how to code it to perfectly align with your hackathon's grading rubric.