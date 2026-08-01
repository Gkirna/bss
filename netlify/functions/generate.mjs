/**
 * Managed-key proxy — Netlify Function (Phase 1 of MASTERPLAN.md)
 * ----------------------------------------------------------------------------
 * When this site is deployed on Netlify (git-linked, so functions build) with
 * GEMINI_API_KEY and/or OPENAI_API_KEY set as environment variables, the
 * browser app auto-detects this endpoint and stops asking users for keys —
 * the key lives server-side only, which is the production-grade setup.
 *
 * Without this function deployed (file://, GitHub Pages, Netlify Drop), the
 * app silently falls back to bring-your-own-key mode. Nothing breaks.
 *
 * Includes a best-effort per-IP rate limit (in-memory, per warm instance) so
 * a public demo link can't be farmed for free tokens.
 */

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
];
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"];

// Best-effort rate limit: 10 generations / minute / IP (resets on cold start)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map();

export default async (req, context) => {
  // GET = capability probe from the browser app
  if (req.method === "GET") {
    return Response.json({
      proxy: true,
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const ip = (context && context.ip) || req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > WINDOW_MS) { rec.count = 0; rec.start = now; }
  rec.count += 1;
  hits.set(ip, rec);
  if (rec.count > MAX_PER_WINDOW) {
    return Response.json(
      { error: "Rate limit: max 10 emails per minute. Please wait a moment." },
      { status: 429 },
    );
  }

  // Only accept requests originating from this site itself. Browsers always
  // send an Origin header on cross- and same-origin POSTs; direct curl/scripts
  // without a matching Origin are rejected. (Not unforgeable server-to-server,
  // but it blocks other websites and casual scripts from farming the endpoint.)
  const selfHost = new URL(req.url).host;
  const origin = req.headers.get("origin") || "";
  let originHost = "";
  try { originHost = new URL(origin).host; } catch { /* missing/invalid */ }
  if (originHost !== selfHost) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { body = null; }
  const { provider = "gemini", systemPrompt, userPrompt } = body || {};
  if (!systemPrompt || !userPrompt || userPrompt.length > 20_000 || systemPrompt.length > 20_000) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const email = provider === "openai"
      ? await callOpenAI(systemPrompt, userPrompt)
      : await callGemini(systemPrompt, userPrompt);
    return Response.json(email);
  } catch (err) {
    return Response.json(
      { error: err.message || "Generation failed. Please try again." },
      { status: 502 },
    );
  }
};

/* ---------------- Gemini (server-side) ---------------- */
async function callGemini(systemPrompt, userPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured on this server — switch provider.");

  let lastStatus = 0;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000, // caps the cost of any single request
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
              required: ["subject", "body"],
            },
          },
        }),
      },
    );
    if (res.status === 404) { lastStatus = 404; continue; } // model not on this key — try next
    if (!res.ok) throw new Error(`AI service error (${res.status}). Please try again.`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty AI response. Please try again.");
    return validateEmail(JSON.parse(text));
  }
  throw new Error(`No Gemini model available (last status ${lastStatus}).`);
}

/* ---------------- OpenAI (server-side) ---------------- */
async function callOpenAI(systemPrompt, userPrompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured on this server — switch provider.");

  for (const model of OPENAI_MODELS) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 1000, // caps the cost of any single request
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (res.status === 404) continue; // model not on this account — try next
    if (!res.ok) throw new Error(`AI service error (${res.status}). Please try again.`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty AI response. Please try again.");
    return validateEmail(JSON.parse(text));
  }
  throw new Error("No OpenAI model available on this account.");
}

function validateEmail(parsed) {
  if (!parsed || !parsed.subject || !parsed.body) {
    throw new Error("Incomplete AI response. Please try again.");
  }
  return { subject: parsed.subject, body: parsed.body };
}
