// =============================================
// src/models/LostItem.js — Lost Item Schema
// =============================================

const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema(
  {
    // Reference to the User who reported it
    // This is a RELATIONSHIP — like a foreign key in SQL
    // mongoose.Schema.Types.ObjectId → MongoDB's unique ID type
    // ref: 'User' → tells Mongoose which model to "join" with (.populate())
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },

    // Item details
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    // AI-enhanced version of the description
    // Claude/Gemini improves the user's description for better matching
    enhancedDescription: {
      type: String,
      default: null,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'electronics',
        'clothing',
        'accessories',
        'books',
        'keys',
        'wallet',
        'bag',
        'sports',
        'other',
      ],
    },

    // Where the item was last seen
    location: {
      type: String,
      required: [true, 'Last seen location is required'],
      trim: true,
    },

    // Date the item was lost
    dateLost: {
      type: Date,
      required: [true, 'Date lost is required'],
      default: Date.now,
    },

    // Image stored as a file path (local) or URL (cloud)
    image: {
      type: String,
      default: null,
    },

    // Status lifecycle: active → matched → resolved
    status: {
      type: String,
      enum: ['active', 'matched', 'resolved'],
      default: 'active',
    },

    // Contact preferences
    contactEmail: {
      type: String,
      trim: true,
    },

    contactPhone: {
      type: String,
      trim: true,
    },

    // AI matching data — stored for performance
    // So we don't re-call the AI every time
    aiMatchScore: {
      type: Number,
      default: null,
    },

    matchedFoundItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoundItem',
      default: null,
    },

    // Tags for keyword search (AI can generate these)
    tags: [String],

    // Reward offered (optional)
    reward: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================
// INDEXES — Speed up common queries
// =============================================
// Without indexes, MongoDB scans EVERY document
// With indexes, it jumps directly to matches
// ANALOGY: Book index vs reading every page

lostItemSchema.index({ status: 1 });           // Filter by status
lostItemSchema.index({ category: 1 });          // Filter by category
lostItemSchema.index({ reportedBy: 1 });        // Get user's items
lostItemSchema.index({ dateLost: -1 });         // Sort by date (newest first)
lostItemSchema.index({ title: 'text', description: 'text' }); // Full-text search

const LostItem = mongoose.model('LostItem', lostItemSchema);

module.exports = LostItem;
