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
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

app.use('/api/auth', authRoutes);   // /api/auth/register, /api/auth/login
app.use('/api/lost', lostRoutes);   // /api/lost, /api/lost/:id
app.use('/api/found', foundRoutes); // /api/found, /api/found/:id
app.use('/api/ai', aiRoutes);       // /api/ai/match, /api/ai/describe

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

// Connect to MongoDB first, THEN start listening
// We don't want to accept requests before DB is ready
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🎒 ======================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log('🎒 ======================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1); // Exit with failure code
  }
};

startServer();

// Export for testing (Jest needs to import the app)
module.exports = app;
