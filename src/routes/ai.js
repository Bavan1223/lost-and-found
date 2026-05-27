// =============================================
// src/routes/ai.js — AI-Powered Routes
// =============================================
// Routes: POST /api/ai/match          → match lost vs found
//         GET  /api/ai/suggestions/:id → top 3 matches for item
//         POST /api/ai/describe        → enhance a description
//         POST /api/ai/ask             → ask AI about items
// =============================================

const express = require('express');
const router = express.Router();
const {
  matchItems,
  getSuggestions,
  enhanceDescription,
  askAI,
} = require('../controllers/aiController');
const protect = require('../middleware/auth');

// All AI routes require authentication
// (AI calls cost money — we only allow logged-in users)
router.post('/match', protect, matchItems);
router.get('/suggestions/:id', protect, getSuggestions);
router.post('/describe', protect, enhanceDescription);
router.post('/ask', protect, askAI);

module.exports = router;
