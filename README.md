# TalentVerse AI — Career Intelligence Engine

Describe your career goal and skills in plain English. The app uses Google Gemini to produce a structured roadmap, validates it with Zod on the server, saves it in a SQLite database, and shows it as a blueprint with milestone progress you can update.

**Flow:** user input → Express API → Gemini (JSON) → Zod validation → SQLite insert → saved record shown in the browser.

## Tech stack
Node.js + Express (backend) · SQLite via `better-sqlite3` (database) · Google Gemini REST API (AI) · Zod (validation) · plain HTML/CSS/JavaScript (frontend, no build step).

## Prerequisites
- Node.js 18 or newer (`node -v`)
- A free Gemini API key: https://aistudio.google.com/apikey

## Setup (3 steps)
```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# open .env and paste your key after GEMINI_API_KEY=
npm start
```
Open http://localhost:3000. The database file `data/talentverse.db` is created automatically on first run.

`npm run dev` restarts the server when you edit code.

## Features
Landing page · Dashboard (counts and progress computed from the database) · Blueprint Studio (with sample input and live pipeline status) · Blueprint view (skill gaps, timeline, persistent milestone status) · Saved Plans (search, view, delete with confirmation) · How It Works (with a live health check).

## Project structure
```
server/index.js    Express app and all API routes
server/gemini.js   Gemini request, system instruction, response schema, retry
server/schemas.js  Zod schemas (request, AI output, status update)
server/db.js       SQLite table and the INSERT / SELECT / UPDATE / DELETE functions
public/index.html  Page shell        public/styles.css  Design
public/app.js      Pages, routing, API calls
data/              SQLite file lives here (git-ignored)
.env               Your secret key (git-ignored)
```

## Security notes
- The Gemini key is read from `.env` by the server only. The browser never sees it.
- All SQL uses `?` placeholders. All user text is HTML-escaped before display.
- There is **no login**. Anyone who can reach the server can see and change all saved plans. That is fine for a local demo; do not host it publicly as-is.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Server is missing GEMINI_API_KEY" | Create `.env` (copy `.env.example`), add the key, restart `npm start` |
| "Gemini rejected the request" | Key is wrong or lacks access. Create a new one in AI Studio |
| "rate limit reached" | Free tier limit. Wait a minute |
| `better-sqlite3` install error | Use Node 18/20/22 LTS; on Windows install with a normal internet connection so the prebuilt file downloads |
| Port in use | Set `PORT=3001` in `.env` |
| Model not found | Set `GEMINI_MODEL` in `.env` to a model listed in AI Studio |

## Upload to GitHub
```bash
git init
git add .
git commit -m "TalentVerse AI"
git branch -M main
git remote add origin https://github.com/<your-username>/talentverse-ai.git
git push -u origin main
```
`.gitignore` already excludes `.env`, `node_modules` and the database.
