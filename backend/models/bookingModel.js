import mongoose from "mongoose";
import Car from "./carModel.js";

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  { _id: false, default: {} }
);

const carSummarySchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, ref: "Car", required: true }, // coming from car model
    make: { type: String, default: "" },
    model: { type: String, default: "" },
    year: Number,
    dailyRate: { type: Number, default: 0 },
    category: { type: String, default: "Sedan" },
    seats: { type: Number, default: 4 },
    transmission: { type: String, default: "" },
    fuelType: { type: String, default: "" },
    mileage: { type: Number, default: 0 },
    image: { type: String, default: "" },
  },
  { _id: false }
);


const bookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    customer: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    car: { type: carSummarySchema, required: true },
    carImage: { type: String, default: "" },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    bookingDate: { type: Date, default: Date.now },
    // Fixed dealer branch locations — validated against the LOCATIONS list
    // in the controller, not hard-coded as a schema enum, so the list can
    // change without a migration.
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    status: {
      // pending    = submitted, awaiting admin's physical availability check
      // approved   = admin confirmed the car is available — customer may now pay
      // rejected   = admin could not fulfill this booking
      // active/upcoming/completed = normal paid-trip lifecycle
      // cancelled  = cancelled by customer or admin
      type: String,
      enum: ["pending", "approved", "rejected", "active", "completed", "cancelled", "upcoming"],
      default: "pending",
    },
    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentMethod: { type: String, enum: ["Credit Card", "Paypal"], default: "Credit Card" },
    sessionId: String,
    paymentIntentId: String,
    address: { type: addressSchema, default: () => ({}) },
    stripeSession: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Async hooks in modern Mongoose don't receive a next() callback — Mongoose
// just awaits the promise. Throwing (or letting an error propagate) is how
// you signal failure; no next() call needed or available.
bookingSchema.pre('validate', async function () {
  if (!this.car?.id) return;

  const { make, model, dailyRate } = this.car;
  if (make || model || dailyRate) return;

  const carDoc = await Car.findById(this.car.id).lean();
  if (carDoc) {
    Object.assign(this.car, {
      make: carDoc.make ?? this.car.make,
      model: carDoc.model ?? this.car.model,
      year: carDoc.year ?? this.car.year,
      dailyRate: carDoc.dailyRate ?? this.car.dailyRate,
      seats: carDoc.seats ?? this.car.seats,
      transmission: carDoc.transmission ?? this.car.transmission,
      fuelType: carDoc.fuelType ?? this.car.fuelType,
      mileage: carDoc.mileage ?? this.car.mileage,
      image: carDoc.image ?? this.car.image,
    });
    if (!this.carImage) this.carImage = carDoc.image || "";
  }
});


const blockingStatuses = ['pending', 'approved', 'active', 'upcoming'];

bookingSchema.post('save', async function (doc) {
  if (!doc.car?.id) return;

  const carId = doc.car.id;
  const bookingEntry = {
    bookingId: doc._id,
    pickupDate: doc.pickupDate,
    returnDate: doc.returnDate,
    status: doc.status,
  };

  // IMPORTANT: if this save happened inside a transaction (e.g. createBooking
  // uses session.withTransaction(...)), we MUST reuse that same session here.
  // Without it, this hook fires as a second, un-sessioned write to the same
  // Car document *while the transaction is still open* — that write and the
  // transaction's own pending write to Car race each other and MongoDB
  // reports it as "Write conflict during plan execution and yielding is
  // disabled" (error 112). Since the collision is between our own two writes
  // every single time (not an occasional overlap from another user), it
  // isn't actually transient and retrying the transaction never helps.
  const session = doc.$session() || undefined;

  // Always clear any stale entry for this booking first, then re-add it
  // only if its current status should block the car's availability.
  // (Previously this logic was inverted: it removed the entry for
  // blocking statuses and added it for non-blocking ones.)
  await Car.findByIdAndUpdate(
    carId,
    { $pull: { bookings: { bookingId: doc._id } } },
    { session }
  ).exec();

  if (blockingStatuses.includes(doc.status)) {
    await Car.findByIdAndUpdate(
      carId,
      { $push: { bookings: bookingEntry } },
      { session }
    ).exec();
  }
});

// Mongoose 7+ removed Document#remove(); deleteOne({ document: true }) is the
// modern equivalent — it fires when a document's own .deleteOne() is called.
bookingSchema.post('deleteOne', { document: true, query: false }, async function (doc) {
  if (!doc.car?.id) return;
  await Car.findByIdAndUpdate(
    doc.car.id,
    {
      $pull: { bookings: { bookingId: doc._id } }
    }
  ).exec();
})

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);