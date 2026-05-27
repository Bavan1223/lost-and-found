// =============================================
// src/config/db.js — MongoDB Connection
// =============================================
//
// WHAT THIS FILE DOES:
// Establishes and manages the connection between our
// Node.js app and MongoDB Atlas (cloud database).
//
// WHY SEPARATE FILE?
// Single Responsibility Principle — one file, one job.
// If we need to change our DB config, we change it here,
// not scattered across 20 files.
//
// HOW MONGOOSE WORKS UNDER THE HOOD:
// Mongoose maintains a connection POOL — multiple open
// connections ready to handle concurrent requests.
// You don't connect per-request (too slow), you connect
// ONCE at startup and reuse the pool.
// =============================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect() returns a Promise
    // We await it so the server doesn't start before DB is ready
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options prevent deprecation warnings
      // and configure the connection pool
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if can't connect
      maxPoolSize: 10,                // Max 10 simultaneous connections
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Return the connection for use in tests
    return conn;
    
  } catch (error) {
    // Common errors:
    // "bad auth" → wrong username/password in MONGODB_URI
    // "ECONNREFUSED" → MongoDB not running / wrong URI
    // "timeout" → network issue or IP not whitelisted in Atlas
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.error('💡 Check: Is your MONGODB_URI correct in .env?');
    console.error('💡 Check: Is your IP whitelisted in MongoDB Atlas?');
    throw error; // Re-throw so server.js can catch it
  }
};

// =============================================
// CONNECTION EVENT LISTENERS
// =============================================
// Mongoose emits events when connection state changes
// This gives us visibility into DB health at runtime

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

module.exports = connectDB;
