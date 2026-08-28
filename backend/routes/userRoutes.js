import express from 'express'
import { login, register, getProfile, logout } from '../controllers/userController.js'
import authMiddleware from '../middleware/auth.js'

const userRouter = express.Router();

userRouter.post('/login', login);
userRouter.post('/register', register);
userRouter.get('/me', authMiddleware, getProfile);
userRouter.post('/logout', authMiddleware, logout);

export default userRouter;
