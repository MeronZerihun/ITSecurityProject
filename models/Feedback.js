const mongoose = require("mongoose");

let Schema = mongoose.Schema;

let feedbackSchema = new Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    complaint: { type: String, required: true },
    file_lnk: { type: String },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", modifiedAt: "modified_at" },
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
