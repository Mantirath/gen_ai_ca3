# API Explanation

Base URL (local): `http://localhost:3000`. Source: `server/index.js`.

## Main endpoint: generate a plan
- **POST `/api/plans/generate`** (POST because it sends data and creates a new record)
- Handler: `server/index.js`; AI call: `callGemini()` and `generatePlan()` in `server/gemini.js`; DB write: `insertPlan()` in `server/db.js`.

Request body:
```json
{
  "career_goal": "AI Engineer",
  "current_skills": "I know Python and basic ML, need deep learning, NLP, APIs and deployment.",
  "experience_level": "intermediate",
  "additional_context": "10 hours a week"
}
```
Success (201) returns the saved database row (shape, values vary):
```json
{
  "id": 1, "career_goal": "AI Engineer", "input_text": "...",
  "current_skills": ["Python", "Basic machine learning"],
  "skill_gaps": ["Deep learning", "NLP", "APIs", "Deployment"],
  "priority": "high",
  "milestones": [{ "title": "...", "description": "...", "duration": "3 weeks", "skills": ["..."], "status": "not_started" }],
  "created_at": "2026-10-28 16:00:00", "updated_at": "2026-10-28 16:00:00"
}
```

## Other endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Server status, whether a key is configured, plan count |
| GET | `/api/plans` | List all plans |
| GET | `/api/plans/:id` | One plan |
| PATCH | `/api/plans/:id/milestones/:index` | Body `{"status":"completed"}`; saves progress |
| DELETE | `/api/plans/:id` | Delete a plan |

## Status codes used
201 created · 200 ok · 400 invalid input or bad JSON · 404 not found · 409 identical request already running · 413 body too large · 429 Gemini rate limit · 500 missing key, DB failure or unexpected error · 502 Gemini unreachable/rejected, or AI output invalid after one retry.

## Authentication and secrets
There is no user login. `GEMINI_API_KEY` is read from `.env` via `dotenv` in `server/index.js` and used only in `callGemini()` (sent in the `x-goog-api-key` header from the server). The frontend only calls our own `/api/...` routes.

## Test it
```bash
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/plans/generate -H "Content-Type: application/json" \
  -d '{"career_goal":"AI Engineer","current_skills":"I know Python and basic ML"}'
curl http://localhost:3000/api/plans
```
