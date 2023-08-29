const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = (req, res, next) => {
  const id = req.params.id;

  // Check token
  if (!id)
    return res.status(401).json({ errors: [{ msg: "Invalid Invite Link" }] });

  try {
    const decoded = jwt.verify(id, config.get("inviteSecret"));

    req.channel = decoded.channel;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid Invite Link" });
  }
};
