import express from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
    return res.json({ notifications });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not fetch notifications" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ notification });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not update notification" });
  }
});

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not mark notifications" });
  }
});

export default router;
