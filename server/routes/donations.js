import express from "express";
import Donation from "../models/Donation.js";
import BloodRequest from "../models/BloodRequest.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.post("/schedule", requireAuth, allowRoles("recipient", "admin"), async (req, res) => {
  try {
    const { requestId, donorId, scheduledAt, location, hospital, notes } = req.body;
    if (!requestId || !donorId || !scheduledAt || !location || !hospital) {
      return res.status(400).json({ message: "Missing required scheduling fields" });
    }

    const scheduleAt = new Date(scheduledAt);
    if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "scheduledAt must be a valid future date" });
    }

    const [requestDoc, donor] = await Promise.all([
      BloodRequest.findById(requestId),
      User.findById(donorId)
    ]);

    if (!requestDoc) return res.status(404).json({ message: "Request not found" });
    if (!donor || donor.role !== "donor") {
      return res.status(404).json({ message: "Donor not found" });
    }

    if (!["open", "matched"].includes(requestDoc.status)) {
      return res.status(409).json({ message: "Request is not schedulable" });
    }

    const match = requestDoc.matchedDonors.find((m) => String(m.donor) === String(donorId));
    if (!match) {
      return res.status(409).json({ message: "Donor is not matched to this request" });
    }

    if (!["accepted", "pending"].includes(match.status)) {
      return res.status(409).json({ message: "Donor match cannot be scheduled" });
    }

    const existing = await Donation.findOne({ request: requestDoc._id, donor: donor._id, status: "scheduled" });
    if (existing) {
      return res.status(409).json({ message: "Donation is already scheduled for this donor and request" });
    }

    const donation = await Donation.create({
      donor: donor._id,
      recipient: requestDoc.requester,
      request: requestDoc._id,
      scheduledAt: scheduleAt,
      location,
      hospital,
      notes
    });

    requestDoc.matchedDonors = requestDoc.matchedDonors.map((m) => {
      if (String(m.donor) === String(donorId)) {
        return { ...m.toObject(), status: "scheduled", respondedAt: new Date() };
      }
      return m;
    });
    await requestDoc.save();

    await Notification.create({
      user: donor._id,
      type: "schedule",
      title: "Donation scheduled",
      message: `Donation appointment set for ${new Date(scheduledAt).toLocaleString()}`,
      data: { donationId: donation._id, requestId: requestDoc._id }
    });

    return res.status(201).json({ donation });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not schedule donation" });
  }
});

router.patch("/:id/complete", requireAuth, allowRoles("recipient", "admin"), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    if (donation.status === "completed") {
      return res.status(409).json({ message: "Donation already completed" });
    }

    if (donation.status === "cancelled") {
      return res.status(409).json({ message: "Cancelled donation cannot be completed" });
    }

    donation.status = "completed";
    donation.completedAt = new Date();
    await donation.save();

    await Promise.all([
      BloodRequest.findByIdAndUpdate(donation.request, { status: "fulfilled" }),
      User.findByIdAndUpdate(donation.donor, { lastDonationAt: donation.completedAt })
    ]);

    return res.json({ donation });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not complete donation" });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const query = req.user.role === "donor" ? { donor: req.user._id } : { recipient: req.user._id };
    const donations = await Donation.find(query)
      .populate("donor", "name bloodGroup phone")
      .populate("recipient", "name bloodGroup phone")
      .populate("request", "urgency hospital city area bloodGroup")
      .sort({ createdAt: -1 });

    return res.json({ donations });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not fetch donations" });
  }
});

export default router;
