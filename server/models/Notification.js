import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["new_request", "match_update", "schedule", "admin"],
      default: "new_request"
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
