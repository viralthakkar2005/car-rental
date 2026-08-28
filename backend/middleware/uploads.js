import multer from "multer";
import cloudinary from '../config/cloudinary.js';

// Files are kept in memory (as a Buffer) instead of written to local disk —
// local disk storage does not survive on serverless hosts like Vercel
// (the filesystem there is read-only/ephemeral). The buffer is then
// streamed up to Cloudinary manually in the controller via
// uploadBufferToCloudinary(), below.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images file are allowed'), false);
};

export const uploads = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// Uploads an in-memory file buffer (req.file.buffer) to Cloudinary and
// resolves with the standard Cloudinary result object — most importantly
// result.secure_url (the image URL to store) and result.public_id (needed
// later to delete the image).
export const uploadBufferToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const base = (originalname || 'image')
      .replace(/\.[^/.]+$/, '')
      .replace(/\s+/g, '-');

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'car-rental',
        public_id: `${base}-${Date.now()}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};