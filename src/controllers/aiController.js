// =============================================
// src/controllers/aiController.js — Gemini AI Integration
// =============================================
//
// PHASE 5 PREVIEW — Full implementation comes later
// For now: stub controllers so server starts without errors
//
// We'll replace these stubs in Phase 5 with real Gemini calls
// =============================================

const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');

// @route   POST /api/ai/match
// @desc    Use AI to match a lost item against all found items
// @access  Private
const matchItems = async (req, res) => {
  res.status(200).json({
    success: true,
    message: '🤖 AI matching — coming in Phase 5!',
    hint: 'Will use Google Gemini to compare item descriptions',
  });
};

// @route   GET /api/ai/suggestions/:id
// @desc    Get top 3 AI-suggested matches for a lost item
// @access  Private
const getSuggestions = async (req, res) => {
  res.status(200).json({
    success: true,
    message: '🤖 AI suggestions — coming in Phase 5!',
    itemId: req.params.id,
  });
};

// @route   POST /api/ai/describe
// @desc    Use AI to enhance a user's item description
// @access  Private
const enhanceDescription = async (req, res) => {
  res.status(200).json({
    success: true,
    message: '🤖 Description enhancer — coming in Phase 5!',
    hint: 'Will make vague descriptions more searchable',
  });
};

// @route   POST /api/ai/ask
// @desc    Ask the AI anything about campus lost & found
// @access  Private
const askAI = async (req, res) => {
  res.status(200).json({
    success: true,
    message: '🤖 Ask AI — coming in Phase 5!',
  });
};

module.exports = { matchItems, getSuggestions, enhanceDescription, askAI };
