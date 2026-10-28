// Frontend: plain JavaScript, no build step. Every page reads/writes real data through /api.
const app = document.getElementById("app");
const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tags = (arr, cls = "") => arr.map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join("");
const progressOf = (plan) => {
  const done = plan.milestones.filter((m) => m.status === "completed").length;
  return { done, total: plan.milestones.length, pct: plan.milestones.length ? Math.round((done / plan.milestones.length) * 100) : 0 };
};
const fmtDate = (s) => new Date(s.replace(" ", "T") + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// One function for every API call. Throws an Error with a readable message on failure.
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    const e = new Error("Cannot reach the server. Is it running (npm start) and are you online?");
    e.network = true;
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status}).`); e.status = res.status; throw e; }
  return data;
}

// ---------- router ----------
const routes = { "": home, dashboard, studio, plans, how, plan: planDetail };
async function router() {
  const [, name = "", id] = location.hash.split("/");
  document.querySelectorAll("#links a").forEach((a) => a.classList.toggle("on", a.dataset.r === (name || "home") || (name === "plan" && a.dataset.r === "plans")));
  app.innerHTML = `<p class="muted"><span class="spin"></span> Loading…</p>`;
  try { await (routes[name] || home)(id); } catch (e) { app.innerHTML = `<div class="alert" role="alert">${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", router);
router();

// ---------- pages ----------
function home() {
  app.innerHTML = `
  <section class="hero">
    <div>
      <p class="small muted">Powered by Google Gemini, Express, SQLite and Zod</p>
      <h1>Turn your words into a <span class="mark">career blueprint.</span></h1>
      <p class="lead">Describe your goal and what you already know, in plain English. TalentVerse AI finds your skill gaps and builds a roadmap you can track, saved in a real database.</p>
      <div class="row"><a class="btn lime" href="#/studio">Build My Career Blueprint</a><a class="btn" href="#/how">Explore How It Works</a></div>
      <p class="small muted" style="margin-top:14px">No login. This is an educational demo; saved plans are visible to anyone using this local server.</p>
    </div>
    <svg viewBox="0 0 360 360" role="img" aria-label="Pipeline: input, AI, validation, database, output around the TalentVerse core">
      <circle cx="180" cy="180" r="150" fill="none" stroke="#dcd8cc" stroke-dasharray="4 6"/>
      <circle cx="180" cy="180" r="62" fill="#121212" stroke="#b6f23c" stroke-width="4"/>
      <text x="180" y="186" text-anchor="middle" fill="#b6f23c" font-size="13" font-family="Inter" font-weight="600">TalentVerse</text>
      ${[["Input", 180, 30], ["AI", 310, 180], ["Zod", 255, 305], ["DB", 105, 305], ["Output", 50, 180]]
        .map(([t, x, y]) => `<line x1="180" y1="180" x2="${x}" y2="${y}" stroke="#dcd8cc"/><circle cx="${x}" cy="${y}" r="32" fill="#faf8f3" stroke="#121212" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="13" font-weight="600" font-family="Inter">${t}</text>`).join("")}
    </svg>
  </section>
  <section class="grid3">
    <div><h3>Plain-English input</h3><p class="muted">No dropdown maze. Write how you would explain your goal to a friend.</p></div>
    <div><h3>Checked, not trusted</h3><p class="muted">The server validates every AI answer against a strict schema before saving it.</p></div>
    <div><h3>Progress that persists</h3><p class="muted">Mark milestones done. The status is stored in the database and survives a refresh.</p></div>
  </section>
  <section class="panel">
    <h3>Example blueprint <span class="badge">EXAMPLE ONLY</span></h3>
    <p class="muted small">This is static sample content, not from your database. Your real plans appear after you generate one.</p>
    <div class="timeline">
      <div class="ms completed"><b>Python for data work</b><div class="muted small">3 weeks · NumPy, pandas</div></div>
      <div class="ms in_progress"><b>Machine learning foundations</b><div class="muted small">4 weeks · scikit-learn, evaluation</div></div>
      <div class="ms"><b>Deploy a model behind an API</b><div class="muted small">2 weeks · FastAPI, Docker</div></div>
    </div>
  </section>`;
}

async function dashboard() {
  const plans = await api("/plans");
  const all = plans.flatMap((p) => p.milestones);
  const done = all.filter((m) => m.status === "completed").length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const head = `<p class="small muted">Dashboard</p><div class="row" style="justify-content:space-between;align-items:end;margin:0 0 30px"><h1 style="font-size:3.4rem">Your career workspace.</h1><a class="btn lime" href="#/studio">New Blueprint</a></div>`;
  if (!plans.length) {
    app.innerHTML = head + `<div class="empty panel"><h3>No career plans yet</h3><p class="muted">Build your first blueprint and it will show up here, with progress tracked.</p><a class="btn lime" href="#/studio">Build Your First Blueprint</a></div>`;
    return;
  }
  app.innerHTML = head + `
  <div class="grid3" style="margin-top:0">
    <div class="panel"><div class="stat">${plans.length}</div><p class="muted">saved career plan${plans.length === 1 ? "" : "s"}</p></div>
    <div class="panel"><div class="stat">${done}/${all.length}</div><p class="muted">milestones completed</p></div>
    <div class="panel"><div class="stat">${pct}%</div><div class="bar" aria-label="Overall progress"><i style="width:${pct}%"></i></div></div>
  </div>
  <h2 style="margin:40px 0 18px">Recent plans</h2>
  <div class="cards">${plans.slice(0, 4).map(planCard).join("")}</div>`;
}

const planCard = (p) => {
  const pr = progressOf(p);
  return `<a class="panel" href="#/plan/${p.id}" style="text-decoration:none;display:block">
    <span class="pri ${p.priority}">${esc(p.priority)} priority</span>
    <h3 style="margin:14px 0 8px">${esc(p.career_goal)}</h3>
    <p class="muted small">${p.skill_gaps.length} skill gaps · ${pr.done}/${pr.total} milestones · saved ${fmtDate(p.created_at)}</p>
    <div class="bar"><i style="width:${pr.pct}%"></i></div></a>`;
};

// ----- Blueprint Studio (the form + live pipeline) -----
const STAGES = [
  ["Receiving input", "Your details are sent to the backend."],
  ["AI extraction", "Gemini extracts structured career data."],
  ["Schema validation", "Zod checks the AI output."],
  ["Saving to database", "The validated plan is stored in SQLite."],
  ["Blueprint ready", "The saved record is returned."],
];
const SAMPLE = {
  career_goal: "AI Engineer",
  current_skills: "I know Python and basic machine learning, but I need to improve deep learning, NLP, APIs, and deployment.",
  experience_level: "intermediate",
  additional_context: "I can study about 10 hours a week and want an internship in 6 months.",
};
let level = "beginner";

function studio() {
  level = "beginner";
  app.innerHTML = `
  <p class="small muted">Blueprint Studio</p><h1>Describe your career.</h1>
  <p class="muted" style="max-width:40em;margin:14px 0 30px">Tell the AI your goal and what you already know. It returns a structured roadmap that is validated and saved to your database.</p>
  <div class="studio">
    <form id="f" novalidate>
      <button type="button" class="btn small" id="sample">Fill with sample input</button>
      <label for="goal">Career goal *</label>
      <input id="goal" maxlength="300" placeholder="e.g. AI Engineer, Data Scientist, Frontend Developer" />
      <label for="skills">Current skills <span class="muted" style="font-weight:400">(natural language is fine)</span></label>
      <textarea id="skills" maxlength="2000" placeholder="e.g. I know Python and basic ML, but I need to improve deep learning, NLP, APIs and deployment."></textarea>
      <span class="count" id="cnt">0/2000</span>
      <label id="lvl-l">Experience level</label>
      <div class="seg" role="group" aria-labelledby="lvl-l">${["beginner", "intermediate", "advanced"].map((l) => `<button type="button" class="btn" data-l="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>
      <label for="ctx">Additional context <span class="muted" style="font-weight:400">(optional)</span></label>
      <textarea id="ctx" style="min-height:80px" maxlength="1000" placeholder="Interests, constraints, target timeline…"></textarea>
      <div id="msg" role="alert"></div>
      <button class="btn lime" id="go" type="submit">Generate My Blueprint</button>
    </form>
    <aside class="panel" aria-live="polite"><h3>Processing pipeline</h3><p class="muted small">Stages update as your request runs on the server.</p><div id="stages"></div></aside>
  </div>`;
  const $ = (id) => document.getElementById(id);
  const setLevel = (l) => { level = l; document.querySelectorAll("[data-l]").forEach((b) => b.classList.toggle("sel", b.dataset.l === l)); };
  setLevel("beginner");
  document.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => setLevel(b.dataset.l)));
  $("skills").oninput = () => ($("cnt").textContent = `${$("skills").value.length}/2000`);
  $("sample").onclick = () => { $("goal").value = SAMPLE.career_goal; $("skills").value = SAMPLE.current_skills; $("ctx").value = SAMPLE.additional_context; setLevel(SAMPLE.experience_level); $("skills").oninput(); };
  drawStages(STAGES.map(() => "idle"));

  $("f").onsubmit = async (e) => {
    e.preventDefault();
    const body = { career_goal: $("goal").value, current_skills: $("skills").value, experience_level: level, additional_context: $("ctx").value };
    // Friendly client-side check; the server still validates everything again.
    if (body.career_goal.trim().length < 3) return showMsg("Please enter your career goal (at least 3 characters).");
    if (body.current_skills.trim().length < 5) return showMsg("Please describe your current skills (at least 5 characters).");
    showMsg("");
    $("go").disabled = true; $("go").innerHTML = `<span class="spin"></span> Working…`;
    // The browser sends ONE request; the server runs stages 2-4. These stay "running" until the server answers.
    drawStages(["ok", "run", "run", "run", "idle"]);
    try {
      const saved = await api("/plans/generate", { method: "POST", body: JSON.stringify(body) });
      drawStages(["ok", "ok", "ok", "ok", "ok"]);
      setTimeout(() => (location.hash = "#/plan/" + saved.id + "?new"), 700);
    } catch (err) {
      // Mark the stage that failed, based on the error the server returned.
      const failAt = err.network ? 0 : err.status === 400 ? 0 : /saved to the database/.test(err.message) ? 3 : /format/.test(err.message) ? 2 : 1;
      drawStages(STAGES.map((_, i) => (i < failAt ? "ok" : i === failAt ? "fail" : "idle")));
      showMsg(err.message);
      $("go").disabled = false; $("go").textContent = "Generate My Blueprint";
    }
  };
  function showMsg(t) { $("msg").innerHTML = t ? `<div class="alert">${esc(t)}</div>` : ""; }
  function drawStages(states) {
    $("stages").innerHTML = STAGES.map(([t, d], i) => `<div class="stage ${states[i]}"><div class="dot">${states[i] === "ok" ? "✓" : states[i] === "fail" ? "!" : ""}</div><div><b>${t}</b><span class="t">${d}</span></div></div>`).join("");
  }
}

// ----- one saved plan (the generated blueprint) -----
async function planDetail(idWithQuery) {
  const [id, q] = String(idWithQuery || "").split("?");
  const plan = await api("/plans/" + encodeURIComponent(id));
  const pr = progressOf(plan);
  app.innerHTML = `
  ${q === "new" ? `<div class="alert ok" role="status">Blueprint generated and saved to the database (record #${plan.id}).</div>` : ""}
  <a href="#/plans" class="muted small">← All saved plans</a>
  <div class="row" style="justify-content:space-between;align-items:end"><h1 style="font-size:3.2rem;margin-top:10px">${esc(plan.career_goal)}</h1><span class="pri ${plan.priority}">${esc(plan.priority)} priority</span></div>
  <div class="grid3">
    <div><h3>Your current skills</h3><p>${plan.current_skills.length ? tags(plan.current_skills) : '<span class="muted">None listed.</span>'}</p></div>
    <div><h3>Skill gaps <span class="badge">AI-GENERATED</span></h3><p>${tags(plan.skill_gaps, "gap")}</p></div>
    <div><h3>Your progress <span class="badge">YOURS</span></h3><div class="stat">${pr.pct}%</div><div class="bar"><i id="pbar" style="width:${pr.pct}%"></i></div><p class="muted small" id="ptxt">${pr.done} of ${pr.total} milestones completed</p></div>
  </div>
  <h2>Learning timeline <span class="badge">AI-GENERATED</span></h2>
  <p class="muted small">The milestones are AI suggestions. The status dropdowns are your real progress, saved when you change them.</p>
  <div id="err" role="alert"></div>
  <div class="timeline">${plan.milestones.map((m, i) => `
    <div class="ms ${m.status}" id="ms${i}">
      <h3>${esc(m.title)}</h3><div class="muted small">${esc(m.duration)}</div>
      <p style="margin:8px 0">${esc(m.description)}</p>${tags(m.skills)}
      <div style="margin-top:10px"><label class="small" style="display:inline;margin-right:8px" for="s${i}">Status</label>
      <select id="s${i}" data-i="${i}">${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${v === m.status ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>`).join("")}</div>
  <div class="row"><button class="btn danger" id="del">Delete this plan</button></div>`;

  document.querySelectorAll("select[data-i]").forEach((sel) => {
    sel.onchange = async () => {
      const i = sel.dataset.i, previous = plan.milestones[i].status;
      sel.disabled = true;
      try {
        const updated = await api(`/plans/${plan.id}/milestones/${i}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
        plan.milestones = updated.milestones;
        document.getElementById("ms" + i).className = "ms " + sel.value;
        const p = progressOf(updated);
        document.getElementById("pbar").style.width = p.pct + "%";
        document.getElementById("ptxt").textContent = `${p.done} of ${p.total} milestones completed`;
        document.getElementById("err").innerHTML = "";
      } catch (err) {
        sel.value = previous; // revert: we never pretend a failed save worked
        document.getElementById("err").innerHTML = `<div class="alert">Could not save progress: ${esc(err.message)}</div>`;
      } finally { sel.disabled = false; }
    };
  });
  document.getElementById("del").onclick = async () => {
    if (!confirm(`Delete the plan "${plan.career_goal}"? This cannot be undone.`)) return;
    try { await api("/plans/" + plan.id, { method: "DELETE" }); location.hash = "#/plans"; }
    catch (err) { document.getElementById("err").innerHTML = `<div class="alert">Could not delete: ${esc(err.message)}</div>`; }
  };
}

