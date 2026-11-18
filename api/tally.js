const { askTool, allowed } = require("../lib/claude");
const TALLY = { type: "object", properties: {
    categories: { type: "array", items: { type: "string", enum: ["privacy", "bias", "security", "regulatory"] } },
    cites: { type: "number" }, fixes: { type: "number" },
}, required: ["categories", "cites", "fixes"] };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!allowed(req)) return res.status(429).json({ code: "rate_limited", error: "Too many requests" });
    try {
        const t = String((req.body || {}).text || "").slice(0, 9000);
        const p = `Read the answer below. Return ONLY JSON {"categories":[subset of "privacy","bias","security","regulatory" that it substantively addresses],"cites":number of specific named laws, articles, or frameworks it cites,"fixes":number of concrete recommended actions}.\n\nANSWER:\n${t}`;
        res.status(200).json({ data: await askTool(p, TALLY, 600) });
    } catch (e) {
        res.status(500).json({ code: "upstream_error", error: e.message });
    }
};