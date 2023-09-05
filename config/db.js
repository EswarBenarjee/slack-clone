const mongoose = require("mongoose");

const config = require("config");
const db = config.get("mongoURI");

mongoose
  .connect(db)
  .then((res) => console.log("MongoDB connected"))
  .catch((err) => console.log("err:" + err));
