import mongoose from "mongoose";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const matchSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "scheduled", "completed"],
      default: "pending"
    },
    respondedAt: Date
  },
  { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, enum: bloodGroups, required: true },
    units: { type: Number, required: true, min: 1, max: 20 },
    urgency: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "normal"
    },
    hospital: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    requiredDate: { type: Date, required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["open", "matched", "fulfilled", "cancelled"],
      default: "open"
    },
    matchedDonors: [matchSchema]
  },
  { timestamps: true }
);

export default mongoose.model("BloodRequest", bloodRequestSchema);
