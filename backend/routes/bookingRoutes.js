import express from 'express';
import authMiddleware from '../middleware/auth.js'
import adminAuth from '../middleware/adminAuth.js'
import { createBooking, deleteBooking, getBookings, getMyBookings, updateBooking, cancelMyBooking, adminUpdateBookingStatus, updatePaymentStatus, updateMyBookingDetails } from '../controllers/bookingController.js';
import { uploads } from '../middleware/uploads.js';

const bookingRouter = express.Router();

// Customer creates their own booking
bookingRouter.post('/', authMiddleware, uploads.single('carImage'), createBooking);

// Admin: list every booking (fleet-wide view)
bookingRouter.get('/', adminAuth, getBookings);

// Customer: view their own bookings
bookingRouter.get('/mybooking', authMiddleware, getMyBookings);

// Admin: full edit of a booking record
bookingRouter.put('/:id', adminAuth, uploads.single('carImage'), updateBooking);

// Customer-only: cancel their OWN booking. This is the only status change a
// customer is ever allowed to make.
bookingRouter.patch('/:id/status', authMiddleware, cancelMyBooking);

// Admin-only: set any status (approve/pending/active/completed/etc.)
bookingRouter.patch('/:id/admin-status', adminAuth, adminUpdateBookingStatus);

// Admin: mark a booking's payment as paid/pending (e.g. cash payments taken
// outside of Stripe)
bookingRouter.patch('/:id/payment', adminAuth, updatePaymentStatus);

// Admin: delete a booking record
bookingRouter.delete('/:id', adminAuth, deleteBooking);

bookingRouter.patch('/:id/details', authMiddleware, updateMyBookingDetails);

export default bookingRouter;