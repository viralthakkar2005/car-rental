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
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled", "upcoming"],
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

bookingSchema.pre('validate', async function (next) {
  if (!this.car?.id) return next();

  const { make, model, dailyRate } = this.car;
  if (make || model || dailyRate) return next();

  try {
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
    next()
  } catch (err) {
    next(err);
  }
});


const blockingStatuses = ['pending', 'active', 'upcoming'];

bookingSchema.post('save', async function (doc, next) {
  try {
    if (!doc.car?.id) return next();

    const carId = doc.car.id;
    const bookingEntry = {
      bookingId: doc._id,
      pickupDate: doc.pickupDate,
      returnDate: doc.returnDate,
      status: doc.status,
    };

    if (blockingStatuses.includes(doc.status)) {
      await Car.findByIdAndUpdate(
        carId,
        {
          $pull: { bookings: { bookingId: doc._id } }
        },
        { new: true }
      ).exec();

      await Car.findByIdAndUpdate(
        carId,
        { $pull: { bookings: bookingEntry } },
        { new: true }
      ).exec();
    }

    else {
      await Car.findByIdAndUpdate(
        carId,
        {
          $pull: { bookings: { bookingId: doc._id } }
        },
        { new: true }
      ).exec();
    }

    next();
  }

  
  catch (err) {
    next(err);
  }
});


bookingSchema.post('remove', async function (doc, next) {
  try {
    if (!doc.car?.id) return next();
    await Car.findByIdAndUpdate(
      doc.car.id,
      {
        $pull: { bookings: { bookingId: doc._id } }
      }
    ).exec();
    next();
  }

  catch (err) {
    next(err);
  }
})

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

