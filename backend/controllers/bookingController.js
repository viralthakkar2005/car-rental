import mongoose from "mongoose";
import Booking from '../models/bookingModel.js';
import Car from '../models/carModel.js';
import cloudinary from '../config/cloudinary.js';
import { uploadBufferToCloudinary } from '../middleware/uploads.js';
import { isValidLocation, LOCATIONS } from '../constants/locations.js';

const BLOCKING_STATUSES = ["pending", "approved", "active", "upcoming"];

const tryParseJSON = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

const buildCarSummary = (src = {}) => {
  const id = src._id?.toString?.() || src.id || null

  return {
    id,
    make: src.make,
    model: src.model || "",
    year: src.year ? Number(src.year) : null,
    dailyRate: src.dailyRate ? Number(src.dailyRate) : 0,
    seats: src.seats ? Number(src.seats) : 4,
    transmission: src.transmission,
    fuelType: src.fuelType,
    mileage: src.mileage ? Number(src.mileage) : 0,
    image: src.image || src.carImage || "",
  };
};

// CREATE BOOKING
export const createBooking = async (req, res) => {
  let { customer, email, phone, car, pickupDate, returnDate, amount, details, address, carImage, pickupLocation, dropLocation } = req.body;

  // ---- Validation that doesn't need the DB happens up front, outside any
  // transaction, so it never gets caught up in a transaction retry. ----
  if (!customer || !email || !car || !pickupDate || !returnDate || !pickupLocation || !dropLocation) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  if (!isValidLocation(pickupLocation) || !isValidLocation(dropLocation)) {
    return res.status(400).json({ success: false, message: `pickupLocation/dropLocation must be one of: ${LOCATIONS.join(', ')}` });
  }

  const pickup = new Date(pickupDate);
  const ret = new Date(returnDate);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime()) || pickup > ret) {
    return res.status(400).json({ success: false, message: 'Invalid pickup and return date' });
  }

  const session = await mongoose.startSession();

  // Result handed out of the transaction callback once it succeeds. We never
  // send the HTTP response from inside the callback, because withTransaction()
  // will silently re-run the callback if MongoDB reports a transient write
  // conflict (error code 112 / TransientTransactionError) — exactly the error
  // reported here. Sending a response from inside it could fire twice.
  let createdBookingId = null;
  let controlledFailure = null; // { status, message } for expected business-rule stops (not real errors)

  try {
    await session.withTransaction(async () => {
      // Resolve car summary (accepts ObjectId string, object, or stringified JSON)
      let carSummary = null;
      if (typeof car === "string" && /^[0-9a-fA-F]{24}$/.test(car)) {
        const carDoc = await Car.findById(car).session(session).lean();
        if (!carDoc) { controlledFailure = { status: 404, message: "Car not found" }; return; }
        carSummary = buildCarSummary(carDoc);
      } else {
        const parsed = tryParseJSON(car) || car;
        carSummary = buildCarSummary(parsed);
        if (!carSummary.id) { controlledFailure = { status: 400, message: "Invalid car payload" }; return; }
        const carExists = await Car.exists({ _id: carSummary.id }).session(session);
        if (!carExists) { controlledFailure = { status: 404, message: "Car not found" }; return; }
      }

      const carId = carSummary.id;
      const conflict = await Booking.findOne({
        "car.id": carId,
        status: { $in: BLOCKING_STATUSES },
        pickupDate: { $lte: ret },
        returnDate: { $gte: pickup },
      })
        .sort({ pickupDate: 1 })
        .session(session)
        .lean();

      if (conflict) {
        const fmt = (d) =>
          new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        controlledFailure = {
          status: 409,
          message: `This car is already booked from ${fmt(conflict.pickupDate)} to ${fmt(conflict.returnDate)}. Please choose different dates.`,
        };
        return;
      }

      const bookingData = {
        userId: req?.user?.id || req.user?._id || null,   //for payment
        customer, email, phone,
        car: carSummary,
        carImage: carImage || carSummary.image || "",
        pickupDate: pickup,
        returnDate: ret,
        pickupLocation,
        dropLocation,
        amount: Number(amount || 0),
        details: tryParseJSON(details),
        address: tryParseJSON(address),
        paymentStatus: "pending",
        status: "pending",
      };

      // Booking.create() runs this document's 'save' hooks, and
      // bookingModel.js's post('save') hook is what pushes the matching
      // entry onto Car.bookings (reusing this same transaction session).
      // Doing it again here would be a second write to the same Car
      // document inside the same transaction — that duplicate write is what
      // was causing the "Write conflict... yielding is disabled" error.
      const createdArr = await Booking.create([bookingData], { session });
      const createdBooking = createdArr[0];

      createdBookingId = createdBooking._id;
    });

    if (controlledFailure) {
      return res.status(controlledFailure.status).json({ success: false, message: controlledFailure.message });
    }

    const saved = await Booking.findById(createdBookingId).lean();
    return res.status(201).json({
      success: true,
      booking: saved
    });

  } catch (err) {
    console.error('Create Booking Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};



// GET FUNCTION
export const getBookings = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 12, 100);
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const carFilter = req.query.car?.trim() || "";
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const query = {};
    if (search) {
      const q = { $regex: search, $options: "i" };
      query.$or = [{ customer: q }, { email: q }, { "car.make": q }, { "car.model": q }];
    }

    if (status) query.status = status;

    if (carFilter) {
      if (/^[0-9a-fA-F]{24}$/.test(carFilter)) query["car.id"] = carFilter;
      else query.$or = [...(query.$or || []), { "car.make": { $regex: carFilter, $options: "i" } }, { "car.model": { $regex: carFilter, $options: "i" } }];
    }

    if (from || to) {
      query.pickupDate = {};
      if (from) query.pickupDate.$gte = from;
      if (to) query.pickupDate.$lte = to;
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .sort({ bookingDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

      res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: bookings
    });

  } 
  
  catch (err) {
    next(err);
  }
};


