import Booking from '../models/bookingModel.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_URL = 'http://localhost:5173';

const STRIPE_API_VERSION = "2022-11-15";