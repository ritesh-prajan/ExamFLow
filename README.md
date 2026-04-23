<div align="center">

# ExamFlow AI

### Intelligent Study Planning Platform for Academic Success

Transform your syllabus into a structured, personalized study roadmap powered by AI.

![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Backend-orange?style=flat-square&logo=firebase)
![Vite](https://img.shields.io/badge/Vite-Fast-purple?style=flat-square&logo=vite)

</div>

---

## Overview

ExamFlow AI is a modern AI-powered exam preparation platform designed to help students plan efficiently, stay consistent, and maximize performance.

Users can upload a syllabus PDF or manually enter topics. The platform analyzes modules, timelines, priorities, and creates a personalized study schedule that adapts to deadlines and progress.

---

## Key Features

- AI syllabus analyzer  
- Personalized study planner  
- Focus timer with hour tracking  
- Crisis Mode for last-minute preparation  
- AI tutor assistance  
- Progress analytics dashboard  
- Goal milestones and reminders  

---

## Technology Stack

| Layer | Technologies |
|------|-------------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express.js |
| Database | Firebase Firestore |
| AI Integration | Gemini API |

---

## Requirements

Before starting, install:

- Node.js (Version 18 or above recommended)  
- npm (included with Node.js)  
- Git (optional)

Check installation:

```bash
node -v
npm -v
Installation Guide
Step 1: Download Project

Using Git:

git clone https://github.com/yourusername/examflow-ai.git
cd examflow-ai

Or download ZIP and extract the folder manually.

Step 2: Install Dependencies

Run:

npm install

This installs all required packages from package.json.

Step 3: Configure Environment Variables

Create a file named .env.local

GEMINI_API_KEY=your_api_key
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id

Replace the values with your actual Firebase and Gemini credentials.

How to Run the Project
Start Development Server
npm run dev

After running, terminal will display something similar to:

Local: http://localhost:5173/

Open that link in your browser.

Useful Commands
Run Development Mode
npm run dev
Build for Production
npm run build
Preview Production Build
npm run preview
Install New Package
npm install package-name
Project Structure
ExamFlow-AI/
│── src/                Main frontend source code
│── public/             Images and static files
│── functions/          Backend/API logic
│── package.json        Dependencies and scripts
│── vite.config.ts      Vite configuration
│── netlify.toml        Netlify deployment config
Deployment
Netlify
Run:
npm run build
Upload the generated dist folder to Netlify.
Vercel

Connect GitHub repository and deploy automatically.

Firebase Hosting
firebase init
firebase deploy
Troubleshooting
npm command not working

Install Node.js and restart terminal.

Port already in use
npm run dev -- --port 3000
Blank page after running

Check .env.local values and inspect browser console for errors.

Roadmap
AI Voice Tutor
Mobile Application
Collaborative Study Rooms
Rank Prediction System
Competitive Exam Mode
License

MIT License © 2026 ExamFlow AI

<div align="center">

Built for students who value structure, consistency, and results.

</div> ```
