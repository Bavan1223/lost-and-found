// =============================================
// src/routes/ai.js — AI-Powered Routes
// =============================================
// Routes: POST /api/ai/match          → match lost vs found
//         GET  /api/ai/suggestions/:id → top matches for a lost item
//         POST /api/ai/describe        → enhance item description
//         POST /api/ai/ask             → free-form AI Q&A
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
const {
  validateMatchRequest,
  validateDescribeRequest,
  validateAskRequest,
} = require('../middleware/validate');

// All AI routes require authentication
// (prevents API key abuse by unauthenticated users)
router.use(protect);

// POST /api/ai/match — find matches for a specific lost item
router.post('/match', validateMatchRequest, matchItems);

// GET /api/ai/suggestions/:id — quick suggestions by lost item ID
router.get('/suggestions/:id', getSuggestions);

// POST /api/ai/describe — enhance item description using AI
router.post('/describe', validateDescribeRequest, enhanceDescription);

// POST /api/ai/ask — free-form AI Q&A
router.post('/ask', validateAskRequest, askAI);

module.exports = router;
