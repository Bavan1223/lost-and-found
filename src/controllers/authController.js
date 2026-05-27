// =============================================
// src/controllers/authController.js
// =============================================
//
// Controllers are the "business logic" layer.
// Routes define WHAT URL triggers code.
// Controllers define WHAT that code actually does.
//
// ANALOGY: Routes = menu items. Controllers = kitchen recipes.
// =============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =============================================
// HELPER — Generate JWT Token
// =============================================
const generateToken = (userId) => {
  // jwt.sign(payload, secret, options)
  // payload: data to encode in the token (just the ID)
  // secret: our JWT_SECRET from .env — keeps signatures valid
  // expiresIn: token self-destructs after this time
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// =============================================
// @route   POST /api/auth/register
// @desc    Register a new student
// @access  Public
// =============================================
const register = async (req, res) => {
  try {
    const { name, email, password, studentId, location } = req.body;

    // 1. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // 2. Create the user
    // The pre-save hook in User.js will hash the password
    // before it hits the database — we don't do it here
    const user = await User.create({
      name,
      email,
      password, // raw password — hook hashes it
      studentId,
      location,
    });

    // 3. Generate a JWT for the new user
    const token = generateToken(user._id);

    // 4. Send response
    // HTTP 201 = "Created" (resource was successfully created)
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    // Mongoose validation errors have a specific structure
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// =============================================
// @route   POST /api/auth/login
// @desc    Login and get JWT token
// @access  Public
// =============================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email
    // .select('+password') overrides the select: false in schema
    // We NEED the password here to compare it
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // IMPORTANT: Same error message for both "user not found"
      // and "wrong password" — never reveal which is wrong!
      // This prevents "user enumeration" attacks
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare the provided password against the stored hash
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password', // Same message!
      });
    }

    // Generate token for valid credentials
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// =============================================
// @route   GET /api/auth/me
// @desc    Get current logged-in user's profile
// @access  Private (requires JWT)
// =============================================
const getMe = async (req, res) => {
  // req.user was set by the protect middleware
  // We don't need to query the DB again — it's already there
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = { register, login, getMe };
