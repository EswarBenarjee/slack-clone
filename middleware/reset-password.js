const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = (req, res, next) => {
  const id = req.params.id;

  // Check token
  if (!id)
    return res
      .status(401)
      .json({ errors: [{ msg: "Invalid Reset Password Link" }] });

  try {
    const decoded = jwt.verify(id, config.get("resetSecret"));
    
    req.user = decoded.user;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid Reset Password Link" });
  }
};
