const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  encry_password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  workspaces: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "workspace",
    },
  ],
  salt: {
    type: String,
    default: uuidv4(),
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.virtual("password").set(function (plainPassword) {
  this.encry_password = this.securePassword(plainPassword);
});

UserSchema.methods = {
  securePassword: function (plainPassword) {
    if (!plainPassword) return "";
    try {
      return crypto
        .createHmac("sha256", this.salt)
        .update(plainPassword)
        .digest("hex");
    } catch (err) {
      return "";
    }
  },
  authenticate: function (plainPassword) {
    return crypto.timingSafeEqual(
      Buffer.from(this.securePassword(plainPassword)),
      Buffer.from(this.encry_password)
    );
  },
};

module.exports = User = mongoose.model("user", UserSchema);
