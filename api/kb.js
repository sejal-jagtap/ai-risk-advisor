const KB = require("../lib/kb");
module.exports = (req, res) => res.status(200).json({ kb: KB });