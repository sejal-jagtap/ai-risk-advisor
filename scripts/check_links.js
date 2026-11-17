// Checks every KB source URL. Dead (404/410/DNS) = exit 1. 403/429/timeouts = "unverified" only.
const KB = require("../lib/kb.js");
(async () => {
  const dead = [], unverified = [];
  for (const k of KB) {
    const url = k[5];
    try {
      const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "FairPlay-link-check" } });
      if (r.status === 404 || r.status === 410) dead.push(`${k[0]} ${url} -> ${r.status}`);
      else if (!r.ok) unverified.push(`${k[0]} ${url} -> ${r.status}`);
    } catch (e) {
      unverified.push(`${k[0]} ${url} -> ${e.cause ? e.cause.code : e.message}`);
    }
  }
  console.log(`Checked ${KB.length} sources.\nDEAD (${dead.length}):\n${dead.join("\n")}\nUNVERIFIED (${unverified.length}):\n${unverified.join("\n")}`);
  process.exit(dead.length ? 1 : 0);
})();
