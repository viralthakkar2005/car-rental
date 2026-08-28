import express from 'express';
import { createCar, deleteCar, getCarById, getCars, updateCar } from '../controllers/carController.js';
import { uploads } from '../middleware/uploads.js';
import adminAuth from '../middleware/adminAuth.js';

const carRouter = express.Router();

// Public: anyone can browse cars
carRouter.get('/', getCars);
carRouter.get('/:id', getCarById);

// Admin-only: adding/editing/removing fleet cars
carRouter.post('/', adminAuth, uploads.single('image'), createCar);
carRouter.put('/:id', adminAuth, uploads.single('image'), updateCar);
carRouter.delete('/:id', adminAuth, deleteCar);

export default carRouter;