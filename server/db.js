// Database layer: SQLite file at data/talentverse.db (created automatically).
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "talentverse.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS career_plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    career_goal TEXT NOT NULL,
    input_text  TEXT NOT NULL,
    current_skills TEXT NOT NULL,   -- JSON array
    skill_gaps  TEXT NOT NULL,      -- JSON array
    priority    TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
    milestones  TEXT NOT NULL,      -- JSON array (each has a status)
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_plans_created ON career_plans(created_at DESC);
`);

// Convert a raw DB row into the object the frontend uses.
function toPlan(row) {
  if (!row) return null;
  return {
    ...row,
    current_skills: JSON.parse(row.current_skills),
    skill_gaps: JSON.parse(row.skill_gaps),
    milestones: JSON.parse(row.milestones),
  };
}

// All queries use "?" placeholders (parameterized) so user input can't inject SQL.
const getPlan = (id) => toPlan(db.prepare("SELECT * FROM career_plans WHERE id = ?").get(id));
const insertPlan = (p, inputText) => {
  const info = db
    .prepare(
      `INSERT INTO career_plans (career_goal, input_text, current_skills, skill_gaps, priority, milestones)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(p.career_goal, inputText, JSON.stringify(p.current_skills), JSON.stringify(p.skill_gaps), p.priority, JSON.stringify(p.milestones));
  return getPlan(info.lastInsertRowid);
};
const listPlans = () => db.prepare("SELECT * FROM career_plans ORDER BY created_at DESC, id DESC").all().map(toPlan);
const updateMilestones = (id, milestones) => {
  db.prepare("UPDATE career_plans SET milestones = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(milestones), id);
  return getPlan(id);
};
const deletePlan = (id) => db.prepare("DELETE FROM career_plans WHERE id = ?").run(id).changes > 0;

module.exports = { insertPlan, getPlan, listPlans, updateMilestones, deletePlan };
