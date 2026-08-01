# Master Plan — From Email Generator to AI Recruiting Communications Platform

This document is the roadmap from the 48-hour assignment build to a production-grade,
agent-powered recruiting workflow system. Phases are ordered by value-per-effort and risk.

> **Rule zero:** Phase 0 ships before anything else is touched. The assignment PDF says it
> plainly: judgment beats feature count. Everything past Phase 0 is post-submission work.

---

## Phase 0 — Ship the assignment (NOW, hours)

Current app already covers 100% of the brief plus bonuses (dual provider, JD-aware emails,
audience targeting, version history, edit-in-place, open-in-mail-app).

Checklist:
- [ ] Hard-refresh (Ctrl+F5) and smoke-test every feature, including JD attach + audience
- [ ] Quick phone-width check (resize browser to ~400px — layout should stack cleanly)
- [ ] Deploy: Netlify Drop (or GitHub Pages)
- [ ] README: paste live link, add one screenshot
- [ ] Push code to a GitHub repo
- [ ] Reply to the assignment email: link + repo + README summary

---

## Phase 1 — Production hardening (week 1 after submission)

| Feature | What / why | Tech |
|---|---|---|
| **Serverless key proxy** | One company key held server-side; users paste nothing. Rate limiting + per-IP quotas. THE critical prod change — everything else assumes it. | Netlify/Vercel Functions, key in env var |
| **PDF/DOCX JD parsing** | Real JDs are PDFs. Parse client-side, no upload to any server. | pdf.js, mammoth.js |
| **Streaming output** | Tokens appear as they generate — perceived speed 3–5x. | SSE / fetch streaming |
| **Persistent drafts** | Version history + last inputs survive reload. | localStorage → IndexedDB |
| **Accessibility & mobile** | Keyboard nav, ARIA labels, contrast, small screens. | Plain HTML fixes |
| **Prompt versioning** | System prompt in a versioned config, changelog per edit. | JSON config + git |

## Phase 2 — Recruiter workflow features (weeks 2–3)

| Feature | What / why |
|---|---|
| **Email sequences** | One click generates the whole chain: invite → reminder (day 2) → thank-you → feedback request. Recruiters live in sequences, not single emails. |
| **User prompt library** | Save/edit/share own templates beyond the 4 built-ins. Literally the JD's "reusable prompt libraries". |
| **Candidate context card** | Paste a resume/LinkedIn summary alongside the JD → email references the candidate's actual background (e.g. "your 4 years of React experience"). Same guardrails as JD: extract, never dump. |
| **Multi-language** | English + Hindi/Kannada/Tamil output toggle for candidate comms. |
| **Tone presets per client** | "Acme Corp prefers formal, no emojis" — saved client profiles that auto-set tone. |
| **Placeholder scanner** | Before copy/send, warn if `[bracketed placeholders]` remain unfilled — last-line guardrail against sending "[interview time]" to a real candidate. |

## Phase 3 — The workflow platform (month 2)

Now it stops being a page and becomes a system. Add a thin backend.

| Feature | What / why | Tech |
|---|---|---|
| **Pipeline integration** | Google Sheet as candidate tracker (name, role, stage, last-contact). Tool reads a row → prefills everything. One click per candidate. | Google Sheets API |
| **Stage-aware generation** | Stage drives email type: Shortlisted→invite, Interviewed→client feedback request, Offered→follow-up cadence. | App logic |
| **Send + log** | Send from the recruiter's own mailbox; write "sent + timestamp" back to the tracker. Closes the loop: follow-ups, pipeline hygiene, reminders. | Gmail API (OAuth) |
| **SLA nudges** | "No reply in 3 days" → reminder draft ready and flagged. | Sheets + scheduled function |
| **Approval flow** | Drafts queue for a lead's one-click approve before send. Compliance-grade human-in-the-loop. | Supabase (auth + DB) |
| **Analytics** | Response rate per template/tone, time-saved counter, TAT dashboards — the Excel/KPI half of the FDE job. | Sheets/Supabase + charts |
| **Guardrails+** | Banned-claims list (no salary promises), PII masking in logs, tone-consistency check. | Prompt + post-check pass |
| **Eval suite** | 10–20 golden input→email pairs, re-run on every prompt change; score structure, facts, tone. Prompt changes become safe. | Simple script + LLM judge |

## Phase 4 — Agentic automation with Hermes Agent (month 3)

Where the browser tool ends, the agent begins. Hermes Agent (github.com/NousResearch/hermes-agent)
runs 24/7 on a $5 VPS or serverless sandbox and does the work *between* the recruiter's clicks.
The web app stays the human-facing drafting surface; Hermes becomes the background engine.

