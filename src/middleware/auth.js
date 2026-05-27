// =============================================
// src/middleware/auth.js — JWT Verification Middleware
// =============================================
//
// WHAT IS JWT?
// JSON Web Token — a self-contained, digitally signed token
// that proves who the user is without hitting the database.
//
// STRUCTURE: header.payload.signature
//   header   → {"alg": "HS256", "typ": "JWT"}  (base64 encoded)
//   payload  → {"id": "abc123", "exp": 1234567} (base64 encoded)
//   signature → HMAC(header + payload, JWT_SECRET) — the lock
//
// HOW IT WORKS:
// 1. User logs in → server creates JWT signed with secret
// 2. User stores JWT (usually localStorage)
// 3. User sends JWT in every request header
// 4. Server verifies signature — if valid, trusts the payload
//
// WHY NO DATABASE LOOKUP?
// The signature proves the token wasn't tampered with.
// Only our server knows the JWT_SECRET, so only we could
// have created that signature. Mathematical proof of identity.
//
// ANALOGY: A wristband at a concert.
// Security stamps it (signs it). At the door, they check
// the stamp is genuine — they don't call the box office
// every time. The stamp IS the proof.
// =============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This function IS the middleware
// Express will call it with (req, res, next) automatically
const protect = async (req, res, next) => {
  let token;

  // JWT is sent in the Authorization header as:
  // "Bearer eyJhbGciOiJIUzI1NiIs..."
  // We check the header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Split "Bearer eyJ..." → ["Bearer", "eyJ..."]
    // Take index [1] — the actual token
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token found, reject immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    // jwt.verify() does two things:
    // 1. Checks the signature against JWT_SECRET
    // 2. Checks the expiration time (exp claim)
    // If either fails, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded = { id: "user_mongo_id", iat: 1234, exp: 5678 }
    // We use decoded.id to fetch the current user from DB
    // select('-password') ensures we don't fetch the password hash
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    // Attach the user to the request object
    // Now any route after this middleware can access req.user
    // This is the "passing the baton" pattern
    req.user = user;

    // Call next() to pass control to the actual route handler
    next();

  } catch (error) {
    // Common JWT errors:
    // JsonWebTokenError → token was tampered with
    // TokenExpiredError → token has expired (past exp time)
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired — please log in again',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
    });
  }
};

module.exports = protect;
