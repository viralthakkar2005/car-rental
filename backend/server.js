import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config(); // ✅ load env vars first, before anything reads process.env

import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import userRouter from './routes/userRoutes.js';
import carRouter from './routes/carRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images to load from a different origin (e.g. Vite dev server)
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  '/uploads', // was 'upload' (no slash, missing "s") — didn't match "/uploads/..." requests
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(__dirname, 'uploads')) // resolve relative to this file, not the process's cwd
);

// routes
app.use('/api/auth', userRouter);
app.use('/api/cars', carRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);

app.get('/api/ping', (req, res) => res.json({ ok: true, time: Date.now() }));

app.get('/', (req, res) => {
  res.send('hii there');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));