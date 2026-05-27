// =============================================
// src/routes/auth.js — Authentication Routes
// =============================================
// Routes: POST /api/auth/register
//         POST /api/auth/login
//         GET  /api/auth/me
// =============================================

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth');

// Public routes — no token needed
router.post('/register', register);
router.post('/login', login);

// Protected route — must have valid JWT
router.get('/me', protect, getMe);

module.exports = router;
