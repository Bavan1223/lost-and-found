// =============================================
// src/routes/lost.js — Lost Item Routes
// =============================================
// Routes: GET    /api/lost         → list all lost items
//         GET    /api/lost/:id     → get one lost item
//         POST   /api/lost         → report a lost item
//         PUT    /api/lost/:id     → update a lost report
//         DELETE /api/lost/:id     → remove a lost report
// =============================================

const express = require('express');
const router = express.Router();
const {
  getAllLostItems,
  getLostItemById,
  createLostItem,
  updateLostItem,
  deleteLostItem,
} = require('../controllers/lostController');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateLostItem } = require('../middleware/validate');

// Public — anyone can VIEW lost items (no login needed to browse)
router.get('/', getAllLostItems);
router.get('/:id', getLostItemById);

// Protected — must be logged in to report/modify
// Order: auth → validate → upload → controller
router.post('/', protect, validateLostItem, upload.single('image'), createLostItem);
router.put('/:id', protect, upload.single('image'), updateLostItem);
router.delete('/:id', protect, deleteLostItem);

module.exports = router;
