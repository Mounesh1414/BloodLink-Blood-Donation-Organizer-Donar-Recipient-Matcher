import express from "express";
import User from "../models/User.js";
import BloodRequest from "../models/BloodRequest.js";
import Donation from "../models/Donation.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, allowRoles("admin"));

router.get("/stats", async (_req, res) => {
  try {
    const [users, donors, verifiedDonors, openRequests, criticalRequests, completedDonations] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "donor" }),
        User.countDocuments({ role: "donor", isVerified: true }),
        BloodRequest.countDocuments({ status: { $in: ["open", "matched"] } }),
        BloodRequest.countDocuments({ status: { $in: ["open", "matched"] }, urgency: "critical" }),
        Donation.countDocuments({ status: "completed" })
      ]);

    return res.json({
      stats: { users, donors, verifiedDonors, openRequests, criticalRequests, completedDonations }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not fetch stats" });
  }
});

router.get("/donors", async (_req, res) => {
  try {
    const donorsList = await User.find({ role: "donor" })
      .select("name email bloodGroup city area isVerified availabilityStatus createdAt")
      .sort({ createdAt: -1 });
    return res.json({ donors: donorsList });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not fetch donors" });
  }
});

router.patch("/donors/:id/verify", async (req, res) => {
  try {
    const donor = await User.findOneAndUpdate(
      { _id: req.params.id, role: "donor" },
      { isVerified: true },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    return res.json({ donor });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not verify donor" });
  }
});

export default router;
