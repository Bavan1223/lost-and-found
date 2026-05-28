// =============================================
// server.js — The Entry Point of Our Application
// =============================================
//
// WHAT THIS FILE DOES:
// This is the "front door" of our server. When you run
// `node server.js`, Node.js starts here and:
//   1. Loads all our configuration
//   2. Sets up Express with middleware
//   3. Connects all our routes
//   4. Starts listening for incoming HTTP requests
//
// ANALOGY: If our app were a restaurant, this file
// is the building itself — it sets up the kitchen,
// hires the staff, and opens the front door.
// =============================================

// Load environment variables from .env file FIRST
// Must be before any other imports that might need env vars
require('dotenv').config();

const express = require('express');
const fs = require('fs'); // Node.js built-in file system module

// Auto-create the uploads/ directory if it doesn't exist
// This prevents Multer from crashing on fresh clones of the project
// fs.existsSync() checks synchronously (startup only — OK to block here)
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
  console.log('📁 Created uploads/ directory');
}

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import our database connection function
const connectDB = require('./src/config/db');

// Import all route handlers
const authRoutes = require('./src/routes/auth');
const lostRoutes = require('./src/routes/lost');
const foundRoutes = require('./src/routes/found');
const aiRoutes = require('./src/routes/ai');

// =============================================
// CREATE THE EXPRESS APPLICATION
// =============================================
// express() creates an application object — think of it
// as the container that holds our entire web server
const app = express();

// =============================================
// MIDDLEWARE STACK
// =============================================
// Remember: middleware runs in ORDER, top to bottom.
// Every request passes through all of these before
// reaching the actual route handler.

// helmet() adds security HTTP headers automatically
// Protects against: clickjacking, XSS, MIME sniffing, etc.
// ANALOGY: The security guards at the restaurant entrance
app.use(helmet());

// cors() controls which domains can talk to our API
// Without this, browsers block requests from other origins
// ANALOGY: The guest list — only approved visitors get in
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4000',
  credentials: true, // Allow cookies/auth headers
}));

// morgan() logs every HTTP request to the console
// Format 'dev' = colored, concise output
// ANALOGY: The maitre d' writing down every table order
app.use(morgan('dev'));

// express.json() parses incoming JSON request bodies
// Without this, req.body is undefined for JSON requests
// ANALOGY: The translator who converts JSON into a JS object
app.use(express.json({ limit: '10mb' }));

// express.urlencoded() parses form data
// extended: true allows nested objects in form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// RATE LIMITING
// =============================================
// WHAT IS RATE LIMITING?
// Limits how many requests one IP can make in a time window.
// Without it: a hacker can brute-force passwords or drain your
// Gemini API credits in seconds.
//
// ANALOGY: A nightclub bouncer — after 10 tries you're blocked.

// General API limiter — applies to all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15min per IP
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait 15 minutes.' },
});
app.use(globalLimiter);

// Stricter auth limiter — prevents brute-force password attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login/register attempts per 15min
  message: { success: false, message: 'Too many auth attempts. Wait 15 minutes.' },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// AI limiter — prevents Gemini API key from being drained
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 AI requests per hour per IP
  message: { success: false, message: 'AI rate limit reached. Try again in 1 hour.' },
});

// =============================================
// HEALTH CHECK ROUTE
// =============================================
// This is the first route — a simple endpoint that
// lets us verify the server is alive.
// Used by: load balancers, monitoring systems, Render.com
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎒 Campus Lost & Found API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// =============================================
// API ROUTES
// =============================================
// Each route file handles a specific "section" of our API
// The first argument is the BASE PATH for that section

// DB guard — routes that need MongoDB get a clean error if it's down
// This prevents unhandled promise rejections and gives helpful messages
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected. Please check MongoDB Atlas Network Access.',
      fix: 'cloud.mongodb.com → Network Access → Add IP (0.0.0.0/0)',
    });
  }
  next();
};

app.use('/api/auth', requireDB, authLimiter, authRoutes);  // /api/auth/register, /api/auth/login
app.use('/api/lost', requireDB, lostRoutes);                // /api/lost, /api/lost/:id
app.use('/api/found', requireDB, foundRoutes);              // /api/found, /api/found/:id
app.use('/api/ai', requireDB, aiLimiter, aiRoutes);         // /api/ai/match, /api/ai/describe

// =============================================
// 404 HANDLER
// =============================================
// If no route above matched, this runs.
// Express checks routes in order — if none match, we end up here.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// =============================================
// GLOBAL ERROR HANDLER
// =============================================
// Express's special 4-argument middleware = error handler
// Any route/middleware that calls next(error) ends up here
// ANALOGY: The manager who handles all customer complaints
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only show stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// =============================================
// START THE SERVER
// =============================================
const PORT = process.env.PORT || 5000;

// Track DB connection status separately from server status
// This allows the server to start even if MongoDB is temporarily unreachable
// Real-world apps do this — a dead DB shouldn't take the whole API offline
let dbConnected = false;

// Add a DB status check to the health route
// Overwrite the earlier health check with a richer one
app.get('/api/health', (req, res) => {
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    server: 'online',
    database: dbConnected ? 'connected' : 'disconnected — fix your Atlas IP whitelist',
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  // Start listening FIRST — server is immediately available
  app.listen(PORT, () => {
    console.log('');
    console.log('🎒 ======================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('🎒 ======================================');
    console.log('');
  });

  // Try connecting to MongoDB AFTER server is up
  // If it fails, server keeps running — only DB routes will error
  try {
    await connectDB();
    dbConnected = true;
    console.log('✅ All systems operational — server + database ready!');
  } catch (error) {
    dbConnected = false;

    console.error('');
  }
};

startServer();

// Export for testing (Jest needs to import the app)
module.exports = app;
