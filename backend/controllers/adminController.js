import Admin from '../models/adminModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOKEN_EXPIRES_IN = '24h';

const createAdminToken = (adminId) => {
  const JWT_SECRET = process.env.JWT_SECRET; // read at call time, not at module load time
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined on the server');
  return jwt.sign({ id: adminId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

const publicAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: 'admin',
});

// There is deliberately no register/signup endpoint here. Admin accounts
// are created only by inserting a document directly into the 'admins'
// MongoDB collection.
export async function adminLogin(req, res) {
  try {
    const emailRaw = String(req.body.email || "").trim();
    const email = emailRaw.toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "all fields are required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'invalid email or password'
      });
    }

    const token = createAdminToken(admin._id.toString());

    return res.status(200).json({
      success: true,
      message: 'login successful',
      token,
      user: publicAdmin(admin),
    });

  } catch (err) {
    console.error('admin login error', err);
    return res.status(500).json({
      success: false,
      message: 'server error'
    });
  }
}

export async function getAdminProfile(req, res) {
  // adminAuth has already loaded req.admin
  return res.status(200).json({
    success: true,
    user: publicAdmin(req.admin),
  });
}