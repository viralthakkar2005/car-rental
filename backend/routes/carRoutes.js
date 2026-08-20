import express from 'express';
import { createCar, deleteCar, getCarById, getCars, updateCar } from '../controllers/carController.js';
import { uploads } from '../middleware/uploads.js';

const carRouter = express.Router();

carRouter.get('/', getCars);
carRouter.get('/:id', getCarById);
carRouter.post('/', uploads.single('image'), createCar);

carRouter.put('/:id', uploads.single('image'), updateCar);
carRouter.delete('/:id', deleteCar);

export default carRouter;