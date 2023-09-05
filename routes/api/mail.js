const express = require("express");
const router = express.Router();

const sendMail = require("../utils/mail");

router.post("/", sendMail);

module.exports = router;
