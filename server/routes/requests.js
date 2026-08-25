import express from "express";
import BloodRequest from "../models/BloodRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { isCompatible, matchScore } from "../utils/matching.js";

const router = express.Router();
const bloodGroups = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
const urgencyLevels = new Set(["normal", "urgent", "critical"]);

async function createMatchNotifications(requestDoc, donors) {
  if (!donors.length) return;

  const payload = donors.map((donor) => ({
    user: donor._id,
    type: "new_request",
    title: "New blood request match",
    message: `${requestDoc.urgency.toUpperCase()} request for ${requestDoc.bloodGroup} at ${requestDoc.hospital}`,
    data: { requestId: requestDoc._id }
  }));

  await Notification.insertMany(payload);
}

router.post("/", requireAuth, allowRoles("recipient", "admin"), async (req, res) => {
  try {
    const { bloodGroup, units, urgency, hospital, city, area, requiredDate, notes } = req.body;

    if (!bloodGroup || !units || !hospital || !city || !area || !requiredDate) {
      return res.status(400).json({ message: "Missing required request fields" });
    }

    if (!bloodGroups.has(String(bloodGroup))) {
      return res.status(400).json({ message: "Invalid blood group" });
    }

    if (urgency && !urgencyLevels.has(String(urgency))) {
      return res.status(400).json({ message: "Invalid urgency" });
    }

    if (!Number.isInteger(Number(units)) || Number(units) < 1 || Number(units) > 20) {
      return res.status(400).json({ message: "units must be between 1 and 20" });
    }

    const requiredDateValue = new Date(requiredDate);
    if (Number.isNaN(requiredDateValue.getTime())) {
      return res.status(400).json({ message: "Invalid requiredDate" });
    }

    if (requiredDateValue.getTime() < Date.now() - 60 * 1000) {
      return res.status(400).json({ message: "requiredDate must be in the future" });
    }

    const requestDoc = await BloodRequest.create({
      requester: req.user._id,
      bloodGroup,
      units: Number(units),
      urgency,
      hospital,
      city,
      area,
      requiredDate: requiredDateValue,
      notes
    });

    const donors = await User.find({ role: "donor", isVerified: true, availabilityStatus: "active" });

    const compatible = donors
      .filter((donor) => isCompatible(donor.bloodGroup, requestDoc.bloodGroup))
      .map((donor) => ({ donor, score: matchScore({ donor, request: requestDoc }) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    requestDoc.matchedDonors = compatible.map((entry) => ({
      donor: entry.donor._id,
      score: entry.score,
      status: "pending"
    }));

    if (requestDoc.matchedDonors.length > 0) {
      requestDoc.status = "matched";
    }

    await requestDoc.save();
    await createMatchNotifications(requestDoc, compatible.map((x) => x.donor));

    return res.status(201).json({ request: requestDoc });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not create request" });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "recipient") {
      query = { requester: req.user._id };
    }

    if (req.user.role === "donor") {
      query = { "matchedDonors.donor": req.user._id };
    }

    const requests = await BloodRequest.find(query)
      .populate("requester", "name phone city area")
      .populate("matchedDonors.donor", "name bloodGroup city area phone")
      .sort({ createdAt: -1 });

    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not fetch requests" });
  }
});

router.post("/:id/respond", requireAuth, allowRoles("donor"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be accepted or rejected" });
    }

    const requestDoc = await BloodRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (!["open", "matched"].includes(requestDoc.status)) {
      return res.status(409).json({ message: "Request is not active" });
    }

    const match = requestDoc.matchedDonors.find((m) => String(m.donor) === String(req.user._id));
    if (!match) {
      return res.status(404).json({ message: "You are not matched to this request" });
    }

    if (match.status !== "pending") {
      return res.status(409).json({ message: "You have already responded to this request" });
    }

    match.status = status;
    match.respondedAt = new Date();

    if (status === "accepted") {
      requestDoc.status = "matched";
      await Notification.create({
        user: requestDoc.requester,
        type: "match_update",
        title: "Donor accepted request",
        message: `${req.user.name} accepted your blood request`,
        data: { requestId: requestDoc._id, donorId: req.user._id }
      });
    }

    await requestDoc.save();
    return res.json({ request: requestDoc });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not update response" });
  }
});

router.patch("/:id/complete", requireAuth, allowRoles("recipient", "admin"), async (req, res) => {
  try {
    const requestDoc = await BloodRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    requestDoc.status = "fulfilled";
    requestDoc.matchedDonors = requestDoc.matchedDonors.map((m) => {
      if (m.status === "scheduled" || m.status === "accepted") {
        return { ...m.toObject(), status: "completed" };
      }
      return m;
    });

    await requestDoc.save();
    return res.json({ request: requestDoc });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not complete request" });
  }
});

export default router;
