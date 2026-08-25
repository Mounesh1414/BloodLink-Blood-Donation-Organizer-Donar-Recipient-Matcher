import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function createToken(userId, role) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, bloodGroup, phone, city, area, hospital } = req.body;
    if (!name || !email || !password || !bloodGroup) {
      return res.status(400).json({ message: "name, email, password and bloodGroup are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    const safeRole = role === "donor" ? "donor" : "recipient";

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      bloodGroup,
      phone,
      city,
      area,
      hospital,
      isVerified: safeRole === "donor" ? false : true
    });

    const token = createToken(user._id, user.role);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        city: user.city,
        area: user.area,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user._id, user.role);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        city: user.city,
        area: user.area,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

export default router;
