const express = require("express");
const router = express.Router();

const { check, validationResult } = require("express-validator");

const User = require("../../models/User");

const jwt = require("jsonwebtoken");

const config = require("config");

const auth = require("../../middleware/auth");

// route    POST /api/auth
// @desc    Login
// @access  PUBLIC
router.post(
  "/",
  [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a password").not().isEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    User.findOne({ email })
      .then((user) => {
        if (!user) {
          return res.status(400).json({ errors: [{ msg: "Invalid User" }] });
        }

        if (!user.authenticate(password)) {
          return res.status(400).json({ errors: [{ msg: "Invalid User" }] });
        }

        const payload = {
          user: {
            id: user._id,
          },
        };

        jwt.sign(
          payload,
          config.get("userSecret"),
          {
            expiresIn: config.get("logoutTime"),
          },
          (err, token) => {
            if (err) {
              return res
                .status(500)
                .json({ errors: [{ msg: "Internal Server Error" }] });
            }

            return res.json({ token: token });
          }
        );
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ errors: [{ msg: "Internal Server Error" }] });
      });
  }
);

// route    GET /api/auth
// @desc    Current User Details
// @access  PRIVATE
router.get("/", auth, (req, res) => {
  User.findById(req.user.id)
    .select("-encry_password -salt")
    .then((user) => {
      return res.json({ user });
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

module.exports = router;
