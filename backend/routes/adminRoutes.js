import express from 'express';
import { adminLogin, getAdminProfile } from '../controllers/adminController.js';
import adminAuth from '../middleware/adminAuth.js';

const adminRouter = express.Router();

// No register/signup route exists here on purpose.
adminRouter.post('/login', adminLogin);
adminRouter.get('/me', adminAuth, getAdminProfile);

export default adminRouter;