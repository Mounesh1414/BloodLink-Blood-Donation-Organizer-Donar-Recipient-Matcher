import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", required: true },
    scheduledAt: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    },
    completedAt: Date,
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("Donation", donationSchema);
