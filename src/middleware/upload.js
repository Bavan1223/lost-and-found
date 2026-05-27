// =============================================
// src/middleware/upload.js — Multer File Upload Config
// =============================================
//
// WHAT IS MULTER?
// Multer is middleware for handling multipart/form-data
// — the format browsers use when uploading files.
//
// WHAT IS MULTIPART/FORM-DATA?
// Normal form data: name=Bavan&email=bavan@uni.edu (text)
// File upload data: binary file data chunked and encoded
// The "multipart" means the request is split into PARTS
// — some text parts, some binary (file) parts
//
// WHAT IS A BUFFER?
// Raw binary data in memory — bytes (0s and 1s).
// When a file is uploaded, it arrives as a stream of bytes.
// Multer captures these bytes before they can be processed.
// =============================================

const multer = require('multer');
const path = require('path');

// =============================================
// STORAGE CONFIGURATION
// =============================================
// diskStorage() saves files to the filesystem
// (For production, we'd use cloudinary or S3 instead)

const storage = multer.diskStorage({
  // destination: WHERE to save uploaded files
  destination: function (req, file, cb) {
    // cb = callback. Call cb(error, path)
    // null = no error, 'uploads/' = save here
    cb(null, 'uploads/');
  },

  // filename: WHAT to name the saved file
  filename: function (req, file, cb) {
    // Create a unique filename to prevent collisions
    // Format: fieldname-timestamp.extension
    // e.g., "image-1699999999999.jpg"
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// =============================================
// FILE FILTER — Security Validation
// =============================================
// CRITICAL: Without this, anyone could upload .exe, .php files
// and potentially execute code on your server — very dangerous!

const fileFilter = (req, file, cb) => {
  // MIME type check — what kind of file is this?
  // MIME types: image/jpeg, image/png, image/gif, image/webp
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  // Extension check — double validation layer
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(fileExt)) {
    // cb(null, true) → accept the file
    cb(null, true);
  } else {
    // cb(error) → reject the file with an error
    cb(
      new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP allowed.'),
      false
    );
  }
};

// =============================================
// CREATE THE MULTER INSTANCE
// =============================================
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max (5 * 1024 bytes * 1024 bytes)
    files: 1,                   // Only 1 file per request
  },
});

module.exports = upload;
