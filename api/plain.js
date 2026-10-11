const { ask, allowed, describe } = require("../lib/claude");

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!allowed(req)) return res.status(429).json({ code: "rate_limited", error: "Too many requests" });
    try {
        const text = await ask(`What are the risks of this AI product idea?\n\n${describe(req.body || {})}`, 1800);
        res.status(200).json({ data: { text } });
    } catch (e) {
        res.status(500).json({ code: "upstream_error", error: e.message });
    }
};