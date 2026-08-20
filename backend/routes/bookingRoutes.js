import express from 'express';
import authMiddleware from '../middleware/auth.js'
import { createBooking, deleteBooking,getBookings,getMyBookings,updateBooking,updateBookingStatus} from '../controllers/bookingController.js';
import { uploads } from '../middleware/uploads.js';

const bookingRouter = express.Router();

bookingRouter.post('/', authMiddleware, uploads.single('carImage'), createBooking);
bookingRouter.get('/', getBookings);

bookingRouter.get('/mybooking', authMiddleware, getMyBookings);

bookingRouter.put('/:id', uploads.single('carImage'), updateBooking);
bookingRouter.patch('/:id/status', updateBookingStatus);
bookingRouter.delete('/:id', deleteBooking);

export default bookingRouter;