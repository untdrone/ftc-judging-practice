/**
 * Judging Practice Pit — feedback relay (Cloudflare Worker)
 *
 * Holds the Anthropic API key so it never appears in the public web page.
 * The page sends the question + the student's answer; this worker asks Claude
 * for judge-style feedback and returns JSON.
 *
 * Secrets to set in the Cloudflare dashboard (Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY  — from https://console.anthropic.com
 *   TEAM_CODE          — any word/phrase you give your students (e.g. "biobuzz2027")
 *   COACH_CODE         — a different code only coaches know; unlocks the practice log
 * Binding (Settings → Bindings → Add → KV namespace):
 *   ATTEMPTS           — a KV namespace; every graded answer is stored here for the coach view
 * Optional variables:
 *   ALLOWED_ORIGIN     — your GitHub Pages URL, e.g. https://yourname.github.io
 *                        (leave unset while testing; set it before sharing widely)
 *   MODEL              — defaults to claude-sonnet-5-5; use claude-haiku-5-5 to cut cost ~20x
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = env.ALLOWED_ORIGIN ? (origin === env.ALLOWED_ORIGIN ? origin : "") : "*";
    const cors = {
      "Access-Control-Allow-Origin": allowOrigin || "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Team-Code, X-Coach-Code",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (env.ALLOWED_ORIGIN && !allowOrigin) return json({ error: "origin not allowed" }, 403, cors);

    // ---- Coach view: GET /log  (header X-Coach-Code) → every stored attempt, newest first
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/log") {
      if (!env.COACH_CODE || request.headers.get("X-Coach-Code") !== env.COACH_CODE) return json({ error: "bad coach code" }, 401, cors);
      if (!env.ATTEMPTS) return json({ error: "storage not set up: add a KV binding named ATTEMPTS to this worker" }, 500, cors);
      const listed = await env.ATTEMPTS.list({ prefix: "a:", limit: 1000 });
      const keys = listed.keys.slice(0, 300);
      const rows = await Promise.all(keys.map(async k => { try { return JSON.parse(await env.ATTEMPTS.get(k.name)); } catch { return null; } }));
      return json({ attempts: rows.filter(Boolean), total: listed.keys.length }, 200, cors);
    }
    if (request.method === "DELETE" && url.pathname === "/log") {
      if (!env.COACH_CODE || request.headers.get("X-Coach-Code") !== env.COACH_CODE) return json({ error: "bad coach code" }, 401, cors);
      const id = url.searchParams.get("id");
      if (!id || !env.ATTEMPTS) return json({ error: "missing id" }, 400, cors);
      await env.ATTEMPTS.delete(id);
      return json({ ok: true }, 200, cors);
    }
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    if (!env.TEAM_CODE || request.headers.get("X-Team-Code") !== env.TEAM_CODE) {
      return json({ error: "bad team code" }, 401, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad JSON" }, 400, cors); }
    const { award, blurb, criteria, question, followups = [], answer, seconds = 90, student = "", team = "", mode = "grade" } = body || {};
    if (!award || !question || !Array.isArray(criteria)) return json({ error: "missing fields" }, 400, cors);
    if (String(team).length > 12000) return json({ error: "team sheet too long" }, 413, cors);
    const teamBlock = team ? `\nTEAM FACT SHEET (from the team's engineering portfolio; treat as ground truth about this team):\n"""\n${team}\n"""\n` : "";

    // ---- Talking points: what a strong answer to this question would cover, from the fact sheet
    if (mode === "hints") {
      const hp = `You are a FIRST Tech Challenge coach helping a student prepare for the judging interview.
${teamBlock}
AWARD: ${award} Award — ${blurb || ""}
AWARD CRITERIA: ${criteria.join("; ")}
QUESTION: ${question}${followups.length ? "\nFOLLOW-UPS: " + followups.join(" | ") : ""}

Write 4-6 short talking points a student on THIS team should hit when answering, drawn only from the fact sheet (never invent facts; if the sheet has nothing for a point, say what kind of detail the student should add from their own experience, in [brackets]). Each point: one line, concrete, with the real numbers, names of events, tools or methods from the sheet. Then one line "Shape:" describing a 60-90 second structure for the answer.
Return ONLY JSON: {"points": ["..."], "shape": "..."}`;
      const hr = await callClaude(env, hp, 1800);
      if (!hr.ok) return json({ error: "upstream " + hr.status, detail: hr.detail }, 502, cors);
      try { return json(parseLoose(hr.text), 200, cors); } catch { return json({ error: "could not parse hints", detail: "stop_reason=" + hr.out.stop_reason + "; reply: " + hr.text.slice(0, 400) }, 502, cors); }
    }

    if (!answer) return json({ error: "missing fields" }, 400, cors);
    if (answer.length > 6000) return json({ error: "answer too long" }, 413, cors);

    const prompt = `You are an experienced FIRST Tech Challenge judge giving coaching feedback to a student after a practice interview answer. Be specific, encouraging, and direct. Students are usually 13–18 years old.
${teamBlock}
AWARD: ${award} Award
AWARD PURPOSE: ${blurb || ""}
AWARD CRITERIA (from the FTC Competition Manual):
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

QUESTION ASKED: ${question}
${followups.length ? "JUDGE FOLLOW-UP PROMPTS: " + followups.join(" | ") : ""}

STUDENT'S SPOKEN ANSWER (transcribed; ignore transcription errors and filler words; it took about ${seconds} seconds):
"""
${answer}
"""

Evaluate how well the answer would help this team be a contender for this award. Judges value: specific examples with names, numbers, and dates over generalities; evidence (data, tests, documents) over claims; a clear structure (situation → what we did → result → what we learned); the whole team being able to speak; staying within about two minutes.
${team ? `Use the TEAM FACT SHEET: (a) reward answers that cite the team's real work; (b) in "improve", name the specific facts from the sheet the student left out that would have strengthened the answer (e.g. the actual numbers, events, methods); (c) if the student says something that contradicts the sheet, point it out gently as "check this against the portfolio"; (d) write the "model" answer using the team's real facts, in the student's voice, with no bracket placeholders except for things the sheet does not cover.` : ""}

Return ONLY a JSON object with this exact shape and nothing else:
{
 "overall": <integer 1-5>,
 "verdict": "<one sentence summary a judge would write in their notes>",
 "criteria": [ {"name": "<short name of criterion>", "score": <integer 1-5>, "note": "<one sentence: what the answer did or missed for this criterion>"} ],
 "strengths": ["<2-3 specific things that worked>"],
 "improve": ["<2-4 concrete, actionable changes; quote or reference what the student said>"],
 "followups": ["<2 follow-up questions a judge would likely ask next based on this answer>"],
 "model": "<a 3-5 sentence example of a stronger answer in the student's own voice, using plausible placeholders in [brackets] for details they would fill in>"
}
Score every criterion listed above, in order. Use 1 = not addressed, 3 = mentioned without evidence, 5 = specific, evidenced, and clearly tied to the criterion.`;

    const res = await callClaude(env, prompt, 3000);
    if (!res.ok) return json({ error: "upstream " + res.status, detail: res.detail }, 502, cors);
    const out = res.out, text = res.text;
    const done = async (fb) => {
      if (env.ATTEMPTS && fb && typeof fb.overall === "number") {
        const t = Date.now();
        const id = "a:" + String(1e13 - t).padStart(13, "0") + ":" + Math.random().toString(36).slice(2, 8);
        const rec = { id, t, student: String(student).slice(0, 60) || "Unnamed", award, question, answer: answer.slice(0, 4000), seconds,
                      overall: fb.overall, verdict: fb.verdict || "", criteria: fb.criteria || [], improve: fb.improve || [] };
        try { await env.ATTEMPTS.put(id, JSON.stringify(rec)); } catch {}
      }
      return json(fb, 200, cors);
    };
    try {
      return await done(parseLoose(text));
    } catch {
      return json({ error: "could not parse feedback", detail: "stop_reason=" + out.stop_reason + "; reply: " + text.slice(0, 400) }, 502, cors);
    }
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}

async function callClaude(env, prompt, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.MODEL || "claude-sonnet-5-5", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) return { ok: false, status: r.status, detail: await r.text() };
  const out = await r.json();
  return { ok: true, out, text: (out.content || []).map(c => c.text || "").join("") };
}

// Parse JSON out of a model reply, tolerating prose around it, code fences, and a reply cut off mid-way.
function parseLoose(text) {
  let t = text.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  if (start < 0) throw new Error("no JSON");
  if (end > start) { try { return JSON.parse(t.slice(start, end + 1)); } catch {} }
  t = t.slice(start);
  const stack = []; let inStr = false, esc = false;
  for (const ch of t) {
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{") stack.push("}"); else if (ch === "[") stack.push("]"); else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, "").replace(/:\s*$/, ": null");
  t += stack.reverse().join("");
  return JSON.parse(t);
}
