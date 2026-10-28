# Testing (manual)

Run `npm start`, open http://localhost:3000. These tests have to be run by you; nothing here has been pre-run.

| # | Test | Expected |
|---|---|---|
| 1 | Open `/api/health` | JSON with `ok: true`, correct key status |
| 2 | Studio: click sample input, Generate | Pipeline turns green, blueprint page opens with "saved (record #N)" |
| 3 | Refresh the blueprint page | Same plan loads from the database |
| 4 | Change a milestone to Completed, refresh | Status and progress % are unchanged after refresh |
| 5 | Dashboard | Plan count and milestone progress match what you did |
| 6 | Saved Plans: search part of a goal | List filters; unmatched search shows an empty state |
| 7 | Delete a plan, confirm | Plan disappears; Cancel keeps it |
| 8 | Empty goal, Generate | Error message, pipeline stage 1 marked failed |
| 9 | Goal over 300 characters (curl) | 400 with a clear message |
| 10 | Remove `GEMINI_API_KEY` from `.env`, restart, Generate | Error "Server is missing GEMINI_API_KEY"; nothing saved |
| 11 | Wrong key in `.env` | "Gemini rejected the request"; nothing saved |
| 12 | Turn off Wi-Fi, Generate | "Could not reach the Gemini API" |
| 13 | Stop the server, click Generate | "Cannot reach the server" |
| 14 | Double-click Generate quickly | Button disables; only one plan is saved |
| 15 | Delete `data/talentverse.db` while stopped, restart | Empty database is recreated |
