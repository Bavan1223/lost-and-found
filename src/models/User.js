// =============================================
// src/models/User.js — Student/User Schema
// =============================================
//
// WHAT IS A SCHEMA?
// A schema is a blueprint — it defines what shape your
// data must take before it's saved to the database.
//
// ANALOGY: Think of a schema like a job application form.
// The form ENFORCES what fields exist, what type they are,
// and which ones are required. You can't submit it blank.
//
// WHY MONGOOSE?
// MongoDB itself has NO schema enforcement — you can store
// anything. Mongoose adds validation at the Node.js layer
// before data ever reaches the database.
// =============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Student's full name
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,          // Removes leading/trailing whitespace
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    // Campus email — must be unique (no duplicate accounts)
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,        // MongoDB creates a unique index automatically
      lowercase: true,     // Always store as lowercase
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },

    // Password — NEVER stored as plain text
    // We store the bcrypt HASH (one-way encrypted version)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // CRITICAL: Never include password in query results by default
    },

    // Student ID (optional but useful for verification)
    studentId: {
      type: String,
      trim: true,
    },

    // Which campus building/dorm they're in
    location: {
      type: String,
      trim: true,
    },

    // Profile photo URL
    avatar: {
      type: String,
      default: null,
    },

    // Role-based access control
    role: {
      type: String,
      enum: ['student', 'admin'],  // Only these two values allowed
      default: 'student',
    },

    // How many items they've reported (for leaderboard features)
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields
    // MongoDB handles updating these — you never set them manually
    timestamps: true,
  }
);

// =============================================
// PRE-SAVE MIDDLEWARE (Mongoose Hook)
// =============================================
// This runs BEFORE every .save() call
// If password hasn't changed, skip hashing (optimization)
// If it has changed, hash it before saving

userSchema.pre('save', async function (next) {
  // 'this' refers to the document being saved
  
  // isModified() checks if a field changed since last save
  // We only rehash if the password actually changed
  if (!this.isModified('password')) return next();

  // BCRYPT HASHING EXPLAINED:
  // bcrypt is a one-way function — you can't reverse it
  // Salt rounds (12) = 2^12 = 4096 iterations of hashing
  // More rounds = slower to crack (but also slower to run)
  // 12 is the production standard — balance of speed vs security
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  
  next(); // Continue to the save operation
});

// =============================================
// INSTANCE METHOD — comparePassword
// =============================================
// Adds a custom method to every User document
// Usage: const isMatch = await user.comparePassword(inputPassword)

userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare() hashes the candidate and compares
  // Returns true/false
  // 'this.password' needs select: false to be available here
  return await bcrypt.compare(candidatePassword, this.password);
};

// =============================================
// TRANSFORM — Remove sensitive fields from JSON output
// =============================================
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;    // Never expose password hash
    delete ret.__v;         // MongoDB internal version field
    return ret;
  },
});

// mongoose.model('User', userSchema) creates:
// 1. A 'users' collection in MongoDB (pluralized, lowercased)
// 2. A Model class with .find(), .save(), .findById() etc.
const User = mongoose.model('User', userSchema);

module.exports = User;
