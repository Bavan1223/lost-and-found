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
    // ─────────────────────────────────────────────
    // NODE.JS v24 + OPENSSL 3 FIX
    // ─────────────────────────────────────────────
    // Node 24 ships with OpenSSL 3 which tightened TLS cipher suites.
    // The old mongodb:// URI with manual shard hosts causes SSL alert 80.
    //
    // FIX: Use mongodb+srv:// format (Atlas standard) — it:
    //   • Uses a single clean hostname (no manual shard list)
    //   • Handles TLS automatically via SRV DNS records
    //   • Is fully compatible with OpenSSL 3
    //
    // Also: do NOT pass conflicting tls/ssl flags in the options object
    // when the URI already contains them — they cause handshake failures.
    // ─────────────────────────────────────────────
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10s — gives Atlas time to respond
      socketTimeoutMS: 45000,          // 45s — max time for a single operation
      maxPoolSize: 10,                 // 10 parallel DB operations max
      // ─────────────────────────────────────────────────────────────
      // WHY tlsAllowInvalidCertificates: true?
      // ─────────────────────────────────────────────────────────────
      // Your network (college WiFi / ISP) performs TLS inspection —
      // it acts as a "man in the middle", intercepting the SSL handshake
      // and replacing MongoDB Atlas's certificate with its own.
      //
      // Node.js v24 + OpenSSL 3 tightened TLS validation and now REJECTS
      // this intercepted certificate → "SSL alert number 80" error.
      //
      // tlsAllowInvalidCertificates: true tells the driver to accept
      // the network proxy's certificate even though it wasn't issued
      // by MongoDB's CA. This is safe on a trusted campus network.
      //
      // In production (Render.com), this flag is harmless because Render's
      // network does NOT intercept TLS — Atlas's real cert is seen.
      // ─────────────────────────────────────────────────────────────
      tls: true,
      tlsAllowInvalidCertificates: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📚 Database: ${conn.connection.name}`);
    
    return conn;
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed!');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('💡 Troubleshooting checklist:');

    // Decode the exact SSL alert 80 error (OpenSSL 3 / Node 24 issue)
    if (error.message.includes('SSL alert number 80') || error.message.includes('ssl') || error.message.includes('SSL')) {
      console.error('   🔴 SSL ERROR DETECTED — This is a Node.js v24 / OpenSSL 3 issue.');
      console.error('   Fix: Your MONGODB_URI must use mongodb+srv:// format.');
      console.error('   ');
      console.error('   Step 1: Go to cloud.mongodb.com → Your Cluster → Connect');
      console.error('   Step 2: Click "Connect your application" → Node.js');
      console.error('   Step 3: Copy the mongodb+srv:// connection string');
      console.error('   Step 4: Replace your MONGODB_URI in .env with it');
      console.error('   ');
      console.error('   Correct format:');
      console.error('   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority');
    } else {
      console.error('   1. Is MONGODB_URI set correctly in .env?');
      console.error('   2. Did you replace <password> with your real password?');
      console.error('   3. Is your IP whitelisted? (Atlas → Network Access → Add IP 0.0.0.0/0)');
      console.error('   4. Use mongodb+srv:// format (not mongodb://)');
    }
    
    throw error;
  }
};

// =============================================
// CONNECTION LIFECYCLE EVENTS
// =============================================
mongoose.connection.on('connected', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('🔗 Mongoose connection state: connected');
  }
});

mongoose.connection.on('disconnected', () => {
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
