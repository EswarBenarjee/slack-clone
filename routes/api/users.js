const express = require("express");
const router = express.Router();

const { check, validationResult } = require("express-validator");

const User = require("../../models/User");

const jwt = require("jsonwebtoken");

const config = require("config");

const auth = require("../../middleware/auth");
const resetPassword = require("../../middleware/reset-password");

// route    POST /api/users
// @desc    Register user
// @access  PUBLIC
router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be between 6 and 20 characters").isLength({
      min: 6,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    User.findOne({ email })
      .then((fetchedUser) => {
        if (fetchedUser) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User already exists" }] });
        }

        // Create new user
        const newUser = new User({
          name,
          email,
          password,
        });

        newUser
          .save()
          .then((savedUser) => {
            const payload = {
              user: {
                id: savedUser._id,
              },
            };

            jwt.sign(
              payload,
              config.get("userSecret"),
              { expiresIn: config.get("logoutTime") },
              (err, token) => {
                if (err)
                  return res
                    .status(500)
                    .json({ errors: [{ msg: "Token is not generated" }] });

                return res.json({ token: token });
              }
            );
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ errors: [{ msg: "Internal Server Error" }] });
          });
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ errors: [{ msg: "Internal Server Error" }] });
      });
  }
);

// route    PUT /api/users        PENDING
// @desc    Update User
// @access  PRIVATE
router.put("/", auth, (req, res) => {
  let { name, password, avatar } = req.body;

  const userFields = {};

  if (name) userFields.name = name;
  if (password) userFields.password = password;
  if (avatar) userFields.avatar = avatar;

  User.findOneAndUpdate(
    { _id: req.user.id },
    { $set: userFields },
    { new: true }
  )
    .select("-encry_password -salt")
    .then((user) => {
      const payload = {
        user: {
          id: user._id,
        },
      };

      jwt.sign(
        payload,
        config.get("userSecret"),
        { expiresIn: config.get("logoutTime") },
        (err, token) => {
          if (err)
            return res
              .status(500)
              .json({ errors: [{ msg: "Token is not generated" }] });

          return res.json({ token: token });
        }
      );
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    POST /api/users/reset-password
// @desc    Reset Password Link Generation
// @access  PRIVATE
router.post("/reset-password", auth, (req, res) => {
  const id = req.user.id;

  const payload = {
    user: {
      id,
    },
  };

  jwt.sign(
    payload,
    config.get("resetSecret"),
    {
      expiresIn: config.get("resetValidTime"),
    },
    (err, token) => {
      if (err) {
        return res
          .status(500)
          .json({ errors: [{ msg: "Internal Server Error" }] });
      }

      const link = "localhost:5000/api/users/reset-password/" + token;

      // Mail to particular invitation users

      return res.json({
        link,
      });
    }
  );
});

// route    POST /api/users/reset-password/:id        PENDING
// @desc    Reset Password
// @access  PUBLIC
router.post(
  "/reset-password/:id",
  [
    resetPassword,
    check("password", "Password must be between 6 and 20 characters").isLength({
      min: 6,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;

    User.findById(req.user.id)
      .select("-encry_password -salt")
      .then((user) => {
        if (user) {
          user.password = password;

          user
            .save()
            .then((user) => {
              const payload = {
                user: {
                  id: user._id,
                },
              };

              jwt.sign(
                payload,
                config.get("userSecret"),
                { expiresIn: config.get("logoutTime") },
                (err, token) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ errors: [{ msg: "Token is not generated" }] });

                  return res.json({ token: token });
                }
              );
            })
            .catch((err) => {
              return res.status(500).json({ errors: [{ msg: err.message }] });
            });
        }
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ errors: [{ msg: "Internal Server Error" }] });
      });
  }
);

module.exports = router;
