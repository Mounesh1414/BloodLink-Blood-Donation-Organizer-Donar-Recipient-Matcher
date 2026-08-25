import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function run() {
  const [name, email, password, bloodGroup = "O+"] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error("Usage: node scripts/seedAdmin.js <name> <email> <password> [bloodGroup]");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin already exists for that email");
    process.exit(0);
  }

  await User.create({
    name,
    email,
    password,
    role: "admin",
    bloodGroup,
    isVerified: true,
    availabilityStatus: "active"
  });

  console.log("Admin user created");
  process.exit(0);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
