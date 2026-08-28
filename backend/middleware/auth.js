import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export default async function authMiddleware(req, res, next) {
  const JWT_SECRET = process.env.JWT_SECRET; // read at call time, not at module load time
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in the environment');
    return res.status(500).json({ success: false, message: 'Server misconfigured' });
  }

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