import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["donor", "recipient", "admin"],
      default: "recipient"
    },
    bloodGroup: { type: String, enum: bloodGroups, required: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    area: { type: String, trim: true },
    hospital: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    availabilityStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    lastDonationAt: Date
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(input) {
  return bcrypt.compare(input, this.password);
};

export default mongoose.model("User", userSchema);