// GET BOOKING FOR A PARTICULAR USER
export const getMyBookings = async (req, res, next) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id))
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = req.user._id || req.user.id;
    const bookings = await Booking.find({ userId }).sort({ bookingDate: -1 }).lean();
    res.json(bookings);
  }

  catch (err) {
    next(err);
  }
};

// UPDATE FUNCTION
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // image handling

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      booking.carImage = result.secure_url;
    } else if (req.body.carImage !== undefined) {
      booking.carImage = req.body.carImage || booking.carImage;
    }

    const updatable = ["customer", "email", "phone", "car", "pickupDate", "returnDate", "bookingDate", "status", "amount", "details", "address", "paymentStatus", "paymentMethod", "pickupLocation", "dropLocation"];
    for (const f of updatable) {
      if (req.body[f] === undefined) continue;
      if (["pickupDate", "returnDate", "bookingDate"].includes(f)) booking[f] = new Date(req.body[f]);
      else if (f === "amount") booking[f] = Number(req.body[f]);
      else if (f === "details" || f === "address") booking[f] = tryParseJSON(req.body[f]);
      else if (f === "car") {
        const c = tryParseJSON(req.body.car);
        if (c) {
          const summary = buildCarSummary(c);
          if (!summary.id && booking.car?.id) summary.id = booking.car.id;
          booking.car = summary;
        }
      } else booking[f] = req.body[f];
    }

    const updated=await booking.save();
    res.json(updated);

  } catch (err) {
    next(err);
  }
};

const ALL_STATUSES = ["pending", "approved", "rejected", "active", "completed", "cancelled", "upcoming"];

// CUSTOMER-ONLY: cancel a booking they own. This is the only status change
// a customer is ever allowed to make — route-protected with authMiddleware,
// never adminAuth, so req.user is always a real 'users' collection doc here.
export const cancelMyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const ownsBooking = req.user && String(booking.userId) === String(req.user._id);
    if (!ownsBooking) {
      return res.status(403).json({ message: 'Not authorized to modify this booking' });
    }

    booking.status = 'cancelled';
    const updated = await booking.save();
    res.json(updated);
  }

  catch (err) {
    next(err);
  }
};

// ADMIN-ONLY: move a booking to any status (this is how "approve" works —
// set status to "active" — and how a booking is put back to "pending" or
// any other state). Route-protected with adminAuth, so ownership doesn't
// apply — an admin can act on any booking.
export const adminUpdateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    if (!ALL_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${ALL_STATUSES.join(', ')}` });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    booking.status = status;
    const updated = await booking.save();
    res.json(updated);
  }

  catch (err) {
    next(err);
  }
};

// ADMIN: MARK A BOOKING'S PAYMENT AS PAID / PENDING
// Used for manual / offline payments the admin wants to record by hand.
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    if (!paymentStatus || !["pending", "paid"].includes(paymentStatus)) {
      return res.status(400).json({ message: "paymentStatus must be 'pending' or 'paid'" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    booking.paymentStatus = paymentStatus;
    if (paymentMethod) booking.paymentMethod = paymentMethod;

    const updated = await booking.save();
    res.json(updated);
  }

  catch (err) {
    next(err);
  }
};



// DELETE FUNCTION
export const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    await booking.deleteOne();
    res.json({ message: 'Booking deleted successfully!' });
  }

  catch (err) {
    next(err);
  }
};


// CUSTOMER-ONLY: update their own personal contact details on a booking.
// Only name/email/phone can change here — never car, dates, amount, or
// status. Those stay locked once a booking exists, per site policy.
export const updateMyBookingDetails = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const ownsBooking = req.user && String(booking.userId) === String(req.user._id || req.user.id);
    if (!ownsBooking) {
      return res.status(403).json({ message: 'Not authorized to modify this booking' });
    }

    const { customer, email, phone } = req.body;
    if (!customer || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    booking.customer = customer;
    booking.email = email;
    if (phone !== undefined) booking.phone = phone;

    const updated = await booking.save();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};