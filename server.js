const express = require("express");

const app = express();

// DB connection
require("./config/db");

// Init middleware
app.use(express.json({ extended: false }));

// Auth middleware
const auth = require("./middleware/auth");

// Routes
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/users", require("./routes/api/users"));
app.use("/api/channels", auth, require("./routes/api/channels"));
app.use("/api/workspaces", auth, require("./routes/api/workspaces"));

app.get("/", (req, res) => res.send("API running"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log("app started"));
