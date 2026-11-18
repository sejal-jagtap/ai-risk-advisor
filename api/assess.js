const KB = require("../lib/kb");
const { askTool, allowed, describe } = require("../lib/claude");
const STR = { type: "string" };
const SCHEMA = {
    type: "object",
    properties: {
        summary: STR,
        risks: { type: "array", items: { type: "object", properties: {
            category: { type: "string", enum: ["privacy", "bias", "security", "regulatory"] },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            severityWhy: STR,
            when: { type: "string", enum: ["now", "before-scaling", "monitor"] },
            title: STR, why: STR, fix: STR,
            sources: { type: "array", items: STR },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            needsReview: { type: "boolean" },
        }, required: ["category", "severity", "severityWhy", "when", "title", "why", "fix", "sources", "confidence", "needsReview"] } },
        askLawyer: { type: "array", items: STR },
    },
    required: ["summary", "risks", "askLawyer"],
};

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
- CITATION RULES: cite a source only if its "what to check" text directly addresses that specific risk. Cite at most 2 sources per risk. Do not cite GDPR-* or EUAI-* entries unless EU/UK is among the user locations. Do not cite CCPA unless California is among the user locations. Never use NIST-MAP or NC-WATCH as filler: use NC-WATCH only for pending chatbot or privacy bills, and NIST-MAP only for governance and documentation risks. If no source directly fits, leave sources empty (confidence low, needsReview true).
- If a risk is real but no listed source fits, include it with empty sources, confidence "low", needsReview true.
- Set needsReview true whenever confidence is low or the risk depends on facts the founder did not give.
- Only point to sources relevant to the stated user locations. Include North Carolina items when NC users exist.
- Give 4 to 7 risks covering all four categories where they apply. Fixes must be concrete product or data changes.
- BE CONCISE so the answer finishes quickly: summary at most 2 sentences; "why" and "fix" at most 2 short sentences each; "severityWhy" under 15 words; at most 2 askLawyer questions.
- SEVERITY RUBRIC (apply strictly, and say which criterion you used in "severityWhy"):
  high = could block launch or cause direct harm to people (e.g. automated decisions about people, sensitive or minors' data, no safeguard described).
  medium = plausibly applies and needs a mitigation before scaling or wider release.
  low = good practice, or only applies under conditions the founder did not state.
- "when" = "now" for high, "before-scaling" for medium, "monitor" for low.
- Add up to 3 questions to ask a lawyer.
Answer by calling the report tool, using plain text in every field, in this shape: {"summary":"2 sentences","risks":[{"category":"privacy|bias|security|regulatory","severity":"high|medium|low","severityWhy":"one line naming the rubric criterion met","when":"now|before-scaling|monitor","title":"","why":"","fix":"","sources":["ids"],"confidence":"high|medium|low","needsReview":true}],"askLawyer":["..."]}

SOURCES TO POINT TO:
${sources}

${describe(f)}`;

        res.status(200).json({ data: await askTool(prompt, SCHEMA) });
    } catch (e) {
        const rl = e.status === 429;
        res.status(rl ? 429 : 500).json({ code: rl ? "rate_limited" : e.message === "invalid_json" ? "invalid_json" : "upstream_error", error: e.message });
    }
};