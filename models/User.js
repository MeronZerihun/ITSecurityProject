const mongoose = require("mongoose");

let Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: "user" },
    status: { type: String, default: "activated" },
  },
  {
    timestamps: { createdAt: "created_at", modifiedAt: "modified_at" },
  }
);

module.exports = mongoose.model("User", userSchema);
