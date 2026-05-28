// =============================================
// src/config/db.js — MongoDB Connection
// =============================================
//
// HOW MONGOOSE CONNECTS UNDER THE HOOD:
// 1. DNS lookup: resolves "cluster0.xxx.mongodb.net" → IP address
// 2. TCP handshake: establishes network connection to port 27017
// 3. TLS/SSL: encrypts the connection (Atlas always uses this)
// 4. Auth: sends username + password using SCRAM-SHA-256 protocol
// 5. Connection pool: creates N ready-to-use connections
//
// CONNECTION POOL EXPLAINED:
// Instead of opening/closing a DB connection per-request
// (imagine reconnecting to WiFi every time you open an app),
// Mongoose maintains a pool of OPEN connections.
// When a request needs the DB, it borrows one from the pool.
// When done, it returns it. Much faster.
// =============================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Fail fast if Atlas is unreachable
      maxPoolSize: 10,                // 10 parallel DB operations max
    });

    // conn.connection.host shows which Atlas cluster we're connected to
    // e.g., "cluster0-shard-00-00.xxxxx.mongodb.net"
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📚 Database: ${conn.connection.name}`);
    
    return conn;
    
  } catch (error) {
    // DECODE COMMON ERRORS:
    // "Authentication failed" → wrong username or password in URI
    // "ECONNREFUSED"         → IP not whitelisted in Atlas Network Access
    // "ETIMEDOUT"            → Network issue or wrong cluster URL
    // "SSL routines"         → Try adding ?ssl=true to your URI
    
    console.error('❌ MongoDB Connection Failed!');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('💡 Troubleshooting checklist:');
    console.error('   1. Is MONGODB_URI set correctly in .env?');
    console.error('   2. Did you replace <password> with your real password?');
    console.error('   3. Is your IP whitelisted? (Atlas → Network Access → Add IP)');
    console.error('   4. Did you add the database name to the URI?');
    console.error('      Format: ...mongodb.net/campus-lost-found?retryWrites=true');
    
    throw error;
  }
};

// =============================================
// CONNECTION LIFECYCLE EVENTS
// =============================================
// MongoDB connection has states: 0=disconnected, 1=connected,
// 2=connecting, 3=disconnecting
// These events fire when the state changes

mongoose.connection.on('connected', () => {
  // Fires after initial connection succeeds
  if (process.env.NODE_ENV !== 'test') {
    console.log('🔗 Mongoose connection state: connected');
  }
});

mongoose.connection.on('disconnected', () => {
  // Fires if Atlas connection drops (network issue, Atlas maintenance)
  // Mongoose automatically retries — we just log it
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  MongoDB disconnected — Mongoose will auto-retry...');
  }
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err.message);
});

// =============================================
// GRACEFUL SHUTDOWN
// =============================================
// When the process is killed (Ctrl+C, server restart),
// close the DB connection properly instead of just cutting it
// This prevents connection leaks and data corruption risks

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed gracefully (SIGINT)');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

module.exports = connectDB;