**Division of labor:**

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Web app (this repo)    │        │  Hermes Agent (VPS/Modal)    │
│  human-facing drafting  │        │  24/7 background automation  │
│  - compose & refine     │        │  - cron: daily pipeline scan │
│  - review & approve     │◄──────►│  - SLA breach → draft ready  │
│  - edit-in-place        │ shared │  - nightly tracker hygiene   │
│  - one-click send       │ Sheet/ │  - weekly client digests     │
└─────────────────────────┘  DB    │  - Telegram: "status of X?"  │
                                   └──────────────────────────────┘
```

**Concrete Hermes use cases (each maps to a JD line):**
1. **Follow-up hygiene cron** — nightly: scan tracker for stale rows, generate reminder
   drafts, deliver to the recruiter's Telegram for approval. (JD: "automate follow-ups,
   pipeline hygiene, reminders")
2. **Report generation** — Friday 5pm: weekly per-client digest (interviews done, pipeline
   movement, next week's schedule) delivered to Slack. (JD: "report generation")
3. **Data-quality monitor** — daily check for missing/stale fields in the tracker; escalate
   via message. (JD: "monitoring checks for missing/stale data, lightweight alerts")
4. **Recruiter chat interface** — recruiters text the agent in plain language
   ("draft a follow-up for Rahul", "who's overdue this week?") from Telegram/WhatsApp.
5. **Skills as living SOPs** — each recurring workflow becomes a Markdown skill file:
   readable, auditable, improvable — an SOP library that executes itself.
   (JD: "SOP drafts, reusable prompt templates")

**Non-negotiable security settings for the agent:**
- Command approval ON for anything destructive (send, delete, write to tracker)
- DM pairing / allowlisted users only — nobody unknown can command the bot
- Container/sandbox isolation (Docker or Daytona/Modal backend); no host filesystem
- Read-only tracker access by default; writes gated behind approval
- Treat all inbound messages as untrusted (prompt-injection surface)

## Phase 5 — Enterprise grade (quarter 2+)

- **Auth & RBAC**: recruiter / lead / admin roles; per-client visibility
- **Audit log**: every generated + sent email, immutable, exportable
- **ATS/CRM connectors**: Zoho Recruit / Naukri RMS / generic webhook via n8n or Power Automate
- **RAG over company SOPs**: emails cite actual policy docs instead of model memory
- **Model routing**: cheap model for routine drafts, strong model for sensitive client comms;
  automatic failover between providers (already prototyped in the app's fallback lists)
- **Outcome tracking**: reply-rate per template feeds back into prompt improvements —
  the human-supervised version of a learning loop

---

## Tech stack summary ("best technology" choices and why)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Keep vanilla HTML/JS → migrate to Next.js at Phase 3 | Zero build now; ecosystem when the backend arrives |
| Hosting | Netlify → Vercel | Drop-dead simple; functions when needed |
| LLM | Provider-agnostic (Gemini/OpenAI today; Claude/Hermes via OpenAI-compatible endpoints) | Same system prompt everywhere — no lock-in |
| Data | Google Sheets → Supabase | Meet recruiters where they are; graduate to Postgres |
| Email | Gmail API | Recruiters send as themselves; logging built in |
| Automation | Hermes Agent (MIT, self-hosted) | Cron + messaging + skills + subagents out of the box |
| Glue/RPA | n8n (self-hosted) or Power Automate | JD-preferred tools; visual flows for non-devs |
| Evals | Golden set + LLM-as-judge script | Prompt changes without regressions |

## Success metrics (what "production grade" means here)

- Time per email: ~6 min manual → <45 sec draft+review
- % drafts sent without edits (target >60%)
- Follow-up SLA compliance (no candidate waiting >48h without contact)
- Zero placeholder leaks to real recipients; zero key exposures
- Recruiter adoption: weekly active users / total recruiters

## Interview mapping (say these sentences)

| They ask about… | Point to… |
|---|---|
| Prompt engineering | System prompt guardrails + length/tone contracts + JD extraction rules |
| Human-in-the-loop | Edit-in-place, approval flow, placeholder scanner, agent approval gates |
| Reusable prompt libraries | Templates → user prompt library → Hermes skills |
| Process automation | Phase 3 pipeline + Phase 4 crons |
| Trackers/KPIs (Excel) | Sheets tracker, TAT/SLA dashboards, analytics |
| RPA / no-code | n8n / Power Automate connectors in Phase 5 |
| "What would you improve?" | Whichever phase comes next — you always have an answer |
