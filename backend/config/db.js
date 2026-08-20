import mongoose from "mongoose";

export const connectDB=async()=>{
  await mongoose.connect('mongodb+srv://codeviru_db_user:9soqEdGMarYDXqDn@car-rental.owhw6ar.mongodb.net/car')
  .then(()=>console.log('db connect'));
}