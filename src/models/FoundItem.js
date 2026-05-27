// =============================================
// src/models/FoundItem.js — Found Item Schema
// =============================================

const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },

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

    // Where the item was FOUND (not lost)
    locationFound: {
      type: String,
      required: [true, 'Location found is required'],
      trim: true,
    },

    // Where the item is NOW being kept
    currentLocation: {
      type: String,
      trim: true,
      default: 'With reporter — contact for pickup',
    },

    dateFound: {
      type: Date,
      required: [true, 'Date found is required'],
      default: Date.now,
    },

    image: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ['available', 'matched', 'claimed'],
      default: 'available',
    },

    contactEmail: {
      type: String,
      trim: true,
    },

    contactPhone: {
      type: String,
      trim: true,
    },

    // Which lost item this was matched to (if any)
    matchedLostItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LostItem',
      default: null,
    },

    aiMatchScore: {
      type: Number,
      default: null,
    },

    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
foundItemSchema.index({ status: 1 });
foundItemSchema.index({ category: 1 });
foundItemSchema.index({ reportedBy: 1 });
foundItemSchema.index({ dateFound: -1 });
foundItemSchema.index({ title: 'text', description: 'text' });

const FoundItem = mongoose.model('FoundItem', foundItemSchema);

module.exports = FoundItem;
