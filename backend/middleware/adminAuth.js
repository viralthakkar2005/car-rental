import jwt from 'jsonwebtoken';
import Admin from '../models/adminModel.js';

// This is the ONLY middleware that grants admin access. It verifies the
// token, then looks the id up in the separate 'admins' collection — never
// the 'users' collection. A regular user's token will always fail here,
// because their id simply won't exist in the admins collection, and
// vice versa for adminAuth vs the customer-facing authMiddleware.
export default async function adminAuth(req, res, next) {
  const JWT_SECRET = process.env.JWT_SECRET;
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
    const admin = await Admin.findById(payload.id).select('-password');

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.admin = admin;
    next();

  } catch (err) {
    console.error('admin jwt verification failed', err);
    return res.status(401).json({
      success: false,
      message: 'token missing, invalid or expired'
    });
  }
}