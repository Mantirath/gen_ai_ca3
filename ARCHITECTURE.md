# Architecture
See the Mermaid diagram and workflow in VIVA_PREPARATION.md (sections D and E).
- **Components:** browser (public/), Express API (server/index.js), Gemini module (server/gemini.js), Zod schemas (server/schemas.js), SQLite (server/db.js, data/talentverse.db).
- **Security boundary:** the browser only talks to our `/api` routes. The Gemini key and the database are reachable only from the server process.
- **No authentication:** all plans are shared per server instance.
