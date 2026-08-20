import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const JWT_SECRET = "viral"; // ✅ now shares the same secret as userController.js

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token missing'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "user not found"
      });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error('jwt token verification failed', err);
    return res.status(401).json({
      success: false,
      message: 'token missing, invalid or expired'
    });
  }
}