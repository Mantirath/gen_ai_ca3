// Express server: serves the website (public/) and the JSON API (/api/...).
require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { requestSchema, statusSchema } = require("./schemas");
const { generatePlan, AppError } = require("./gemini");

const app = express();
app.use(express.json({ limit: "20kb" })); // maximum request size
app.use(express.static(path.join(__dirname, "..", "public")));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const parseId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

app.get("/api/health", (req, res) => {
  res.json({ ok: true, gemini_key_configured: Boolean(process.env.GEMINI_API_KEY), plans_in_database: db.listPlans().length });
});

// CREATE: user text -> Gemini -> Zod -> SQLite -> saved record
const inFlight = new Set(); // blocks accidental double submits of the same input
app.post("/api/plans/generate", asyncRoute(async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message, details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
  }
  const key = crypto.createHash("sha1").update(JSON.stringify(parsed.data)).digest("hex");
  if (inFlight.has(key)) throw new AppError(409, "This exact request is already being processed. Please wait.");
  inFlight.add(key);
  try {
    const plan = await generatePlan(parsed.data);
    let saved;
    try {
      saved = db.insertPlan(plan, `${parsed.data.career_goal}\n${parsed.data.current_skills}\n${parsed.data.additional_context}`.trim());
    } catch (err) {
      console.error("[db] insert failed:", err.message);
      throw new AppError(500, "The plan was generated but could not be saved to the database.");
    }
    res.status(201).json(saved); // success is returned only after the DB write
  } finally {
    inFlight.delete(key);
  }
}));

// READ
app.get("/api/plans", (req, res) => res.json(db.listPlans()));
app.get("/api/plans/:id", (req, res) => {
  const plan = db.getPlan(parseId(req.params.id));
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  res.json(plan);
});

// UPDATE: change one milestone's status (saved permanently)
app.patch("/api/plans/:id/milestones/:index", (req, res) => {
  const plan = db.getPlan(parseId(req.params.id));
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  const body = statusSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Status must be not_started, in_progress or completed." });
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= plan.milestones.length) return res.status(404).json({ error: "Milestone not found." });
  plan.milestones[index].status = body.data.status;
  res.json(db.updateMilestones(plan.id, plan.milestones));
});

// DELETE
app.delete("/api/plans/:id", (req, res) => {
  if (!db.deletePlan(parseId(req.params.id))) return res.status(404).json({ error: "Plan not found." });
  res.json({ deleted: true });
});

// Central error handler: friendly message to the user, technical detail only in the terminal.
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  if (err instanceof SyntaxError) return res.status(400).json({ error: "Request body is not valid JSON." });
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  console.error("[server] unexpected:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TalentVerse AI running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn("WARNING: GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.");
});
