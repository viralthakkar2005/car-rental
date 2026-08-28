import mongoose from "mongoose";
import User from '../models/userModel.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOKEN_EXPIRES_IN = '24h';

const createToken = (userId) => {
  const JWT_SECRET = process.env.JWT_SECRET; // read at call time, not at module load time
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined on the server');
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: 'user',
});

export async function register(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const emailRaw = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRaw) || emailRaw.toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "all fields are required"
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'invalid email'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'password must be 8 char'
      });
    }

    const exists = await User.findOne({ email }).lean();

    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'user already exists'
      });
    }

    const newId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Registration always creates a normal user. Admin accounts live in a
    // completely separate collection (see models/adminModel.js) and are
    // never created through this or any public endpoint.
    const user = new User({
      _id: newId,
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = createToken(newId.toString());

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: publicUser(user),
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
}

// login

export async function login(req, res) {
  try {
    const emailRaw = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRaw) || emailRaw.toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "all fields are required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'invalid email or password'
      });
    }

    const token = createToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'login successful',
      token,
      user: publicUser(user),
    });

  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({
      success: false,
      message: 'server error'
    });
  }
}

// GET current user's profile from their token — used by the frontend to
// validate a stored token and refresh the cached user object.
export async function getProfile(req, res) {
  // authMiddleware has already loaded req.user (password excluded)
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
}

// Logout is stateless with JWT (the token is simply discarded client-side),
// but we still expose an endpoint so the frontend has something to call.
export async function logout(req, res) {
  return res.status(200).json({ success: true, message: 'Logged out' });
}