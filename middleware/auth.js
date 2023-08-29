const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = (req, res, next) => {
  const token = req.header("x-auth-token");

  // Check token
  if (!token)
    return res.status(401).json({ errors: [{ msg: "Unauthorized access" }] });

  try {
    const decoded = jwt.verify(token, config.get("userSecret"));

    req.user = decoded.user;
    next();
  } catch {
    return res.status(401).json({ msg: "Unauthorized access" });
  }
};
