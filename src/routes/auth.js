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
const { validateRegister, validateLogin } = require('../middleware/validate');

// Public routes — no token needed
// validateRegister runs first, then the controller only if validation passes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected route — must have valid JWT
router.get('/me', protect, getMe);

module.exports = router;
