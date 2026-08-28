import Booking from '../models/bookingModel.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const STRIPE_API_VERSION = "2022-11-15";


// GET STRIPE FROM .ENV
const getStripe = () => {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('Missing Stripe key');
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
};

// CUSTOMER STARTS PAYMENT ON AN ALREADY-APPROVED BOOKING
// This never creates a booking — createBooking (bookingController.js) does
// that, with no payment involved. This only fires once the admin has
// physically confirmed the car is available and flipped status to
// 'approved'. The booking's own stored amount/car/dates are used to build
// the Stripe session — nothing here is taken from the request body.
export const createCheckoutSessionForBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const ownsBooking = req.user && String(booking.userId) === String(req.user._id || req.user.id);
    if (!ownsBooking) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This booking is already paid' });
    }
    if (booking.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'This booking is not yet approved for payment' });
    }

    let stripe;
    try { stripe = getStripe(); } catch (err) {
      return res.status(500).json({ success: false, message: 'Payment not configure', error: err.message });
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: booking.email || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${booking.car?.make || ''} ${booking.car?.model || ''}`.trim() || 'Car Rental',
                description: `Rental ${booking.pickupDate.toISOString().slice(0, 10)} → ${booking.returnDate.toISOString().slice(0, 10)}`,
              },
              unit_amount: Math.round(Number(booking.amount || 0) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
        cancel_url: `${CLIENT_URL}/cancel?payment_status=cancel`,
        metadata: {
          bookingId: booking._id.toString(),
        },
      });
    } catch (stripeErr) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create Stripe Checkout Session',
        error: stripeErr.message || String(stripeErr),
      });
    }

    booking.sessionId = session.id;
    booking.stripeSession = { id: session.id, url: session.url || null };
    await booking.save();

    return res.json({ success: true, id: session.id, url: session.url, bookingId: booking._id });
  } catch (err) {
    console.error('CreateCheckoutSessionForBooking Error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
};

// SUCCESSFULL PAYMENT VERIFICATION
export const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ success: false, message: 'Session_id required' });

    let stripe;
    try { stripe = getStripe(); } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Payment not configure',
        error: err.message
      })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({
      success: false,
      message: 'Session not found'
    });

    if (session.payment_status !== 'paid')
      return res.status(400).json({
    success:false,
    message:`Payment not completed. status=${session.payment_status}`,
    session
  });
const bookingId = session.metadata?.bookingId;

    let order = null;
    if (bookingId) {
      order = await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'paid',
        status: 'active',
        paymentIntentId: session.payment_intent || '',
        paymentDetails: {
          amount_total: session.amount_total || null,
          currency: session.currency || null
        },
      }, { new: true });
    }

    if (!order) {
      order = await Booking.findOneAndUpdate({ sessionId: session_id }, {
        paymentStatus: 'paid',
        status: 'active',
        paymentIntentId: session.payment_intent || '',
         paymentDetails: {
          amount_total: session.amount_total || null,
          currency: session.currency || null
        },
      })
    }

    if (!order) return res.status(404).json({
      success: false,
      message: 'Booking not found for this session',
      session
    });

    return res.json({ success: true, order });

  }

  catch(err){
    console.error('Confirm Payment Error:',err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
}