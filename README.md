# BSS AI Email Generator

A browser-based tool that turns simple inputs (purpose, recipient, key points, tone, length) into ready-to-send recruiting emails — with programmatic quality guardrails, draft history, and production-grade key handling. Built for the Bangalore Strategic Solutions **AI Automation Intern** assignment.

**Live demo:** https://bssemail.netlify.app — no API key or setup needed; open it and generate.
**Code:** https://github.com/Gkirna/bss
**Run locally:** download the repo and double-click `index.html` (you'll paste your own free Gemini or OpenAI key — see [Two runtime modes](#two-runtime-modes)).

---

## How a recruiter uses it

1. Pick a **quick-start template** (or fill the form): purpose, who it's going to, recipient name/designation, key points, tone, length.
2. Click **Generate email** → a subject line and complete email appear, with quality-check chips underneath.
3. **Refine** ("make it shorter", "add urgency"), **Regenerate** for a fresh take, or click into the email and **edit it directly** — then **Copy email** or **Open in mail app**.

No instructions needed beyond what's on screen — that was the assignment's usability bar.

---

## Assignment requirements — all covered

| Requirement (from the brief) | Where |
|---|---|
| Inputs: purpose, recipient + designation, key points, tone (4 options) | Form, left panel |
| Output: complete email body + subject line | Output panel |
| Regenerate + refinement text box | Refine row with quick chips; Regenerate button |
| ≥3 quick-start templates that auto-fill the form | 4 built-ins: Interview Scheduling, Offer Follow-up, Client Status Update, Candidate Rejection |
| Length toggle that *actually* changes output | Hard word/paragraph contracts, enforced by validation (see Guardrails) |
| One-click copy with clean formatting | Copy email / Copy subject |
| Edge-case handling | See [table below](#edge-case-handling) |
| System prompt shown | In `index.html` (search `SYSTEM_PROMPT`) and [explained below](#the-system-prompt) |
| API key kept out of code | Two runtime modes, both keyless-in-code (below) |

---

## Feature guide

### Generation core
- **Tone** (Professional / Friendly / Formal / Assertive) — each has a concrete behavioral definition in the system prompt, including greeting style, not just a label.
- **Audience** (Candidate / Client / Internal team) — changes register *and* adds confidentiality rules: e.g. client-side details (budgets, other candidates) are never revealed in candidate emails.
- **Length contracts** — Concise: 3–4 sentences / 40–80 words; Standard: 100–160 words; Detailed: 200–320 words in 4+ paragraphs with mandatory structure (context → elaborated key points → next steps → close). Stated in the system prompt, restated per-request, and *verified in code* after generation.

### Job-description awareness
Paste a JD, or attach / drag-and-drop a **.pdf, .docx, .txt or .md** file — parsed entirely in the browser (parser libraries load on demand; the file is never uploaded anywhere). The model is instructed to extract only what strengthens the email (role title, company, 2–3 headline skills, location) and never dump JD text wholesale. Input capped at 8K characters to bound token cost. The JD is also declared **untrusted data** in the system prompt: instructions hidden inside a JD ("ignore your rules…") are explicitly ignored — prompt-injection defense.

### Guardrail engine (validation, not hope)
After every generation, **JavaScript — not the model — checks the draft**:

1. **Length** — word count must fall inside the selected setting's range (skipped when a refinement like "make it shorter" deliberately overrides length).
2. **Template clichés** — banned-phrase scan ("I hope this email finds you well", "please do not hesitate", …).
3. **Plain text** — no markdown symbols leaking into the email.
4. **Fact presence** — times, weekdays, and numbers from the key points must actually appear in the email (soft warning, since "5" may legitimately become "five").

**Self-correction loop:** if a hard check fails, the failed draft plus its failure list is automatically sent back to the model for one corrective rewrite ("Improving draft…" on the button); the cleaner draft wins. Results render as green/amber **chips under every email**, stored per version, with an "auto-corrected" chip when the loop fired.

**Placeholder guardrail:** missing details become visible `[bracketed placeholders]` rather than invented facts (anti-hallucination rule) — and if a draft still contains one, **Copy** and **Open in mail app** raise a warning naming it, so "[interview time]" never reaches a real candidate.

### Iteration tools
- **Refine** — free-text instruction plus quick chips; the previous email is fed back with the instruction and a requirement that the change be clearly noticeable.
- **Regenerate** — same facts, explicitly different wording and structure.
- **Follow-up** — one click drafts a polite chase email referencing the current one (shorter, restates the ask).
- **Version navigation (◀ v2/4 ▶)** — every result is kept in the session chain; a refinement never destroys a draft you preferred. Versions survive a page reload.
- **Edit-in-place** — click into the email and type; Copy/Send/Refine all use the edited text. Human-in-the-loop by design: the AI drafts, the recruiter approves.

### Draft history
The last **50 generated emails are archived locally** (browser storage only — nothing leaves the machine). The **History** button lists them with subject, recipient, length, and timestamp; clicking one reloads it into the working chain — Refine, Follow-up, and Copy all work on it, and its quality chips and telemetry come back with it. Individual delete and clear-all included.

### Personal prompt library
**Save as template** captures the current form under a name you type in an inline row (pre-suggested from the selected template or purpose; Enter saves; saving an existing name updates it). Saved templates appear in the dropdown under "My templates" and persist in the browser. The 4 built-ins plus this turn the tool into a growing, reusable prompt library.

### Telemetry (LLM-ops)
Under each draft: provider + model used, end-to-end latency, input/output token counts, and the **prompt version** — a constant bumped on every system-prompt change so quality shifts are traceable to an exact revision. Server-side, every request emits one structured JSON log line (provider, model, latency, tokens, prompt version, outcome) visible in Netlify's function logs. **No prompt or email content is ever logged** — privacy by design.

---

## Two runtime modes

The app probes its host at load and picks the right mode automatically:

| Mode | When | Key handling |
|---|---|---|
| **Managed-key** (the live demo) | Deployed on Netlify with server env vars | The key lives only in the environment of `netlify/functions/generate.mjs`. The browser never sees it — no key UI is shown at all. |
| **Bring-your-own-key** | Local file, or any static host | Each user pastes a free Gemini key (`AIza…`) or OpenAI key (`sk-…`) — stored only in *their* browser's localStorage, sent over HTTPS directly to the provider. Never in code, never uploaded. |

**Provider strategy:** Gemini (free tier — anyone can try it without a card) and OpenAI, each with a fallback list of model names (naming varies by account/region; the first working model is remembered). The same system prompt drives both providers unchanged — the prompt design is provider-agnostic. Both are called in JSON mode (Gemini `responseSchema` / OpenAI `json_object`), so `{subject, body}` parsing can never break.

**Proxy hardening** (managed mode): requests are rejected unless they originate from the site itself; per-IP rate limit (10 generations/minute); input size caps; per-request output-token caps; and the final backstop is a spending limit set at the provider. Defense in depth — because client-visible checks alone can always be spoofed.

---

## The system prompt

The full prompt is in `index.html` (search `SYSTEM_PROMPT`). What each part does:

- **Role**: an experienced BSS recruitment consultant whose emails are sent as-is — sets register and stakes.
- **Hard anti-hallucination rule**: use *only* facts provided; missing details become visible `[placeholders]`, never invented dates/links/figures.
- **Anti-template rules**: banned openers and filler phrases, instruction to vary sentence structure — so output sounds human, not generated.
- **Tone definitions** with concrete greeting/register behavior per tone.
- **Audience definitions** with confidentiality boundaries per audience.
- **JD extraction rules** plus the untrusted-data clause (prompt-injection defense).
- **Length contracts** with numeric ranges and a self-count instruction.
- **Vague-input handling**: a missing purpose is inferred from the key points instead of refusing.
- **Output contract**: strict JSON `{subject, body}`, blank-line paragraphs, no markdown.

Refinements feed the previous email back with the user's instruction and require a clearly noticeable change; regenerates require different wording with the same facts; follow-ups are generated as new emails referencing the prior one.

---

## Edge-case handling

| Situation | Behavior |
|---|---|
| Everything empty | Blocked with a friendly message — nothing to write from |
| No key (key mode) | Blocked with a pointer to the free-key link; wrong-format key caught with a specific hint |
| No recipient name | Warning; sensible generic greeting used |
| No purpose, key points given | Warning; purpose inferred from key points |
| No key points | Warning; general email with visible `[placeholders]` |
| Missing specifics (time, link…) | `[bracketed placeholders]` + copy/send warning — never invented |
| JD with hidden instructions | Ignored (untrusted-data rule) |
| Scanned/unreadable JD file | Clear message: paste the text instead |
| Model unavailable on the account | Automatic fallback through a list of model names |
| Invalid key / no credits / rate limit / network error | Each mapped to a specific human-readable message |
| Draft fails quality checks | One automatic corrective rewrite, then honest chips |

---

## Architecture

- **One HTML file** (`index.html`): all UI, prompt engineering, guardrails, and state — vanilla HTML/CSS/JS, no frameworks, no build step, per the assignment's "we want to see your code" rule. Commented throughout.
- **One serverless function** (`netlify/functions/generate.mjs`): the managed-key proxy with logging and abuse protection. The app works fully without it (key mode) — it's an enhancement, not a dependency.
- Desktop layout is an app shell: form pane and output pane scroll independently (like a mail client); narrow screens fall back to a normal single-column page.

## Known limitations

- "Open in mail app" can truncate very long Detailed emails (mailto URL limits in some clients) — Copy is the primary path.
- The fact-presence check can't match numbers written as words ("five") — hence a warning, not a block.
- Serverless rate-limit memory resets on cold starts — the provider-side spending cap is the true cost backstop.
- History and saved templates are per-browser (no accounts/sync) — a deliberate scope choice; the roadmap in `MASTERPLAN.md` covers the multi-user version.
- English output only for now.

## Repo guide

| File | What it is |
|---|---|
| `index.html` | The entire application (UI + prompts + guardrails) |
| `netlify/functions/generate.mjs` | Managed-key proxy (env keys, origin check, rate limit, logs) |
| `netlify.toml` | Netlify build/functions config |
| `DEPLOYMENT.md` | Both hosting modes, step by step |
| `MASTERPLAN.md` | Production roadmap (pipeline integration, evals, agentic automation) |
