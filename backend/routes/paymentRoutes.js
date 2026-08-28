import express from 'express';
import { confirmPayment, createCheckoutSession, createCheckoutSessionForBooking } from '../controllers/paymentController.js';
import authMiddleware from '../middleware/auth.js';

const paymentRouter = express.Router();

paymentRouter.post('/create-checkout-session', createCheckoutSession);

// Customer pays for their OWN already-approved booking. authMiddleware
// ensures req.user is set so the controller can verify ownership.
paymentRouter.post('/create-checkout-session/:id', authMiddleware, createCheckoutSessionForBooking);

paymentRouter.get('/confirm', confirmPayment);

export default paymentRouter;