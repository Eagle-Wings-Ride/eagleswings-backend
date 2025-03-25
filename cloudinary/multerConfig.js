const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // Store in memory for Cloudinary upload

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and PDFs allowed.'), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
