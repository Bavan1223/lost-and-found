// =============================================
// src/routes/found.js — Found Item Routes
// =============================================
// Routes: GET    /api/found        → list all found items
//         GET    /api/found/:id    → get one found item
//         POST   /api/found        → report a found item
//         PUT    /api/found/:id    → update a found report
//         DELETE /api/found/:id    → remove when claimed
// =============================================

const express = require('express');
const router = express.Router();
const {
  getAllFoundItems,
  getFoundItemById,
  createFoundItem,
  updateFoundItem,
  deleteFoundItem,
} = require('../controllers/foundController');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public — anyone can VIEW found items
router.get('/', getAllFoundItems);
router.get('/:id', getFoundItemById);

// Protected — must be logged in to report/modify
router.post('/', protect, upload.single('image'), createFoundItem);
router.put('/:id', protect, upload.single('image'), updateFoundItem);
router.delete('/:id', protect, deleteFoundItem);

module.exports = router;
