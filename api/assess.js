const KB = require("../lib/kb");
const { ask, parseJSON, allowed, describe } = require("../lib/claude");

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!allowed(req)) return res.status(429).json({ code: "rate_limited", error: "Too many requests" });
    try {
        const f = req.body || {};
        if (String(f.idea || "").length < 20) return res.status(400).json({ error: "Describe the idea in at least a sentence." });

        const sources = KB.map(k => `[${k[0]}] ${k[1]}, ${k[3]} (${k[2]}): ${k[4]}`).join("\n");
        const prompt = `You are an AI product risk advisor for early-stage founders. Review the product for privacy, bias, security, and regulatory risks.
RULES:
- You are a pointer, not a legal authority. NEVER state what a law requires, and never state dates, thresholds, deadlines, or penalties. Say what MAY apply and what the founder should check.
- Use the source list below only to choose which sources to point to. Cite their ids in "sources". Never invent sources, article numbers, or laws.
- If a risk is real but no listed source fits, include it with empty sources, confidence "low", needsReview true.
- Set needsReview true whenever confidence is low or the risk depends on facts the founder did not give.
- Only point to sources relevant to the stated user locations. Include North Carolina items when NC users exist.
- Give 4 to 8 risks covering all four categories where they apply. Fixes must be concrete product or data changes.
- Add up to 3 questions to ask a lawyer.
Return ONLY JSON: {"summary":"2 sentences","risks":[{"category":"privacy|bias|security|regulatory","severity":"high|medium|low","title":"","why":"","fix":"","sources":["ids"],"confidence":"high|medium|low","needsReview":true}],"askLawyer":["..."]}

SOURCES TO POINT TO:
${sources}

${describe(f)}`;

        res.status(200).json({ data: parseJSON(await ask(prompt)) });
    } catch (e) {
        const rl = e.status === 429;
        res.status(rl ? 429 : 500).json({ code: rl ? "rate_limited" : e.message === "invalid_json" ? "invalid_json" : "upstream_error", error: e.message });
    }
};