const express = require("express");
const app = express();

// DB connection
require("./config/db");

// Socketio
const socketio = require("socket.io");

// Init middleware
app.use(express.json({ extended: false }));

// Auth middleware
const auth = require("./middleware/auth");

// Routes
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/users", require("./routes/api/users"));
app.use("/api/channels", auth, require("./routes/api/channels"));
app.use("/api/workspaces", auth, require("./routes/api/workspaces"));

app.use("/api/mail", require("./routes/api/mail.js"));

app.get("/", (req, res) => res.send("API running"));

const PORT = process.env.PORT || 5000;

const expressServer = app.listen(PORT, console.log("app started"));
const io = socketio(expressServer);

// Send all workspaces of current user
io.on("connection", auth, (socket) => {
  let workspacesList = [];
  socket.emit("workspacesList", workspacesList);
});

// Send all channels with current user of current workspace
