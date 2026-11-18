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
      "Access-Control-Allow-Headers": "Content-Type, X-Team-Code",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (env.ALLOWED_ORIGIN && !allowOrigin) return json({ error: "origin not allowed" }, 403, cors);

    if (!env.TEAM_CODE || request.headers.get("X-Team-Code") !== env.TEAM_CODE) {
      return json({ error: "bad team code" }, 401, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad JSON" }, 400, cors); }
    const { award, blurb, criteria, question, followups = [], answer, seconds = 90 } = body || {};
    if (!award || !question || !answer || !Array.isArray(criteria)) return json({ error: "missing fields" }, 400, cors);
    if (answer.length > 6000) return json({ error: "answer too long" }, 413, cors);

    const prompt = `You are an experienced FIRST Tech Challenge judge giving coaching feedback to a student after a practice interview answer. Be specific, encouraging, and direct. Students are usually 13–18 years old.

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

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.MODEL || "claude-sonnet-5-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) return json({ error: "upstream " + r.status, detail: await r.text() }, 502, cors);
    const out = await r.json();
    const text = (out.content || []).map(c => c.text || "").join("");
    try {
      const start = text.indexOf("{"), end = text.lastIndexOf("}");
      return json(JSON.parse(text.slice(start, end + 1)), 200, cors);
    } catch {
      return json({ error: "could not parse feedback", raw: text }, 502, cors);
    }
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}