// ----- saved plans library -----
async function plans() {
  const all = await api("/plans");
  app.innerHTML = `<p class="small muted">Saved plans</p><h1 style="font-size:3.4rem">Your library.</h1>
    <label for="q" class="small">Search by career goal</label><input id="q" placeholder="Search…" style="max-width:420px" />
    <div class="cards" id="list" style="margin-top:26px"></div>`;
  const draw = () => {
    const q = document.getElementById("q").value.trim().toLowerCase();
    const shown = all.filter((p) => p.career_goal.toLowerCase().includes(q));
    document.getElementById("list").innerHTML = shown.length
      ? shown.map(planCard).join("")
      : `<div class="empty panel" style="grid-column:1/-1"><h3>${all.length ? "No plans match your search" : "No saved plans yet"}</h3>${all.length ? "" : '<a class="btn lime" href="#/studio">Build a Blueprint</a>'}</div>`;
  };
  document.getElementById("q").oninput = draw;
  draw();
}

// ----- how it works -----
async function how() {
  let health = "";
  try {
    const h = await api("/health");
    health = `<div class="alert ${h.gemini_key_configured ? "ok" : ""}">Live status — server: running · Gemini key configured: <b>${h.gemini_key_configured ? "yes" : "NO (add it to .env)"}</b> · plans in database: <b>${h.plans_in_database}</b></div>`;
  } catch { health = `<div class="alert">Server is not reachable.</div>`; }
  const steps = [
    ["User submits career information", "The form sends a JSON POST request to /api/plans/generate.", "public/app.js → studio()"],
    ["Backend receives the request", "Express checks the size, then Zod validates the incoming fields.", "server/index.js, server/schemas.js"],
    ["Gemini generates structured JSON", "The server calls Gemini with a system instruction and a response schema. The API key stays on the server.", "server/gemini.js → callGemini()"],
    ["Zod validates the AI output", "The reply is parsed and checked. If invalid, one controlled retry runs, then an error is returned.", "server/gemini.js → generatePlan()"],
    ["SQLite stores the record", "Only after validation does an INSERT run. If it fails, an error is returned, never a fake success.", "server/db.js → insertPlan()"],
    ["Frontend shows the saved result", "The saved row, with its id and timestamps, is returned and rendered as your blueprint.", "public/app.js → planDetail()"],
  ];
  app.innerHTML = `<p class="small muted">How it works</p><h1 style="font-size:3.4rem">The technical pipeline.</h1>
    <p class="muted" style="margin:14px 0 24px;max-width:40em">Six stages, in order. A stage is shown as done only when it actually succeeded.</p>${health}
    <div class="timeline">${steps.map(([t, d, f], i) => `<div class="ms"><p class="small muted" style="margin:0">Stage ${i + 1}</p><h3>${t}</h3><p>${d}</p><code class="small muted">${f}</code></div>`).join("")}</div>`;
}
