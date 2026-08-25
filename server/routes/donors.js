import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const bloodGroups = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/search", requireAuth, async (req, res) => {
  try {
    const { bloodGroup, city, area } = req.query;

    const query = {
      role: "donor",
      isVerified: true,
      availabilityStatus: "active"
    };

    if (bloodGroup) {
      if (!bloodGroups.has(String(bloodGroup))) {
        return res.status(400).json({ message: "Invalid blood group filter" });
      }
      query.bloodGroup = bloodGroup;
    }

    if (city) query.city = new RegExp(`^${escapeRegex(city)}$`, "i");
    if (area) query.area = new RegExp(`^${escapeRegex(area)}$`, "i");

    const donors = await User.find(query)
      .select("name bloodGroup city area phone isVerified lastDonationAt")
      .sort({ updatedAt: -1 })
      .limit(100);

    return res.json({ donors });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Donor search failed" });
  }
});

export default router;
