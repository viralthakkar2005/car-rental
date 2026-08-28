import Car from "../models/carModel.js";
import cloudinary from '../config/cloudinary.js';
import { uploadBufferToCloudinary } from '../middleware/uploads.js';

export const createCar = async (req, res, next) => {
  try {
    const {
      make, model, dailyRate, category, description,
      year, color, seats, transmission, fuelType, mileage, status
    } = req.body;

    if (!make || !model || !dailyRate) {
      return res.status(400).json({
        message: 'Make, model and dailyRate are required.'
      })
    }
    let imageUrl = req.body.image || '';
    let imagePublicId = '';
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    //saving to db

    const car = new Car({
      make,
      model,
      year: year ? Number(year) : undefined,
      color: color || '',
      category: category || 'Sedan',
      seats: seats ? Number(seats) : 4,
      transmission: transmission || 'Automatic',
      fuelType: fuelType || 'Gasoline',
      mileage: mileage ? Number(mileage) : 0,
      dailyRate: Number(dailyRate),
      status: status || 'available',
      image: imageUrl || '',
      imagePublicId,
      description: description || ''
    });

    const saved = await car.save(); // FIXED: was Car.save() — Car is the model, not the instance
    res.status(201).json(saved);

  }

  catch (error) {
    next(error);
  }
}

export const getCars = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';

    const query = {};
    if (search) {
      query.$or = [
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const total = await Car.countDocuments(query);
    const cars = await Car.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const carsWithAvailability = cars.map(c => {
      const plain = c.toObject ? c.toObject() : c;
      plain.availability = c.getAvailabilitySummary();
      return plain;
    })
    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: carsWithAvailability
    });

  }
  catch (err) {
    next(err)
  }
}

// GET FUNCTION TO GET CAR BY ID
export const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const plain = car.toObject();
    plain.availability = car.getAvailabilitySummary();
    res.json(plain);
  }

  catch (err) {
    next(err)
  }
}

export const updateCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    if (req.file) {
      if (car.imagePublicId) {
        cloudinary.uploader.destroy(car.imagePublicId).catch((err) => console.warn('Failed to delete old image:', err));
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      car.image = result.secure_url;
      car.imagePublicId = result.public_id;
    }

    else if (req.body.image !== undefined) {
      if (!req.body.image && car.image) {
        if (car.imagePublicId) {
          cloudinary.uploader.destroy(car.imagePublicId).catch((err) => console.warn('Failed to delete old image:', err));
        }
        car.image = '';
        car.imagePublicId = '';
      }
    }

    const fields = ['make', 'model', 'year', 'color', 'category', 'seats', 'transmission', 'fuelType', 'mileage', 'dailyRate', 'status', 'description'];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (['year', 'seats', 'mileage', 'dailyRate'].includes(f)) car[f] = Number(req.body[f]);
        else car[f] = req.body[f];
      }
    });
    const updated = await car.save();
    res.json(updated);

  }

  catch (error) {
    next(error);
  }
}

// delete method
export const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    if (car.imagePublicId) {
      cloudinary.uploader.destroy(car.imagePublicId).catch((err) => console.warn('Failed to delete image:', err));
    }

    res.json({ message: 'Car deleted successfully!' })
  }

  catch (err) {
    next(err)
  }
}