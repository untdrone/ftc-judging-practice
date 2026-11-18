# Judging Practice Pit — FTC BIOBUZZ

A practice tool for FIRST Tech Challenge judging interviews. Students draw a random question from the official Judging Question Bank, answer out loud with a two-minute timer, and get judge-style feedback scored against the Competition Manual's award criteria.

```
index.html          the whole app (no build step)
worker/worker.js    tiny relay that keeps your API key private
```

Cost at team scale: hosting $0, speech-to-text $0 (browser built-in), feedback roughly $4 per 500 graded answers on Sonnet (about 20 cents on Haiku).

---

## Part 1 — Put the page on GitHub Pages (5 minutes)

1. Create a new repository on GitHub, e.g. `ftc-judging-practice`. Public is fine; the page has no secrets in it.
2. Upload `index.html` (and this README) to the repository root.
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. After a minute the page is live at `https://<your-github-username>.github.io/ftc-judging-practice/`.

At this point questions, the timer, voice input (Chrome/Edge/Safari), and typed answers all work. "Get judge feedback" says it isn't set up yet. Part 2 turns it on.

## Part 2 — Deploy the feedback relay on Cloudflare (10 minutes)

The web page can't hold your API key (anyone could read it from the page source), so a small Cloudflare Worker holds it instead. Cloudflare's free plan allows 100,000 requests a day, far more than a team will ever use.

1. Get an API key at <https://console.anthropic.com> → API Keys → Create Key. Add a payment method and, under **Limits**, set a monthly spend limit (e.g. $10).
2. Sign up at <https://dash.cloudflare.com> (free).
3. **Workers & Pages → Create → Create Worker**. Name it `ftc-judge-relay`, click Deploy.
4. Click **Edit code**, delete the sample, paste the contents of `worker/worker.js`, click **Deploy**.
5. Go to the worker's **Settings → Variables and Secrets** and add:

   | Name | Type | Value |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Secret | your key from step 1 |
   | `TEAM_CODE` | Secret | a word you'll give students, e.g. `biobuzz2027` |
   | `ALLOWED_ORIGIN` | Text (optional) | `https://<your-github-username>.github.io` |
   | `MODEL` | Text (optional) | `claude-haiku-5-5` to cut cost ~20x (default is `claude-sonnet-5-5`) |

   The `ALLOWED_ORIGIN` restriction means only your GitHub Pages site can use the relay. Leave it out while testing locally, then add it.
6. Copy the worker URL shown on its overview page (looks like `https://ftc-judge-relay.<your-account>.workers.dev`).

## Part 2b — Turn on the coach view (practice log)

Every graded answer can be stored so a coach can see who practiced what, read the answers, and see the judge's notes. Storage is Cloudflare KV (free: 1 GB, 100k reads/day).

1. Cloudflare dashboard → **Storage & Databases → KV** → **Create** → name it `ftc-attempts` → Create.
2. Back in **Workers & Pages → ftc-judge-relay → Settings → Bindings** → **Add** → **KV namespace**. Variable name `ATTEMPTS`, namespace `ftc-attempts`. Save (or Deploy).
3. In **Settings → Variables and Secrets** add a secret `COACH_CODE` with a code only coaches know (different from `TEAM_CODE`).
4. Open the site with `#coach` on the end of the URL (or click the small **Coach view** link at the bottom of the page), enter the coach code, **Load log**.

The coach view shows one row per student (answers, average score, awards practiced, last practiced) and every answer newest first; click an answer to read the transcript and the judge's suggestions. "Remove this entry" deletes a single answer.

Students are identified by the name they type the first time they open the page; it's saved in their browser alongside the team code. They can change it by clicking "Practicing as …" at the bottom of the page.

## Part 3 — Connect the page to the relay

1. Open `index.html` and find the configuration block near the top of the `<script>`:
   ```js
   const RELAY_URL = "";
   ```
   Paste the worker URL between the quotes:
   ```js
   const RELAY_URL = "https://ftc-judge-relay.<your-account>.workers.dev";
   ```
2. Commit the change. GitHub Pages redeploys in about a minute.
3. Open the site. A **Team code** box appears at the top; enter the `TEAM_CODE` once per browser. Students do the same.

Draw a question, answer it, click **Get judge feedback**. The first answer confirms the whole chain works.

---

## Running it on a laptop without any hosting

Double-click `index.html`. Everything works except AI feedback (browsers block relay calls from `file://` pages). Fine for timed practice at a meeting.

## Updating the questions

Questions live in the `Q` array in `index.html`, one line each: `["Award", "Question text", ["follow-up 1", "follow-up 2"]]`. Award criteria live in the `AWARDS` object just above. When FIRST posts a new Judging Question Bank revision, edit those lines and commit.

## Troubleshooting

- **Mic button missing** — the browser has no speech recognition (Firefox). Use Chrome, Edge or Safari.
- **"Microphone not allowed"** — click the lock icon in the address bar and allow the microphone for the site.
- **"That team code isn't right"** — the code typed on the page must match `TEAM_CODE` in the worker exactly.
- **"Feedback failed (HTTP 403)"** — `ALLOWED_ORIGIN` doesn't match the site's URL. It must be the origin only (scheme + host), no path, no trailing slash.
- **"Feedback failed (HTTP 502)"** — the relay couldn't reach the API. Check the key and the spend limit in the Anthropic console.

## Privacy

Student answers are sent to the relay and on to the Anthropic API for grading. If the coach view is set up (Part 2b), each graded answer (student's first name as typed, question, transcript, score, judge's notes) is stored in your own Cloudflare KV namespace, readable only with the coach code; coaches can delete entries from the coach view. Without Part 2b nothing is stored server-side. Score history also stays in each student's own browser (localStorage). No accounts, no tracking.
