// Zod schemas: the server never trusts user input or AI output until it passes these.
const { z } = require("zod");

// What the browser may send us
const requestSchema = z.object({
  career_goal: z.string().trim().min(3, "Career goal must be at least 3 characters.").max(300, "Career goal must be 300 characters or fewer."),
  current_skills: z.string().trim().min(5, "Describe your current skills in at least 5 characters.").max(2000, "Current skills must be 2000 characters or fewer."),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  additional_context: z.string().trim().max(1000, "Additional context must be 1000 characters or fewer.").optional().default(""),
});

const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(600),
  duration: z.string().trim().min(2).max(40),
  skills: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
  status: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
});

// What Gemini must return
const aiOutputSchema = z.object({
  career_goal: z.string().trim().min(3).max(300),
  current_skills: z.array(z.string().trim().min(1).max(60)).max(30),
  skill_gaps: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
  priority: z.enum(["low", "medium", "high"]),
  milestones: z.array(milestoneSchema).min(3).max(7),
});

const statusSchema = z.object({ status: z.enum(["not_started", "in_progress", "completed"]) });

module.exports = { requestSchema, aiOutputSchema, statusSchema };
