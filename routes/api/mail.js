const express = require("express");
const router = express.Router();

const config = require("config");

router.post("/", (req, res) => {
  const { username, type, toEmail } = req.body;

  if (type === "reset") {
    const { resetLink } = req.body;

    var data = {
      service_id: config.get("EMAILJS_SERVICE_ID"),
      template_id: config.get("EMAILJS_RESET_ID"),
      user_id: config.get("EMAILJS_USER_ID"),
      accessToken: config.get("EMAILJS_PRIVATE_KEY"),
      template_params: {
        username,
        toEmail,
        resetLink,
      },
    };

    fetch(config.get("EMAILJS_URL"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response)
      .then((data) => {
        return res.json({ success: true, message: "Mail sent successfully" });
      })
      .catch((err) => {
        return res.json({ success: false, message: err.message });
      });
  } else {
    const { title, usermail, inviteLink, prodLink } = req.body;

    var data = {
      service_id: config.get("EMAILJS_SERVICE_ID"),
      template_id: config.get("EMAILJS_INVITATION_ID"),
      user_id: config.get("EMAILJS_USER_ID"),
      accessToken: config.get("EMAILJS_PRIVATE_KEY"),
      template_params: {
        title,
        type,
        username,
        usermail,
        inviteLink,
        prodLink,
        toEmail,
      },
    };

    fetch(config.get("EMAILJS_URL"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response)
      .then((data) => {
        return res.json({ success: true, message: "Mail sent successfully" });
      })
      .catch((err) => {
        return res.json({ success: false, message: err.message });
      });
  }
});

module.exports = router;
