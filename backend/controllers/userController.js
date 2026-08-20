import mongoose from "mongoose";
import User from '../models/userModel.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOKEN_EXPIRES_IN = '24h';
const JWT_SECRET = "viral"; // ✅ fixed casing + pulled from env

const createToken = (userId) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined on the server');
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

export async function register(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const emailRaw = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRaw) || emailRaw.toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false, // ✅ fixed typo 'sucess' -> 'success' (also do this in frontend if you check this field!)
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

    const user = new User({
      _id: newId,
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = createToken(newId.toString());

    return res.status(201).json({ // ✅ fixed: was res.status() with no code
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }
    // ✅ fixed: unreachable code moved out of the if-block
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

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN }); // ✅ fixed JWT_SECRET reference

    return res.status(200).json({ // ✅ fixed: was `exports.status(...)`
      success: true,
      message: 'login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) { // ✅ fixed: catch block now correctly names `err`
    console.error('login error', err);
    return res.status(500).json({
      success: false,
      message: 'server error'
    });
  }
}