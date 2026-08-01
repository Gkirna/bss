# Deployment Guide

The app runs in two modes and **auto-detects** which one it's in:

| Mode | How it's hosted | Who supplies the API key |
|---|---|---|
| **Bring-your-own-key** (default) | Opened as a file, GitHub Pages, or Netlify Drop | Each user pastes their own key (stored in their browser only) |
| **Managed-key** (production) | Netlify site linked to the Git repo, with env vars set | Nobody — the key lives server-side in `netlify/functions/generate.mjs` |

## Option A — GitHub Pages (fastest, key mode)

1. Create a repo at github.com/new → upload all files (or `git push`).
2. Repo → Settings → Pages → Source: "Deploy from a branch" → `main` / root.
3. Live at `https://<username>.github.io/bss-email-generator/` in ~1 minute.

## Option B — Netlify Drop (fast, key mode)

Drag the project folder onto https://app.netlify.com/drop. Note: Drop deploys
static files only — the proxy function does NOT run this way.

## Option C — Netlify Git-linked (production, managed-key mode)

1. Push the repo to GitHub.
2. Netlify → "Add new site" → "Import an existing project" → pick the repo.
   Build settings are read from `netlify.toml` automatically.
3. Site → Site configuration → Environment variables → add either or both:
   - `GEMINI_API_KEY` — from aistudio.google.com/apikey
   - `OPENAI_API_KEY` — from platform.openai.com/api-keys
4. Deploy. The app probes `/.netlify/functions/generate`, sees the proxy,
   hides the key inputs, and shows "✓ This site has a managed API key".

The function includes a best-effort rate limit (10 generations/minute/IP) so a
public link can't be farmed for tokens.

## Local testing

Just double-click `index.html` — the proxy probe fails silently and the app
runs in bring-your-own-key mode.
