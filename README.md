# BSS AI Email Generator

A browser-based tool that turns simple inputs (purpose, recipient, key points, tone, length) into ready-to-send recruiting emails. Built for the Bangalore Strategic Solutions **AI Automation Intern** assignment.

**Live demo:** https://gkirna.github.io/bss/

---

## How to use it

1. Open the link (or just double-click `index.html` — no install, no server).
2. Paste an API key into the bar at the top (one-time — it's remembered by your browser). Two options, auto-detected from the key format:
   - a **free Gemini key** from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (`AIza…`), or
   - an **OpenAI key** from [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (`sk-…`, requires paid credits).
3. Pick a quick-start template or fill in the form, choose a tone and length, and click **Generate email**.
4. Use **Regenerate** for a fresh take, or type an instruction like *"make it shorter"* and click **Refine**.
5. **Copy email** puts the whole thing (subject + body, clean paragraphs) on your clipboard.

## Which API and why

The tool supports **two providers, auto-detected from the key prefix** — Google Gemini (primary) and OpenAI (alternative):

1. **Gemini as the default** because of its **free tier** — a recruiter (or an evaluator!) can try the tool without a credit card.
2. **Browser-friendly** — both REST endpoints allow direct calls from a web page (CORS-enabled), so the whole tool is a single static HTML file with no backend, as the assignment requires ("no installs, no local servers").
3. **Guaranteed JSON** — Gemini's `responseSchema` and OpenAI's `response_format: json_object` both force parseable `{subject, body}` output. No fragile string parsing.
4. **Resilience** — each provider has a fallback list of model names (model naming varies by account/region); the first one that works is remembered by the browser. The same system prompt drives both providers unchanged, which shows the prompt design is provider-agnostic.

## How the API keys are kept secure and out of the code

- **No key ever appears in the source.** Users paste their own key(s) at runtime — Gemini and OpenAI each have a separate field, and a "Use" switch picks the active provider (auto-selected when only one key is saved).
- **Keys live only in that user's browser** (`localStorage`), scoped to this site by the browser's same-origin policy. They never appear in the repo, the hosted files, or any server logs — there is no server.
- **Keys travel only over HTTPS, directly to the chosen provider** (Google or OpenAI). No third party, including the tool's host, ever sees them.
- In a production rollout I would go one step further: a tiny serverless proxy holding one company key, so end users paste nothing at all — see Limitations.

## The system prompt (and what it does)

The full prompt is in `index.html` (search for `SYSTEM_PROMPT`). The design in brief:

- **Role**: the model acts as an experienced BSS recruitment consultant whose emails are sent as-is.
- **Anti-hallucination hard rule**: use *only* the facts provided; missing details become visible `[bracketed placeholders]` instead of invented dates/links — critical for a tool whose output gets sent to real candidates and clients.
- **Anti-template rule**: banned phrases ("I hope this email finds you well", "please do not hesitate"…) and an instruction to vary sentence structure, so the output sounds human.
- **Tone definitions**: each of the 4 tones (Professional / Friendly / Formal / Assertive) gets a concrete behavioral definition — including greeting style — rather than just a label.
- **Length definitions with hard numbers**: Concise = 3–4 sentences / ~50–80 words, Standard ≈ 100–160 words, Detailed ≈ 180–280 words with an explicit next-steps close. This is what makes the length toggle *actually* change the output.
- **Vague-input handling**: if purpose is missing, the model infers intent from the key points instead of refusing.
- **Output contract**: strict JSON `{subject, body}`, paragraphs separated by blank lines, no markdown — enforced doubly by Gemini's `responseSchema`.

Refinement works by feeding the previous email back to the model along with the user's instruction ("make it shorter", "add urgency") and requiring a *clearly noticeable* change while keeping facts intact. Plain Regenerate does the same but asks for "different wording and structure — same facts, fresh take."

## Beyond the brief (bonus features)

- **JD-aware emails** — paste or attach a job description; the model extracts only the relevant details (role title, company, headline skills) and weaves them in, per an explicit anti-dumping rule in the system prompt. Input is capped at 8K characters to control token usage.
- **Audience targeting** — Candidate / Client / Internal team changes register and confidentiality rules (e.g. never reveal client-side details to a candidate).
- **Two providers, auto-fallback models** — Gemini (free) and OpenAI, each with its own key field; the same system prompt drives both, showing the prompt design is provider-agnostic.
- **Version history** — every Generate/Refine result is kept; browse drafts with ◀ ▶ so a refinement never destroys a version the recruiter preferred. Drafts survive a page reload.
- **Draft history** — the last 50 generated emails are archived locally; a History panel lets the recruiter reload yesterday's draft (refine/copy work on it), delete entries, or clear all. Nothing leaves the browser.
- **Telemetry per draft** — model, latency, token usage, and prompt version shown under each email; the server logs the same as structured JSON (no content logged) for LLM-ops observability.
- **Edit-in-place** — click into the generated email and tweak it; copy/send uses the edited text (human-in-the-loop by design).
- **Open in mail app** — one click opens the default email client with subject and body prefilled.
- **Guardrail engine with self-correction** — every draft is *programmatically* validated, not just prompt-hoped: word count vs. the selected length spec, banned template phrases, markdown leakage, and whether key facts (times, days, numbers) from the inputs actually appear in the email. Hard failures trigger one automatic corrective rewrite (the draft plus its failure list goes back to the model), and results are displayed as ✓/⚠ chips under each version.
- **Placeholder guardrail** — if the draft still contains unfilled `[placeholders]`, copying or sending triggers a warning so "[interview time]" never reaches a real recipient.
- **Follow-up generator** — one click drafts a polite chase email referencing the previous one (recruiters live in follow-ups).
- **Personal prompt library** — save the current form as a named template; saved templates appear in the dropdown under "My templates".
- **PDF/DOCX JD parsing** — attach a real JD file; parsed entirely in the browser (parser libraries load on demand), never uploaded anywhere.
- **Managed-key mode** — when deployed on Netlify with server-side env keys (see `DEPLOYMENT.md`), the app auto-detects the proxy (`netlify/functions/generate.mjs`), hides the key inputs, and users paste nothing. Includes per-IP rate limiting.

## Edge-case handling

| Situation | Behavior |
|---|---|
| Everything empty | Generation blocked with a friendly message — nothing to write from |
| No API key | Blocked with a pointer to the free-key link |
| No recipient name | Warning shown; model uses a sensible generic greeting |
| No purpose, but key points given | Warning shown; model infers the purpose |
| No key points | Warning shown; email is general and uses `[placeholders]` for missing specifics |
| Missing specifics (time, link…) | Model inserts visible `[bracketed placeholders]` rather than inventing facts |
| Invalid API key / rate limit / network error | Human-readable error messages, no console-only failures |

## Known limitations

- **Key-per-user**: each user needs their own free Gemini key. A production version would hide the key behind a serverless proxy (Netlify/Vercel function) with basic rate limiting.
- **Free-tier rate limits**: a handful of requests per minute; the tool surfaces a clear "wait ~30s" message when hit.
- **English only** for now; JD attachment reads plain-text files (`.txt`/`.md`) — PDF/DOCX parsing would need a library or backend.
- Version history lives in memory only (cleared on page reload).

## Running / deploying

- **Locally**: double-click `index.html`. That's it.
- **Hosted**: push this folder to a GitHub repo → Settings → Pages → deploy from `main`. Or drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
