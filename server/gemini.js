// All Gemini calls happen here, on the server. The API key never reaches the browser.
const { aiOutputSchema } = require("./schemas");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `You are a career-planning assistant for students.
Return ONLY valid JSON that follows the given schema.
- Do not invent qualifications, jobs or certificates the user did not mention.
- current_skills: skills the user said they have.
- skill_gaps: reasonable missing skills for the target career.
- priority: how urgent closing the gaps is (low, medium, high).
- milestones: 4 to 6 realistic, ordered learning steps. Each has a title, a one-to-two sentence actionable description, a duration like "3 weeks", and the skills it covers.
- Every milestone status must be "not_started".
- Use simple, beginner-friendly language. Handle short or incomplete input sensibly.`;

// Schema given to Gemini so it produces JSON in the right shape.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    career_goal: { type: "STRING" },
    current_skills: { type: "ARRAY", items: { type: "STRING" } },
    skill_gaps: { type: "ARRAY", items: { type: "STRING" } },
    priority: { type: "STRING", enum: ["low", "medium", "high"] },
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          duration: { type: "STRING" },
          skills: { type: "ARRAY", items: { type: "STRING" } },
          status: { type: "STRING", enum: ["not_started", "in_progress", "completed"] },
        },
        required: ["title", "description", "duration", "skills", "status"],
      },
    },
  },
  required: ["career_goal", "current_skills", "skill_gaps", "priority", "milestones"],
};

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function callGemini(userPrompt) {
  if (!process.env.GEMINI_API_KEY) throw new AppError(500, "Server is missing GEMINI_API_KEY. Add it to the .env file and restart.");
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    console.error("[gemini] network error:", err.message);
    throw new AppError(502, "Could not reach the Gemini API. Check your internet connection and try again.");
  }
  if (!res.ok) {
    const detail = await res.text();
    console.error("[gemini] HTTP", res.status, detail.slice(0, 300));
    if (res.status === 400 || res.status === 403) throw new AppError(502, "Gemini rejected the request. Check that your API key is valid.");
    if (res.status === 429) throw new AppError(429, "Gemini rate limit reached. Wait a minute and try again.");
    throw new AppError(502, "Gemini is unavailable right now. Try again shortly.");
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AppError(502, "Gemini returned an empty response.");
  return text;
}

// Ask Gemini, parse JSON, validate with Zod. One controlled retry if validation fails.
async function generatePlan(input) {
  const prompt = `Career goal: ${input.career_goal}
Current skills (in the user's words): ${input.current_skills}
Experience level: ${input.experience_level}
Additional context: ${input.additional_context || "none"}`;

  let lastProblem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const fullPrompt = attempt === 1 ? prompt : `${prompt}\n\nYour previous answer was invalid (${lastProblem}). Return corrected JSON only.`;
    const text = await callGemini(fullPrompt);
    let json;
    try { json = JSON.parse(text); } catch { lastProblem = "not valid JSON"; continue; }
    const result = aiOutputSchema.safeParse(json);
    if (result.success) {
      // A brand-new plan always starts untouched, whatever the AI said.
      result.data.milestones.forEach((m) => (m.status = "not_started"));
      return result.data;
    }
    lastProblem = result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error("[zod] attempt", attempt, "failed:", lastProblem);
  }
  throw new AppError(502, "The AI response did not match the required format, even after one retry. Please try again.");
}

module.exports = { generatePlan, AppError };
