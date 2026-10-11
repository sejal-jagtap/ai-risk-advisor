const MODEL = process.env.MODEL_DEFAULT || "claude-sonnet-5-5";

async function ask(prompt, max = 4000) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY || "",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: max, messages: [{ role: "user", content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || "upstream_error"), { status: r.status });
    return j.content.filter(b => b.type === "text").map(b => b.text).join("");
}

function parseJSON(t) {
    const m = String(t).match(/\{[\s\S]*\}/);
    if (!m) throw new Error("invalid_json");
    return JSON.parse(m[0]);
}

// Simple per-IP limit so one visitor can't drain your credits
const hits = new Map();
function allowed(req) {
    const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0];
    const now = Date.now();
    const limit = Number(process.env.RATE_LIMIT_PER_HOUR) || 20;
    const recent = (hits.get(ip) || []).filter(t => now - t < 3600000);
    if (recent.length >= limit) return false;
    recent.push(now);
    hits.set(ip, recent);
    return true;
}

const cut = (v, n) => String(v || "").slice(0, n);
const list = a => (Array.isArray(a) ? a : []).slice(0, 12).map(x => cut(x, 60)).join(", ") || "not stated";
function describe(f) {
    return `Product: ${cut(f.idea, 2000)}\nUsers: ${cut(f.users, 80)}\nMakes decisions about people: ${cut(f.dec, 80)}\nData used: ${list(f.data)}\nUser locations: ${list(f.geo)}\nModel: ${cut(f.model, 80)}`;
}

module.exports = { ask, parseJSON, allowed, describe };