// Creates a new admin account, or resets an existing one's password.
// Admins live in their own 'admins' collection, completely separate from
// regular users — there is no public signup endpoint for this, on purpose.
// This CLI script is the only supported way to create one.
//
// Usage:
//   node scripts/createAdmin.js <email> <password> [name]
//
// Example:
//   node scripts/createAdmin.js admin@example.com StrongPass123 "Site Admin"
//
// Run this from the backend/ folder. It reads MONGO_URI from backend/.env,
// same as the server.

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/adminModel.js';

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> [name]');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Add it to backend/.env first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  let admin = await Admin.findOne({ email: email.toLowerCase() });
  const hashed = await bcrypt.hash(password, 10);

  if (admin) {
    admin.password = hashed;
    if (name) admin.name = name;
    await admin.save();
    console.log(`Existing admin ${email} updated.`);
  } else {
    admin = await Admin.create({
      name: name || 'Admin',
      email: email.toLowerCase(),
      password: hashed,
    });
    console.log(`Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});