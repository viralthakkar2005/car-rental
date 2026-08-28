import mongoose from "mongoose";

// Admins live in their own collection, completely separate from the
// 'users' collection. There is no signup page for this — admin accounts
// are only ever created by inserting a document directly into this
// collection (e.g. via MongoDB Atlas / mongosh), never through any API
// endpoint. That's intentional: nobody can self-promote to admin.
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

export default Admin;